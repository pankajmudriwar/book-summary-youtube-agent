import { NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Verify that the incoming request carries a valid admin credential.
 * Checks (in order):
 *  1. `Authorization: Bearer <password>` header
 *  2. `admin_session` cookie whose value matches ADMIN_PASSWORD
 *
 * Returns `true` when the caller is authenticated, `false` otherwise.
 */
export function verifyAdmin(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD env var is not set');
  }

  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === adminPassword) return true;
  }

  // 2. Check session cookie
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = parseCookies(cookieHeader);
  if (cookies[COOKIE_NAME] === adminPassword) return true;

  return false;
}

/**
 * Build a `Set-Cookie` header value that persists the admin session.
 */
export function createAuthCookie(password: string): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(password)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];

  // Use Secure flag when running over HTTPS
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Convenience: return a 401 JSON response for use in API route handlers.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const [rawKey, ...rest] = pair.split('=');
    const key = rawKey?.trim();
    if (!key) continue;
    result[key] = decodeURIComponent(rest.join('=').trim());
  }
  return result;
}
