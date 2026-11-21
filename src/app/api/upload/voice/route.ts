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

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Generate unique filename
    const ext = file.name.split(".").pop() || "wav";
    const fileName = `voice-samples/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("agent-media")
      .upload(fileName, buffer, {
        contentType: file.type || "audio/wav",
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

    // Update agent settings
    const { error: dbError } = await supabase
      .from("agent_settings")
      .update({
        voice_sample_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (dbError) {
      return NextResponse.json(
        { error: `Settings update failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Voice sample uploaded",
      url: publicUrl,
    });
  } catch (err) {
    console.error("Voice upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
