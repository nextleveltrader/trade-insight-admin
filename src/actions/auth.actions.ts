'use server';

import { cookies }            from 'next/headers';
import { redirect }           from 'next/navigation';
import { getRequestContext }  from '@cloudflare/next-on-pages';

const COOKIE_NAME   = 'admin_session';
const SESSION_LABEL = 'admin-session-v1';

// ─── Env helper ───────────────────────────────────────────────────────────────

function getAdminPassword(): string | undefined {
  try {
    const { env } = getRequestContext();
    return (env as Record<string, string>).ADMIN_PASSWORD;
  } catch {
    // Local `next dev` fallback — getRequestContext() throws outside CF runtime
    return process.env.ADMIN_PASSWORD;
  }
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

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

async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc  = new TextEncoder();
  const keyA = await crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const keyB = await crypto.subtle.importKey('raw', enc.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', keyA, nonce),
    crypto.subtle.sign('HMAC', keyB, nonce),
  ]);
  const ua = new Uint8Array(sigA);
  const ub = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

export async function login(password: string): Promise<{ error?: string }> {
  try {
    const adminPassword = getAdminPassword();

    if (!adminPassword) {
      console.error('[auth] ADMIN_PASSWORD is not set in environment.');
      return { error: 'Server misconfiguration. Contact administrator.' };
    }

    const match = await safeCompare(password, adminPassword);
    if (!match) return { error: 'Incorrect password.' };

    const token       = await deriveSessionToken(adminPassword);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'lax',
      path     : '/',
      maxAge   : 60 * 60 * 24 * 7, // 7 days
    });

    return {};
  } catch (err) {
    console.error('[auth] login error:', err);
    return { error: 'An unexpected error occurred.' };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}

export async function checkAuth(): Promise<void> {
  const adminPassword = getAdminPassword();
  const cookieStore   = await cookies();
  const session       = cookieStore.get(COOKIE_NAME)?.value;

  if (!adminPassword || !session) redirect('/login');

  const expectedToken = await deriveSessionToken(adminPassword);
  const valid         = await safeCompare(session, expectedToken);

  if (!valid) redirect('/login');
}