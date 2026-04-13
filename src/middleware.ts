// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME   = 'admin_session';
const SESSION_LABEL = 'admin-session-v1';

async function deriveSessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(SESSION_LABEL));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public routes — never require auth ────────────────────────────────────
  // /admin/login is intentionally excluded from protection so unauthenticated
  // users can reach the login form without being redirected in a loop.
  if (
    pathname === '/'                         ||
    pathname.startsWith('/blog')             ||
    pathname.startsWith('/admin/login')      ||
    pathname.startsWith('/_next')            ||
    pathname.startsWith('/favicon')          ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // ── Protected: all /admin/* routes (except /admin/login above) ───────────
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!adminPassword || !sessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const expectedToken = await deriveSessionToken(adminPassword);

  if (sessionCookie !== expectedToken) {
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware only on admin routes; static assets bypass it automatically.
  matcher: ['/admin/:path*'],
};