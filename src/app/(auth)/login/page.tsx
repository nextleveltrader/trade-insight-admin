'use client';
// src/app/(auth)/login/page.tsx
//
// Trade Insight Daily — Login Page (Phase 2: Wired)
// ─────────────────────────────────────────────────────────────────────────────
// Credentials flow:
//   signIn("credentials", { email, password, redirect: false })
//   → on success: router.push("/dashboard")
//   → on error:   display inline error message
//
// Google flow:
//   signIn("google", { callbackUrl: "/dashboard" })
//   → Auth.js handles the OAuth handshake; no redirect:false needed.
//
// Auth.js error codes are mapped to human-readable messages via AUTH_ERRORS.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Suspense }     from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn }       from 'next-auth/react';
import Link             from 'next/link';
import {
  Mail, Lock, Eye, EyeOff,
  ArrowRight, AlertCircle, Loader2,
} from 'lucide-react';

// ─── Auth error → human message map ─────────────────────────────────────────
//
// Auth.js v5 passes ?error=<ErrorCode> in the URL when it redirects to
// pages.signIn on failure. We read it via useSearchParams to pre-populate
// the error banner (e.g. after a failed OAuth attempt redirected back here).

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin:   'Invalid email or password. Please try again.',
  OAuthAccountNotLinked:
    'This email is already registered with a different sign-in method. Please use your original method.',
  OAuthSignin:         'Google sign-in was interrupted. Please try again.',
  OAuthCallback:       'Could not complete Google sign-in. Please try again.',
  SessionRequired:     'Please sign in to access that page.',
  Default:             'An unexpected error occurred. Please try again.',
};

function mapAuthError(code: string | null): string | null {
  if (!code) return null;
  return AUTH_ERRORS[code] ?? AUTH_ERRORS.Default;
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function OrDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-zinc-900/40 px-3 text-[11px] font-medium text-zinc-600 backdrop-blur-sm">
          or continue with email
        </span>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

function LoginForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();

  // Pick up ?error= from Auth.js redirect (e.g. after failed Google OAuth)
  const urlError = mapAuthError(searchParams.get('error'));

  // ── Form state ─────────────────────────────────────────────────────────────
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isGLoading, setIsGLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(urlError);

  const busy = isLoading || isGLoading;

  // ── Credentials handler ────────────────────────────────────────────────────

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim())    { setError('Please enter your email address.'); return; }
    if (!password.trim()) { setError('Please enter your password.');       return; }

    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false, // we handle the redirect ourselves for better UX
      });

      if (result?.error) {
        // result.error is the Auth.js error code string (e.g. "CredentialsSignin")
        setError(mapAuthError(result.error) ?? AUTH_ERRORS.Default);
        return;
      }

      // Success — push to dashboard and flush the RSC cache
      router.push('/dashboard');
      router.refresh();

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Google handler ─────────────────────────────────────────────────────────

  async function handleGoogleSignIn() {
    setError(null);
    setIsGLoading(true);
    try {
      // redirect:true (default) — Auth.js navigates to Google then to callbackUrl
      await signIn('google', { callbackUrl: '/dashboard' });
      // Execution continues here only if something blocked the navigation
    } catch {
      setError('Google sign-in failed. Please try again.');
      setIsGLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[400px]">

      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800
                      bg-zinc-900/40 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="mb-1 text-xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-[13px] font-light text-zinc-500">
            Sign in to your <span className="font-medium text-zinc-300">Trade Insight Daily</span> account
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/25
                          bg-rose-500/[0.08] px-3.5 py-3">
            <AlertCircle size={14} className="mt-px shrink-0 text-rose-400" />
            <p className="text-[12px] leading-snug text-rose-300">{error}</p>
          </div>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl
                     border border-zinc-700/80 bg-zinc-800/50 px-4 py-2.5 text-sm
                     font-medium text-zinc-300 transition-all duration-150
                     hover:border-zinc-600 hover:bg-zinc-800 hover:text-white
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGLoading
            ? <Loader2 size={15} className="animate-spin text-zinc-500" />
            : <GoogleIcon size={16} />
          }
          Continue with Google
        </button>

        <OrDivider />

        {/* Credentials form */}
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4" noValidate>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                <Mail size={15} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={busy}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 pl-10 pr-4
                           text-sm text-white placeholder-zinc-700 outline-none backdrop-blur-sm
                           transition-all duration-150 focus:border-sky-500/60 focus:bg-zinc-900/80
                           focus:ring-2 focus:ring-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                <Lock size={15} />
              </div>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={busy}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 pl-10 pr-10
                           text-sm text-white placeholder-zinc-700 outline-none backdrop-blur-sm
                           transition-all duration-150 focus:border-sky-500/60 focus:bg-zinc-900/80
                           focus:ring-2 focus:ring-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-400"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[11px] font-medium text-zinc-600 transition-colors hover:text-sky-400">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-sky-500 px-4 py-3 text-sm font-semibold text-white
                       transition-all duration-150 hover:bg-sky-400
                       disabled:cursor-not-allowed disabled:opacity-60"
            onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(14,165,233,0.35)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-7 text-center text-[12px] text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-sky-400 transition-colors hover:text-sky-300">
            Sign up free
          </Link>
        </p>

        {/* Trial callout */}
        <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg
                        border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-2">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <p className="text-[10px] font-medium text-emerald-500/80">
            New? Start your free 14-day trial — no card required
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-[10px] leading-relaxed text-zinc-700">
        By signing in, you agree to our{' '}
        <Link href="#" className="underline underline-offset-2 hover:text-zinc-500">Terms</Link>{' '}
        and{' '}
        <Link href="#" className="underline underline-offset-2 hover:text-zinc-500">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}