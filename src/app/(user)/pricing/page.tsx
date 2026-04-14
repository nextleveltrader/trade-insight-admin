// src/app/(user)/pricing/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Pricing / Upgrade Page
//
// Sprint 1 placeholder — provides a valid route target for the trial expiry
// redirect in middleware.ts.
//
// Sprint 5 (Stripe integration) will replace this with a full Checkout page.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import {
  Sparkles,
  Check,
  ArrowRight,
  Zap,
  Brain,
  BarChart2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/auth";

const FEATURES = [
  { icon: Brain,    text: "Daily ICT bias for 20+ assets"             },
  { icon: BarChart2,text: "Full economic event history & pip data"     },
  { icon: Sparkles, text: "AI trade setups with entry, SL & TP levels" },
  { icon: Globe,    text: "Pre-market delivery at 06:15 UTC daily"     },
  { icon: Zap,      text: "Live signals during high-impact events"     },
  { icon: ShieldCheck, text: "Cancel anytime — no lock-in"            },
];

export default async function PricingPage() {
  const session     = await auth();
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;
  const isExpired   = !isPro && trialEndsAt !== null && Date.now() >= trialEndsAt;

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed left-1/2 top-[30%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.04] blur-[130px]" />

      <div className="relative mx-auto max-w-lg px-4 py-12 sm:px-6">

        {/* ── Trial expired banner ── */}
        {isExpired && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3.5">
            <Zap size={14} className="mt-0.5 shrink-0 text-rose-400" strokeWidth={2} />
            <div>
              <p className="text-[12.5px] font-semibold text-rose-300">Your 14-day trial has ended</p>
              <p className="mt-0.5 text-[11px] font-light text-zinc-500">
                Upgrade to Pro to continue accessing ICT biases, AI trade setups, and full history data.
              </p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-400">
            <Sparkles size={10} strokeWidth={2} />TradeInsight Pro
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            One plan.<br />
            <span className="text-amber-400">Everything included.</span>
          </h1>
          <p className="mt-3 text-[13px] font-light leading-relaxed text-zinc-500">
            Get daily ICT biases, AI trade setups, and full economic history —
            delivered before the market opens.
          </p>
        </header>

        {/* ── Pricing card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-zinc-900/60 backdrop-blur-sm px-6 py-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/8 blur-2xl" />

          <div className="relative mb-6 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-zinc-600">Monthly</p>
            <div className="mt-1 flex items-end justify-center gap-1">
              <span className="text-5xl font-extrabold text-white">$29</span>
              <span className="mb-1.5 text-[13px] text-zinc-500">/mo</span>
            </div>
            <p className="mt-1 text-[10.5px] text-zinc-600">Billed monthly · Cancel anytime</p>
          </div>

          <ul className="mb-7 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[12.5px] text-zinc-400">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10">
                  <Icon size={10} className="text-amber-400" strokeWidth={2} />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* CTA — wired to Stripe in Sprint 5 */}
          <button
            disabled
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 py-3.5 text-[13px] font-bold text-amber-400 opacity-70 cursor-not-allowed"
          >
            <Sparkles size={13} />
            Upgrade to Pro
            <ArrowRight size={12} className="ml-auto" />
          </button>
          <p className="mt-2 text-center text-[9.5px] text-zinc-700">
            Stripe Checkout coming in Sprint 5 — payment not yet wired.
          </p>
        </div>

        {/* ── Free tier reminder ── */}
        <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Check size={12} className="text-emerald-400" strokeWidth={2.5} />
            <p className="text-[11.5px] font-semibold text-white">Always free</p>
          </div>
          <ul className="space-y-1.5 pl-5">
            {["Fundamental bias for every asset", "Yesterday's ICT biases (historical proof)", "2 rows of event history per economic release"].map((t) => (
              <li key={t} className="text-[10.5px] text-zinc-600">{t}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link href="/feed" className="text-[11px] text-zinc-600 underline-offset-2 hover:text-zinc-400 hover:underline transition-colors">
            ← Back to Market Feed
          </Link>
        </div>
      </div>
    </div>
  );
}