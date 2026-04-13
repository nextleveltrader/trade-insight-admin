'use server';

import { cookies } from 'next/headers';
import { redirect }  from 'next/navigation';

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME   = 'admin_session';
const SESSION_LABEL = 'admin-session-v1'; // bump this string to invalidate all sessions

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a deterministic, unforgeable token by HMAC-SHA-256 signing a fixed
 * label with the admin password as the key.  Uses the Web Crypto API so it
 * works on both Cloudflare Edge Runtime and Node.js.
 */
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

/**
 * Timing-safe byte comparison via Web Crypto — prevents timing-attack leaks
 * when comparing the cookie value to the expected token.
 */
async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc  = new TextEncoder();
  const keyA = await crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const keyB = await crypto.subtle.importKey('raw', enc.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', keyA, nonce),
    crypto.subtle.sign('HMAC', keyB, nonce),
  ]);
  // If a === b, sigA and sigB will be identical byte-for-byte
  const ua = new Uint8Array(sigA);
  const ub = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export async function login(password: string): Promise<{ error?: string }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[auth] ADMIN_PASSWORD environment variable is not set.');
    return { error: 'Server misconfiguration. Contact the administrator.' };
  }

  const match = await safeCompare(password, adminPassword);
  if (!match) {
    return { error: 'Incorrect password.' };
  }

  const token       = await deriveSessionToken(adminPassword);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly : true,
    secure   : true,          // HTTPS only — Cloudflare always serves over HTTPS
    sameSite : 'lax',
    path     : '/',
    maxAge   : 60 * 60 * 24 * 7, // 7 days
  });

  return {};
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}

/**
 * Call this at the top of any Server Component or Server Action that must be
 * admin-only.  Redirects to /login if the session is absent or invalid.
 *
 * @example
 *   // src/app/assets/page.tsx
 *   import { checkAuth } from '@/actions/auth.actions';
 *   export default async function AssetsPage() {
 *     await checkAuth();
 *     ...
 *   }
 */
export async function checkAuth(): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookieStore   = await cookies();
  const session       = cookieStore.get(COOKIE_NAME)?.value;

  if (!adminPassword || !session) {
    redirect('/login');
  }

  const expectedToken = await deriveSessionToken(adminPassword);
  const valid         = await safeCompare(session, expectedToken);

  if (!valid) {
    redirect('/login');
  }
}