import { NextRequest, NextResponse } from 'next/server';

// ─── Config ───────────────────────────────────────────────────────────────────

const COOKIE_NAME   = 'admin_session';
const SESSION_LABEL = 'admin-session-v1'; // must match auth.actions.ts

// ─── Token derivation (duplicated here — middleware cannot import server actions) ──

async function deriveSessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(SESSION_LABEL));

  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Fast-path: let the login page and public assets through immediately ──
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  // Redirect immediately if either value is missing
  if (!adminPassword || !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the cookie value matches the expected derived token
  const expectedToken = await deriveSessionToken(adminPassword);
  if (sessionCookie !== expectedToken) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the invalid cookie while we're here
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

// Only run on the routes you want to protect
export const config = {
  matcher: [
    '/assets/:path*',
    '/posts/:path*',
    // Add any other admin paths here, e.g. '/api/engine/:path*'
  ],
};