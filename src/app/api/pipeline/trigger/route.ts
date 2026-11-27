import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";
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

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();

  try {
    // 1. Fetch settings & run pre-flight checks
    const { data: settings } = await supabase
      .from("agent_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const readiness = checkSystemReadiness(settings);
    if (!readiness.isReady) {
      return NextResponse.json(
        {
          error: "Pre-flight readiness checks failed",
          missing: readiness.missing,
        },
        { status: 400 }
      );
    }

    // 2. Select book to process
    let bookId: string | undefined;
    try {
      const body = await request.json();
      bookId = body.book_id;
    } catch {
      // Empty body is fine — will pick oldest pending
    }

    let book;

    if (bookId) {
      const { data, error } = await supabase
        .from("books_queue")
        .select("*")
        .eq("id", bookId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
      book = data;
    } else {
      const { data, error } = await supabase
        .from("books_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "No pending books in queue" },
          { status: 404 }
        );
      }
      book = data;
    }

    // 3. Lock book to researching
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
      `Pipeline triggered for: "${book.book_title}"`
    );

    // 4. Stage 1: Fetch book cover if missing
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
          coverUrl ? `Cover fetched: ${coverUrl}` : "Typographic cover generated"
        );
      }
    } catch (coverErr) {
      await logPipeline(
        supabase,
        book.id,
        "cover_fetch",
        "warning",
        `Cover fetch non-fatal notice: ${coverErr instanceof Error ? coverErr.message : String(coverErr)}`
      );
    }

    // 5. Stage 2: Content research
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
      return NextResponse.json(
        { error: `Research stage failed: ${errorMsg}` },
        { status: 500 }
      );
    }

    // 6. Stage 3: Script generation
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
        `Marathi script generated: "${scriptResult.youtube_title}"`
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
      return NextResponse.json(
        { error: `Script generation failed: ${errorMsg}` },
        { status: 500 }
      );
    }

    // 7. Stage 4: Dispatch GitHub Actions worker
    const dispatchResult = await triggerVideoWorker(book.id);
    if (!dispatchResult.success) {
      const errorMsg = dispatchResult.error || "GitHub Actions workflow dispatch rejected";
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
        `GitHub Actions dispatch failed (HTTP ${dispatchResult.statusCode || "unknown"}): ${errorMsg}`
      );

      return NextResponse.json(
        {
          error: errorMsg,
          actionsUrl: dispatchResult.actionsUrl,
        },
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
      `Worker dispatched successfully. Track in GitHub Actions: ${dispatchResult.actionsUrl}`
    );

    return NextResponse.json({
      message: "Pipeline triggered successfully",
      book_id: book.id,
      book_title: book.book_title,
      actionsUrl: dispatchResult.actionsUrl,
    });
  } catch (err) {
    console.error("Pipeline trigger error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
