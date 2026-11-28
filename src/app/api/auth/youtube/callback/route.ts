import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const baseUrl = requestOrigin || process.env.NEXT_PUBLIC_APP_URL;

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

  // Retrieve client credentials and redirect_uri from process.env or fallback cookie
  let clientId = (process.env.YOUTUBE_CLIENT_ID || "").trim();
  let clientSecret = (process.env.YOUTUBE_CLIENT_SECRET || "").trim();
  let savedRedirectUri = "";

  // Try reading from yt_oauth_ctx cookie if missing from env
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/yt_oauth_ctx=([^;]+)/);
  if (match && match[1]) {
    try {
      const decoded = Buffer.from(decodeURIComponent(match[1]), "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (!clientId && parsed.clientId) clientId = parsed.clientId;
      if (!clientSecret && parsed.clientSecret) clientSecret = parsed.clientSecret;
      if (parsed.redirectUri) savedRedirectUri = parsed.redirectUri;
    } catch (e) {
      console.warn("Could not parse yt_oauth_ctx cookie:", e);
    }
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=error&message=missing_client_credentials`
    );
  }

  const effectiveRedirectUri = savedRedirectUri || `${baseUrl}/api/auth/youtube/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirectUri,
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
    let channelName = "YouTube Channel";
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
    const updatePayload: Record<string, any> = {
      youtube_channel_name: channelName,
      updated_at: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      updatePayload.youtube_refresh_token = tokens.refresh_token;
    }

    const { error: dbError } = await supabase
      .from("agent_settings")
      .update(updatePayload)
      .eq("id", 1);

    if (dbError) {
      console.error("Failed to save YouTube tokens:", dbError);
      return NextResponse.redirect(
        `${baseUrl}/settings?youtube=error&message=db_save_failed`
      );
    }

    const redirectResponse = NextResponse.redirect(
      `${baseUrl}/settings?youtube=connected`
    );

    // Clear the temporary auth cookie
    redirectResponse.cookies.set("yt_oauth_ctx", "", {
      maxAge: 0,
      path: "/",
    });

    return redirectResponse;
  } catch (err) {
    console.error("YouTube callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/settings?youtube=error&message=unexpected_error`
    );
  }
}
