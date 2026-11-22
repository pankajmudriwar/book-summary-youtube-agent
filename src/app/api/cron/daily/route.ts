import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { fetchBookCover, researchBookContent } from "@/lib/bookResearch";
import { generateScript } from "@/lib/scriptGenerator";
import { triggerVideoWorker } from "@/lib/github";

async function logPipeline(
  supabase: ReturnType<typeof getServerSupabase>,
  bookId: string,
  stage: string,
  status: string,
  message: string
) {
  const level = ['error', 'warning'].includes(status) ? status : 'info';
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
      return NextResponse.json({ message: "Daily automation is disabled" });
    }

    // Check for active processing jobs (updated within last 2 hours)
    const twoHoursAgo = new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString();
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
        message: "Active processing job in progress",
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
      .update({ status: "researching", updated_at: new Date().toISOString() })
      .eq("id", book.id);

    await logPipeline(
      supabase,
      book.id,
      "research",
      "started",
      `Starting pipeline for: ${book.book_title}`
    );

    // Stage 1: Fetch book cover
    try {
      if (!book.cover_image_url) {
        const coverUrl = await fetchBookCover(book.book_title, book.author);
        if (coverUrl) {
          await supabase
            .from("books_queue")
            .update({ cover_image_url: coverUrl })
            .eq("id", book.id);
        }
        await logPipeline(
          supabase,
          book.id,
          "cover_fetch",
          "completed",
          coverUrl ? `Cover fetched: ${coverUrl}` : "No cover found, using default"
        );
      }
    } catch (coverErr) {
      await logPipeline(
        supabase,
        book.id,
        "cover_fetch",
        "warning",
        `Cover fetch failed (non-fatal): ${coverErr instanceof Error ? coverErr.message : String(coverErr)}`
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
        `Research completed (${researchContent.length} chars)`
      );
    } catch (researchErr) {
      await supabase
        .from("books_queue")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", book.id);
      await logPipeline(
        supabase,
        book.id,
        "research",
        "failed",
        `Research failed: ${researchErr instanceof Error ? researchErr.message : String(researchErr)}`
      );
      return NextResponse.json(
        { error: "Research stage failed" },
        { status: 500 }
      );
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
      await supabase
        .from("books_queue")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", book.id);
      await logPipeline(
        supabase,
        book.id,
        "script",
        "failed",
        `Script generation failed: ${scriptErr instanceof Error ? scriptErr.message : String(scriptErr)}`
      );
      return NextResponse.json(
        { error: "Script generation failed" },
        { status: 500 }
      );
    }

    // Stage 4: Dispatch GitHub Actions workflow
    try {
      await triggerVideoWorker(book.id);
      await logPipeline(
        supabase,
        book.id,
        "dispatch",
        "completed",
        "GitHub Actions workflow dispatched for video generation"
      );
    } catch (dispatchErr) {
      await logPipeline(
        supabase,
        book.id,
        "dispatch",
        "failed",
        `Dispatch failed: ${dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr)}`
      );
      return NextResponse.json(
        { error: "GitHub Actions dispatch failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Pipeline started successfully",
      book_id: book.id,
      book_title: book.book_title,
    });
  } catch (err) {
    console.error("Cron daily error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
