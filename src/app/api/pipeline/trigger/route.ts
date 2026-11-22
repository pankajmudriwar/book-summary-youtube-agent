import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";
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

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();

  try {
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
      `Manual pipeline triggered for: ${book.book_title}`
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
          coverUrl ? `Cover fetched: ${coverUrl}` : "No cover found"
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

    // Stage 4: Dispatch GitHub Actions
    try {
      await triggerVideoWorker(book.id);
      await logPipeline(
        supabase,
        book.id,
        "dispatch",
        "completed",
        "GitHub Actions workflow dispatched"
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
      message: "Pipeline triggered successfully",
      book_id: book.id,
      book_title: book.book_title,
    });
  } catch (err) {
    console.error("Pipeline trigger error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
