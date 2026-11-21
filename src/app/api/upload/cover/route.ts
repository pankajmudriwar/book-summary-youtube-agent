import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bookId = formData.get("book_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    if (!bookId) {
      return NextResponse.json(
        { error: "book_id is required" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `covers/${bookId}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("agent-media")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("agent-media")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update book record
    const { error: dbError } = await supabase
      .from("books_queue")
      .update({
        cover_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId);

    if (dbError) {
      return NextResponse.json(
        { error: `Book update failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Cover image uploaded",
      url: publicUrl,
    });
  } catch (err) {
    console.error("Cover upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
