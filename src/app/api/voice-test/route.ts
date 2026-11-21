import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();

  try {
    // Get current settings for voice config
    const { data: settings, error: settingsErr } = await supabase
      .from("agent_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsErr || !settings) {
      return NextResponse.json(
        { error: "Failed to load settings" },
        { status: 500 }
      );
    }

    const voiceEndpoint = settings.voice_clone_api_url;
    if (!voiceEndpoint) {
      return NextResponse.json(
        { error: "Voice cloning endpoint not configured in settings" },
        { status: 400 }
      );
    }

    // Marathi test sentence
    const testText =
      "नमस्कार मित्रांनो, आज आपण एका अप्रतिम पुस्तकाबद्दल जाणून घेणार आहोत.";

    let body: Record<string, unknown>;

    try {
      const reqBody = await request.json();
      body = {
        text: reqBody.text || testText,
        voice_sample_url: settings.voice_sample_url,
      };
    } catch {
      body = {
        text: testText,
        voice_sample_url: settings.voice_sample_url,
      };
    }

    const voiceResponse = await fetch(voiceEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!voiceResponse.ok) {
      const errText = await voiceResponse.text();
      return NextResponse.json(
        {
          error: "Voice cloning API error",
          status: voiceResponse.status,
          details: errText,
        },
        { status: 502 }
      );
    }

    // Return the audio binary
    const audioBuffer = await voiceResponse.arrayBuffer();
    const contentType =
      voiceResponse.headers.get("content-type") || "audio/mpeg";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'inline; filename="voice-test.mp3"',
      },
    });
  } catch (err) {
    console.error("Voice test error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
