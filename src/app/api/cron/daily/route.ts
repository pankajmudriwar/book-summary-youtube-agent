import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { fetchBookCover, researchBookContent } from "@/lib/bookResearch";
import { generateScript } from "@/lib/scriptGenerator";
import { triggerVideoWorker } from "@/lib/github";
import { checkSystemReadiness } from "@/lib/readiness";

export const maxDuration = 60;

async function logPipeline(
  supabase: ReturnType<typeof getServerSupabase>,
  bookId: string,
  stage: string,
  status: string,
  message: string
) {
  const level = ["error", "warning"].includes(status) ? status : "info";
  await supabase.from("pipeline_logs").insert({
    book_id: bookId,
    stage,
    level,
    status,
    message,
  });
}

export async function GET(request: Request) {
  // Verify cron secret
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();

  try {
    // Check if daily automation is enabled
    const { data: settings } = await supabase
      .from("agent_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!settings?.is_daily_automation_enabled) {
      return NextResponse.json({ message: "Daily automation is disabled in settings" });
    }

    // Run system readiness check
    const readiness = checkSystemReadiness(settings);
    if (!readiness.isReady) {
      return NextResponse.json(
        {
          error: "Daily cron stopped: system readiness check failed",
          missing: readiness.missing,
        },
        { status: 400 }
      );
    }

    // Check for active processing jobs (updated within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: activeJobs } = await supabase
      .from("books_queue")
      .select("id")
      .in("status", [
        "researching",
        "scripted",
        "voicing",
        "rendering",
        "uploading",
      ])
      .gte("updated_at", twoHoursAgo);

    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json({
        message: "Active processing job in progress, skipping daily trigger",
        active_jobs: activeJobs.length,
      });
    }

    // Pick oldest pending book
    const { data: book, error: bookError } = await supabase
      .from("books_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ message: "No pending books in queue" });
    }

    // Lock book to researching
    await supabase
      .from("books_queue")
      .update({
        status: "researching",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", book.id);

    await logPipeline(
      supabase,
      book.id,
      "research",
      "started",
      `Daily cron triggered for: "${book.book_title}"`
    );

    // Stage 1: Fetch book cover
    try {
      if (!book.cover_image_url) {
        const coverUrl = await fetchBookCover(book.book_title, book.author);
        if (coverUrl) {
          await supabase
            .from("books_queue")
            .update({ cover_image_url: coverUrl, updated_at: new Date().toISOString() })
            .eq("id", book.id);
        }
        await logPipeline(
          supabase,
          book.id,
          "cover_fetch",
          "completed",
          coverUrl ? `Cover fetched: ${coverUrl}` : "Cover generated"
        );
      }
    } catch (coverErr) {
      await logPipeline(
        supabase,
        book.id,
        "cover_fetch",
        "warning",
        `Cover fetch notice: ${coverErr instanceof Error ? coverErr.message : String(coverErr)}`
      );
    }

    // Stage 2: Content research
    let researchContent: string;
    try {
      researchContent = await researchBookContent(
        book.book_title,
        book.author,
        book.source_text
      );
      await logPipeline(
        supabase,
        book.id,
        "research",
        "completed",
        `Research completed (${researchContent.length} chars analyzed)`
      );
    } catch (researchErr) {
      const errorMsg = researchErr instanceof Error ? researchErr.message : String(researchErr);
      await supabase
        .from("books_queue")
        .update({
          status: "failed",
          error_message: `Research error: ${errorMsg}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", book.id);
      await logPipeline(supabase, book.id, "research", "failed", `Research failed: ${errorMsg}`);
      return NextResponse.json({ error: "Research stage failed" }, { status: 500 });
    }

    // Stage 3: Script generation
    try {
      const scriptResult = await generateScript(
        book.book_title,
        book.author || "Unknown",
        researchContent
      );

      await supabase
        .from("books_queue")
        .update({
          status: "scripted",
          script_marathi: scriptResult.script_marathi,
          youtube_title: scriptResult.youtube_title,
          youtube_description: scriptResult.youtube_description,
          youtube_tags: scriptResult.youtube_tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", book.id);

      await logPipeline(
        supabase,
        book.id,
        "script",
        "completed",
        `Script generated: "${scriptResult.youtube_title}"`
      );
    } catch (scriptErr) {
      const errorMsg = scriptErr instanceof Error ? scriptErr.message : String(scriptErr);
      await supabase
        .from("books_queue")
        .update({
          status: "failed",
          error_message: `Script error: ${errorMsg}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", book.id);
      await logPipeline(supabase, book.id, "script", "failed", `Script generation failed: ${errorMsg}`);
      return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
    }

    // Stage 4: Dispatch GitHub Actions worker
    const dispatchResult = await triggerVideoWorker(book.id);
    if (!dispatchResult.success) {
      const errorMsg = dispatchResult.error || "GitHub Actions dispatch failed";
      await supabase
        .from("books_queue")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", book.id);

      await logPipeline(
        supabase,
        book.id,
        "dispatch",
        "error",
        `GitHub Actions dispatch failed: ${errorMsg}`
      );

      return NextResponse.json(
        { error: errorMsg, actionsUrl: dispatchResult.actionsUrl },
        { status: 502 }
      );
    }

    await supabase
      .from("books_queue")
      .update({
        status: "voicing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", book.id);

    await logPipeline(
      supabase,
      book.id,
      "dispatch",
      "completed",
      `Worker dispatched: ${dispatchResult.actionsUrl}`
    );

    return NextResponse.json({
      message: "Daily pipeline triggered successfully",
      book_id: book.id,
      book_title: book.book_title,
      actionsUrl: dispatchResult.actionsUrl,
    });
  } catch (err) {
    console.error("Cron daily error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
