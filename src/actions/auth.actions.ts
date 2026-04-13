'use server';

import { cookies }           from 'next/headers';
import { redirect }          from 'next/navigation';
import { getRequestContext } from '@cloudflare/next-on-pages';

const COOKIE_NAME   = 'admin_session';
const SESSION_LABEL = 'admin-session-v1';

function getAdminPassword(): string | undefined {
  // প্রথমে Cloudflare runtime try করো
  try {
    const { env } = getRequestContext();
    const cfPassword = (env as Record<string, string>).ADMIN_PASSWORD;
    if (cfPassword) return cfPassword;
  } catch {
    // Cloudflare runtime নেই (local next dev)
  }
  // local dev fallback
  return process.env.ADMIN_PASSWORD;
}

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

export async function login(password: string): Promise<{ error?: string }> {
  try {
    const adminPassword = getAdminPassword();

    if (!adminPassword) {
      console.error('[auth] ADMIN_PASSWORD not set.');
      return { error: 'Server misconfiguration. ADMIN_PASSWORD is not set.' };
    }

    if (password !== adminPassword) {
      return { error: 'Incorrect password.' };
    }

    const token       = await deriveSessionToken(adminPassword);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'lax',
      path     : '/',
      maxAge   : 60 * 60 * 24 * 7,
    });

    return {};
  } catch (err) {
    console.error('[auth] login error:', err);
    return { error: `Unexpected error: ${String(err)}` };
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

  const expectedToken = await deriveSessionToken(adminPassword!);

  // timing-safe compare
  const enc  = new TextEncoder();
  const a    = enc.encode(session);
  const b    = enc.encode(expectedToken);
  if (a.length !== b.length) redirect('/login');
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) redirect('/login');
}