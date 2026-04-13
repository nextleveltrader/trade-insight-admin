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

function getAdminPassword(request: NextRequest): string | undefined {
  // Cloudflare Pages middleware-এ env bindings এভাবে পাওয়া যায়
  try {
    const { env } = getRequestContext();
    return (env as Record<string, string>).ADMIN_PASSWORD;
  } catch {
    return process.env.ADMIN_PASSWORD;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const adminPassword = getAdminPassword(request);
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
  ],
};