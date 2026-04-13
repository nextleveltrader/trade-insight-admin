export const runtime = 'edge';  // ← এই line যোগ করুন

'use client';

import { useState, useTransition } from 'react';
import { useRouter }               from 'next/navigation';
import { login }                   from '@/actions/auth.actions';

export default function LoginPage() {
  const router                          = useRouter();
  const [isPending, startTransition]    = useTransition();
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await login(password);
        if (result.error) {
          setError(result.error);
        } else {
          // Small delay to ensure cookie is set before navigation
          setTimeout(() => {
            router.push('/posts');
            router.refresh();
          }, 100);
        }
      } catch (err) {
        console.error('Login error:', err);
        setError('An unexpected error occurred during login.');
      }
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Admin Access</h1>
            <p className="text-sm text-zinc-500">Enter your password to continue</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isPending && handleSubmit()}
                placeholder="••••••••"
                autoComplete="current-password"
                className="
                  w-full px-4 py-2.5 rounded-lg text-sm
                  bg-zinc-800 border border-zinc-700
                  text-zinc-100 placeholder-zinc-600
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60
                  transition-all duration-150
                "
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isPending || !password}
              className="
                w-full py-2.5 px-4 rounded-lg text-sm font-medium
                bg-emerald-600 hover:bg-emerald-500
                text-white
                disabled:opacity-40 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-zinc-900
                transition-all duration-150
                flex items-center justify-center gap-2
              "
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Protected by password authentication
        </p>
      </div>
    </div>
  );
}