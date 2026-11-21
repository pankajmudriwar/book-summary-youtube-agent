import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titles } = body;

    if (!Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json(
        { error: "titles must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    const books = titles
      .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
      .filter((t: string) => t.length > 0)
      .map((book_title: string) => ({
        book_title,
        status: "pending" as const,
      }));

    if (books.length === 0) {
      return NextResponse.json(
        { error: "No valid titles provided" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("books_queue")
      .insert(books)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: `${data.length} books added to queue`, books: data },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
