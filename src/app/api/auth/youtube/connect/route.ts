import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryClientId = searchParams.get("client_id");
  const queryClientSecret = searchParams.get("client_secret");

  const clientId = (queryClientId || process.env.YOUTUBE_CLIENT_ID || "").trim();
  const clientSecret = (queryClientSecret || process.env.YOUTUBE_CLIENT_SECRET || "").trim();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "YouTube Client ID not provided. Enter your Client ID in Settings or configure YOUTUBE_CLIENT_ID.",
      },
      { status: 400 }
    );
  }

  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);

  // Store client_id and client_secret in temporary secure cookie for callback token exchange
  if (clientId && clientSecret) {
    const payload = JSON.stringify({ clientId, clientSecret });
    response.cookies.set("yt_oauth_ctx", Buffer.from(payload).toString("base64"), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 900, // 15 minutes
      path: "/",
    });
  }

  return response;
}
