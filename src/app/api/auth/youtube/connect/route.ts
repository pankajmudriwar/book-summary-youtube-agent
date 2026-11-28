import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryClientId = searchParams.get("client_id");
  const queryClientSecret = searchParams.get("client_secret");
  const queryRedirectUri = searchParams.get("redirect_uri");

  const clientId = (queryClientId || process.env.YOUTUBE_CLIENT_ID || "").trim();
  const clientSecret = (queryClientSecret || process.env.YOUTUBE_CLIENT_SECRET || "").trim();
  
  // Prefer queryRedirectUri -> request host origin -> NEXT_PUBLIC_APP_URL
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const baseUrl = requestOrigin || process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = (queryRedirectUri || `${baseUrl}/api/auth/youtube/callback`).trim();

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

  // Store client_id, client_secret, and redirect_uri in temporary secure cookie for callback token exchange
  if (clientId) {
    const payload = JSON.stringify({ clientId, clientSecret, redirectUri });
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
