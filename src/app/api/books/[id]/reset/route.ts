import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getServerSupabase();

  const { data: book, error: fetchError } = await supabase
    .from("books_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("books_queue")
    .update({
      status: "pending",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("pipeline_logs").insert({
    book_id: id,
    stage: "cron",
    level: "info",
    status: "reset",
    message: `Job manually reset to pending state`,
  });

  return NextResponse.json({
    message: `Book "${book.book_title}" reset to pending`,
    book: data,
  });
}
