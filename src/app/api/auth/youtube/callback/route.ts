import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=error&message=no_code`
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/youtube/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${baseUrl}/settings?youtube=error&message=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Fetch channel info
    let channelName = "Unknown Channel";
    try {
      const channelResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        if (channelData.items?.[0]?.snippet?.title) {
          channelName = channelData.items[0].snippet.title;
        }
      }
    } catch (channelErr) {
      console.error("Channel fetch failed (non-fatal):", channelErr);
    }

    // Save tokens to agent_settings
    const supabase = getServerSupabase();
    const { error: dbError } = await supabase
      .from("agent_settings")
      .update({
        youtube_refresh_token: tokens.refresh_token,
        youtube_channel_name: channelName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (dbError) {
      console.error("Failed to save YouTube tokens:", dbError);
      return NextResponse.redirect(
        `${baseUrl}/settings?youtube=error&message=db_save_failed`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=connected`
    );
  } catch (err) {
    console.error("YouTube callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=error&message=unexpected_error`
    );
  }
}
