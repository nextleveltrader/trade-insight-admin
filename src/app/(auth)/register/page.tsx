'use client';
// src/app/(auth)/register/page.tsx
//
// Trade Insight Daily — Register Page (Phase 2: Wired)
// ─────────────────────────────────────────────────────────────────────────────
// Form flow:
//   1. User submits → registerUser() Server Action runs.
//   2. On success   → signIn("credentials") auto-logs them in → /dashboard.
//   3. On failure   → error is displayed inline (no full-page refresh).
//
// Google flow: signIn("google") → OAuth handshake → createUser event sets trial
//              → jwt callback reads trial dates → redirect to /dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition, Suspense } from 'react';
import { useRouter }               from 'next/navigation';
import { signIn }                  from 'next-auth/react';
import Link                        from 'next/link';
import {
  User, Mail, Lock, Eye, EyeOff,
  ArrowRight, AlertCircle, Loader2,
  CheckCircle, ShieldCheck,
} from 'lucide-react';

import { registerUser } from '@/actions/auth-actions';

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
          or sign up with email
        </span>
      </div>
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',     pass: password.length >= 8         },
    { label: 'Uppercase letter',  pass: /[A-Z]/.test(password)       },
    { label: 'Number or symbol',  pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  if (!password) return null;
  const score    = checks.filter((c) => c.pass).length;
  const barColor = score === 1 ? 'bg-rose-500' : score === 2 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-zinc-800'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`flex items-center gap-1 text-[10px] transition-colors ${pass ? 'text-emerald-500' : 'text-zinc-700'}`}>
            <CheckCircle size={9} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

function RegisterForm() {
  const router = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // ── Async states ───────────────────────────────────────────────────────────
  // useTransition gives us isPending for the server action call without
  // blocking the UI thread.
  const [isPending,  startTransition] = useTransition();
  const [isGLoading, setIsGLoading]   = useState(false);
  const [error,      setError]        = useState<string | null>(null);
  const [success,    setSuccess]      = useState<string | null>(null);

  const busy = isPending || isGLoading;

  // ── Register handler ───────────────────────────────────────────────────────
  //
  // Three-step sequence:
  //   A. Call registerUser() server action to create the DB row.
  //   B. If that succeeds, immediately call signIn("credentials") to issue
  //      the JWT and set the auth cookie — no second form submission needed.
  //   C. Redirect to /dashboard.

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side quick validation (server will validate again — defence in depth)
    if (!name.trim())  { setError('Please enter your full name.');        return; }
    if (!email.trim()) { setError('Please enter your email address.');    return; }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    startTransition(async () => {
      // ── A. Build FormData and call the server action ───────────────────
      const formData = new FormData();
      formData.set('name',     name.trim());
      formData.set('email',    email.trim().toLowerCase());
      formData.set('password', password);
      // deviceId — populate via FingerprintJS in Phase 3 (anti-fraud)
      // formData.set('deviceId', await getDeviceId());

      const result = await registerUser(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // ── B. Auto sign-in with the credentials we just registered ────────
      setSuccess('Account created! Signing you in…');

      const signInResult = await signIn('credentials', {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false,          // handle redirect manually so we can show errors
      });

      if (signInResult?.error) {
        // This is unusual (we just created the user) but handle it gracefully.
        setError('Account created but automatic sign-in failed. Please sign in manually.');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // ── C. Redirect to dashboard ───────────────────────────────────────
      router.push('/dashboard');
      router.refresh(); // flush the RSC cache so layout reads the new session
    });
  }

  // ── Google handler ─────────────────────────────────────────────────────────

  async function handleGoogleSignIn() {
    setError(null);
    setIsGLoading(true);
    try {
      // callbackUrl is where Google redirects after OAuth completes.
      // The createUser event in auth.ts will set trial dates for new signups.
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setError('Google sign-up failed. Please try again.');
      setIsGLoading(false);
    }
    // Note: if signIn('google') succeeds it navigates away so setIsGLoading(false)
    // only runs on error — that's intentional.
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[420px]">

      {/* Trial badge */}
      <div className="mb-5 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25
                        bg-emerald-500/[0.07] px-4 py-1.5 text-[11px] font-medium text-emerald-400
                        backdrop-blur-sm">
          <ShieldCheck size={12} strokeWidth={2.2} />
          14-day free trial · No credit card required
        </div>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800
                      bg-zinc-900/40 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent" />

        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="mb-1 text-xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="text-[13px] font-light text-zinc-500">
            Join <span className="font-medium text-zinc-300">Trade Insight Daily</span> — free for 14 days
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/25
                          bg-emerald-500/[0.08] px-3.5 py-3">
            <CheckCircle size={14} className="mt-px shrink-0 text-emerald-400" />
            <p className="text-[12px] leading-snug text-emerald-300">{success}</p>
          </div>
        )}

        {/* Error banner */}
        {error && !success && (
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Full name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                <User size={15} />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                autoComplete="name"
                disabled={busy}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 pl-10 pr-4
                           text-sm text-white placeholder-zinc-700 outline-none backdrop-blur-sm
                           transition-all duration-150 focus:border-sky-500/60 focus:bg-zinc-900/80
                           focus:ring-2 focus:ring-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

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

          {/* Password + strength */}
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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
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
            <PasswordStrength password={password} />
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
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Create Account — It&apos;s Free
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* What you get */}
        <div className="mt-5 flex flex-col gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3.5">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Free trial includes</p>
          {[
            '20 assets covered daily — Forex, Crypto, Indices & Commodities',
            'ICT methodology bias + Fundamental outlook',
            'AI-translated into 12 languages',
          ].map((item) => (
            <span key={item} className="flex items-start gap-2 text-[11px] font-light leading-snug text-zinc-500">
              <CheckCircle size={10} className="mt-0.5 shrink-0 text-emerald-500/80" />
              {item}
            </span>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[12px] text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-sky-400 transition-colors hover:text-sky-300">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-[10px] leading-relaxed text-zinc-700">
        By creating an account, you agree to our{' '}
        <Link href="#" className="underline underline-offset-2 hover:text-zinc-500">Terms of Service</Link>{' '}
        and{' '}
        <Link href="#" className="underline underline-offset-2 hover:text-zinc-500">Privacy Policy</Link>.
        Device fingerprinting is used solely to prevent trial abuse.
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-sky-500" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}