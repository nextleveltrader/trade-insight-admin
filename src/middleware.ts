import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext }         from '@cloudflare/next-on-pages';


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

function getPassword(): string | undefined {
  // Cloudflare runtime-এ secret পাওয়ার চেষ্টা
  try {
    const { env } = getRequestContext();
    const pw = (env as Record<string, string>).ADMIN_PASSWORD;
    if (pw) return pw;
  } catch {
    // local dev-এ getRequestContext() throw করে
  }
  // local .env.local fallback
  return process.env.ADMIN_PASSWORD;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // এই paths-গুলো protect করবে না
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/blog')
  ) {
    return NextResponse.next();
  }

  const adminPassword = getPassword();
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!adminPassword || !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const expectedToken = await deriveSessionToken(adminPassword);

  if (sessionCookie !== expectedToken) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/assets/:path*',
    '/posts/:path*',
    '/((?!login|_next|favicon|blog).*)',
  ],
};