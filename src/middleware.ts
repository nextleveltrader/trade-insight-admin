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

  // নিচের লিস্টে থাকা পাথগুলোতে পাসওয়ার্ড লাগবে না
  if (
    pathname === '/' ||                // হোমপেজকে মুক্ত করা হলো
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/api')        // API রুটগুলোকেও সাধারণত বাইরে রাখা হয়
  ) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
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
    // শুধুমাত্র এই এরিয়াগুলোতে পাসওয়ার্ড কাজ করবে
    '/assets/:path*',
    '/posts/:path*',
    '/admin/:path*',
  ],
};