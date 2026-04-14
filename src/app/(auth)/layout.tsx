// src/app/(auth)/layout.tsx
//
// Dedicated layout for all auth pages (login, register, forgot-password, etc.).
// ─────────────────────────────────────────────────────────────────────────────
// • NO sidebar, NO mobile nav, NO dashboard chrome.
// • Full-screen zinc-950 with a three-layer ambient radial glow system that
//   matches the landing page's visual language.
// • A minimal top bar with just the brand mark keeps orientation without
//   imposing navigation hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { Activity } from 'lucide-react';

export const metadata = {
  title: 'Sign In — Trade Insight Daily',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">

      {/* ── Ambient glow layers (matches landing page system) ─────────────── */}

      {/* Layer 1 — large centred sky-blue bloom */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%]
                   h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2
                   rounded-full bg-sky-500/[0.07] blur-[120px]"
      />

      {/* Layer 2 — smaller emerald, offset upper-left */}
      <div
        className="pointer-events-none absolute left-[22%] top-[28%]
                   h-64 w-64 -translate-x-1/2 -translate-y-1/2
                   rounded-full bg-emerald-500/[0.055] blur-[80px]"
      />

      {/* Layer 3 — faint sky tint, lower-right */}
      <div
        className="pointer-events-none absolute bottom-[18%] right-[16%]
                   h-52 w-52 rounded-full bg-sky-400/[0.045] blur-[70px]"
      />

      {/* ── Top accent line ───────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/35 to-transparent" />

      {/* ── Minimal brand bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex h-14 items-center justify-center border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 transition-transform duration-200 group-hover:scale-105">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Trade<span className="text-sky-400">Insight</span>{' '}
            <span className="font-light text-zinc-500">Daily</span>
          </span>
        </Link>
      </header>

      {/* ── Page content (the auth card) ──────────────────────────────────── */}
      <main className="relative z-10 flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* ── Micro footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 pb-6 text-center text-[10px] text-zinc-700">
        © {new Date().getFullYear()} Trade Insight Daily · Educational purposes only
      </footer>
    </div>
  );
}