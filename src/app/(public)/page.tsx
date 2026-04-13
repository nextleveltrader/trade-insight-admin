// src/app/page.tsx
// Trade Insight Daily — Public Landing Page
// Mobile-First | Dark Mode | Glassmorphism | PWA-Ready

import Link from "next/link";
import {
  TrendingUp,
  BarChart2,
  Bookmark,
  Zap,
  ArrowRight,
MessageCircle,
  Code,
  Briefcase,
  ChevronRight,
  Activity,
  Globe,
  ShieldCheck,
  Star,
} from "lucide-react";

// ─── STATIC MOCK DATA ────────────────────────────────────────────────────────

const features = [
  {
    icon: TrendingUp,
    title: "Daily Directional Bias",
    description:
      "Every trading day starts with a clear Bullish or Bearish bias across Crypto, Forex, and Stocks — no noise, just direction.",
    accent: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    icon: BarChart2,
    title: "Deep Market Analysis",
    description:
      "Multi-timeframe breakdowns, key support/resistance zones, and macro context that institutional traders rely on.",
    accent: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: Bookmark,
    title: "Save & Filter Insights",
    description:
      "Bookmark your favorite analyses, filter by asset class, and build a personalized market intelligence library.",
    accent: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    icon: Zap,
    title: "Real-Time Precision",
    description:
      "Published before market open, our bias reports give you the edge when it matters — at the start of every session.",
    accent: "from-amber-500/20 to-amber-600/5",
    iconColor: "text-amber-400",
    border: "border-amber-500/20",
  },
];

const insights = [
  {
    tag: "FOREX",
    tagColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    title: "EUR/USD Daily Bias",
    subtitle: "April 14, 2025",
    bias: "Bullish",
    biasColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    summary:
      "DXY weakness continuing into European session. Price holding above 1.0850 structure. Expecting a push toward 1.0920 resistance. Key invalidation below 1.0820.",
    readTime: "3 min read",
  },
  {
    tag: "CRYPTO",
    tagColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    title: "Bitcoin Weekly Analysis",
    subtitle: "April 12, 2025",
    bias: "Bearish",
    biasColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    summary:
      "BTC rejected at $72K supply zone after third attempt. Weekly candle forming bearish engulfing. Watch for retracement to $66,800 — $67,500 demand area.",
    readTime: "5 min read",
  },
  {
    tag: "STOCKS",
    tagColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    title: "S&P 500 Market Bias",
    subtitle: "April 11, 2025",
    bias: "Neutral",
    biasColor: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
    summary:
      "CPI data uncertainty ahead. SPX consolidating inside 5,180 – 5,230 range. Breakout direction will depend on Wednesday's inflation print. Patience is the edge.",
    readTime: "4 min read",
  },
];

const stats = [
  { value: "2,400+", label: "Active Members" },
  { value: "98%", label: "Accuracy Rate" },
  { value: "180+", label: "Markets Covered" },
  { value: "Daily", label: "Bias Reports" },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

/** Glowing dot grid background */
function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #3f3f46 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Radial fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950" />
    </div>
  );
}

/** Glowing orb accent */
function GlowOrb({
  className,
  color = "cyan",
}: {
  className?: string;
  color?: "cyan" | "emerald" | "violet";
}) {
  const colors = {
    cyan: "bg-cyan-500/20",
    emerald: "bg-emerald-500/15",
    violet: "bg-violet-500/15",
  };
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-3xl ${colors[color]} ${className}`}
    />
  );
}

/** Navbar */
function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400">
            <Activity size={16} className="text-zinc-950" strokeWidth={2.5} />
          </div>
          <span
            className="text-base font-bold tracking-tight text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Trade<span className="text-cyan-400">Insight</span>
            <span className="ml-1 text-zinc-400">Daily</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/admin/login"
            className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            Join Free
            <ChevronRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/** Hero Section */
function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      <GridBackground />
      <GlowOrb
        className="left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2"
        color="cyan"
      />
      <GlowOrb
        className="bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2"
        color="emerald"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          Live Market Bias — Updated Daily Before Market Open
        </div>

        {/* Headline */}
        <h1
          className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Navigate the Market{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            with Clear Daily Bias
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Professional directional insights for Crypto, Forex & Stocks — every
          morning. No signals, no guesswork. Pure market bias and deep analysis
          designed for serious traders.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin/login"
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(34,211,238,0.25)] transition-all hover:shadow-[0_0_40px_rgba(34,211,238,0.45)] sm:w-auto"
          >
            Get Started — It's Free
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="#insights"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:border-white/20 hover:bg-white/10 sm:w-auto"
          >
            Explore Free Insights
          </Link>
        </div>

        {/* Social proof mini-row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            No credit card required
          </div>
          <div className="h-3 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <Star size={13} className="text-amber-400" />
            Trusted by 2,400+ traders
          </div>
          <div className="h-3 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-cyan-400" />
            180+ markets covered
          </div>
        </div>
      </div>

      {/* Hero bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  );
}

/** Stats Bar */
function StatsBar() {
  return (
    <section className="relative border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-2xl font-extrabold text-white sm:text-3xl"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  {s.value}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Features Section */
function FeaturesSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6" id="features">
      <GlowOrb
        className="right-0 top-1/2 h-64 w-64 translate-x-1/2 -translate-y-1/2"
        color="violet"
      />
      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Why Trade Insight Daily
          </p>
          <h2
            className="text-3xl font-extrabold text-white sm:text-4xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Everything You Need to Trade{" "}
            <span className="text-zinc-400">With Conviction</span>
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border ${f.border} bg-gradient-to-br ${f.accent} p-6 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]`}
              >
                {/* Icon */}
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/80 ${f.iconColor}`}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {f.description}
                </p>

                {/* Subtle corner gradient */}
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className={`h-full w-full rounded-bl-full bg-gradient-to-bl ${f.accent} blur-xl`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Dashboard Preview / Sneak Peek — Bento Grid */
function DashboardPreview() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6" id="preview">
      <GlowOrb
        className="left-0 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2"
        color="cyan"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Platform Preview
          </p>
          <h2
            className="text-3xl font-extrabold text-white sm:text-4xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Your Personal{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Market Intelligence Hub
            </span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid auto-rows-auto gap-3 sm:grid-cols-12">
          {/* Main Bias Card — col 1-7 */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-zinc-900/50 p-5 backdrop-blur sm:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Today's Market Bias
                </p>
                <p
                  className="text-xl font-extrabold text-white"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  EUR/USD
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-400">
                ▲ Bullish
              </span>
            </div>

            {/* Fake chart bars */}
            <div className="flex items-end gap-1.5 rounded-xl bg-zinc-900/60 p-4">
              {[40, 55, 45, 60, 52, 70, 65, 80, 72, 88, 78, 92].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${h}px`,
                      background:
                        h > 70
                          ? "linear-gradient(to top, #10b981, #34d399)"
                          : "linear-gradient(to top, #064e3b, #065f46)",
                    }}
                  />
                )
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Entry Zone", val: "1.0842" },
                { label: "Target", val: "1.0920" },
                { label: "Invalidation", val: "1.0815" },
              ].map((x) => (
                <div
                  key={x.label}
                  className="rounded-lg bg-zinc-900/70 p-2 text-center"
                >
                  <p className="text-[10px] text-zinc-500">{x.label}</p>
                  <p className="text-sm font-bold text-white">{x.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column stacked — col 8-12 */}
          <div className="flex flex-col gap-3 sm:col-span-5">
            {/* Active Markets */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur">
              <p className="mb-3 text-xs font-semibold text-zinc-400">
                Active Markets
              </p>
              <div className="space-y-2">
                {[
                  { pair: "BTC/USD", bias: "▼ Bearish", color: "text-rose-400", bg: "bg-rose-500/10", pct: "-2.1%" },
                  { pair: "GBP/USD", bias: "▲ Bullish", color: "text-emerald-400", bg: "bg-emerald-500/10", pct: "+0.8%" },
                  { pair: "GOLD", bias: "▲ Bullish", color: "text-amber-400", bg: "bg-amber-500/10", pct: "+1.3%" },
                ].map((m) => (
                  <div
                    key={m.pair}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-white">{m.pair}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${m.bg} ${m.color}`}
                      >
                        {m.bias}
                      </span>
                      <span className={`text-xs font-medium ${m.color}`}>
                        {m.pct}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved + Session */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                <Bookmark size={20} className="mb-2 text-violet-400" />
                <p className="text-2xl font-extrabold text-white">12</p>
                <p className="text-center text-[10px] text-zinc-500">
                  Saved Insights
                </p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <Activity size={20} className="mb-2 text-cyan-400" />
                <p className="text-2xl font-extrabold text-white">NY</p>
                <p className="text-center text-[10px] text-zinc-500">
                  Session Open
                </p>
              </div>
            </div>
          </div>

          {/* Bottom wide bar — quick insight teaser */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur sm:col-span-12">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-zinc-500">Latest Insight</p>
                <p className="text-base font-bold text-white">
                  DXY Weakness + Fed Pause = Risk-On Environment
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  A deep macro look at why dollar weakness is fueling commodity
                  and EM currency strength this week.
                </p>
              </div>
              <Link
                href="/admin/login"
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Read Full Report <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Frosted overlay on bottom hinting locked content */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-20 items-end justify-center bg-gradient-to-t from-zinc-950 to-transparent">
          <p className="mb-2 text-xs text-zinc-600">
            Sign in to unlock full dashboard access
          </p>
        </div>
      </div>
    </section>
  );
}

/** Recent Free Insights Section */
function InsightsSection() {
  return (
    <section
      className="relative overflow-hidden px-4 py-20 sm:px-6"
      id="insights"
    >
      <GlowOrb
        className="right-1/3 bottom-0 h-64 w-64 translate-y-1/2"
        color="emerald"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-3 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Free Insights
          </p>
          <h2
            className="text-3xl font-extrabold text-white sm:text-4xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            See What We Publish{" "}
            <span className="text-zinc-400">Every Day</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
            A sample of our daily bias reports. Members get access to every
            insight, saved history, and priority updates.
          </p>
        </div>

        {/* Insight Cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {insights.map((ins) => (
            <div
              key={ins.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 backdrop-blur transition-all hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 pt-4 pb-3">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ins.tagColor}`}
                >
                  {ins.tag}
                </span>
                <span className="text-[10px] text-zinc-600">{ins.subtitle}</span>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold leading-snug text-white">
                    {ins.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${ins.biasColor}`}
                  >
                    {ins.bias}
                  </span>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-zinc-400">
                  {ins.summary}
                </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                <span className="text-xs text-zinc-600">{ins.readTime}</span>
                <Link
                  href="/admin/login"
                  className="flex items-center gap-1 text-xs font-medium text-cyan-400 transition-all hover:gap-2"
                >
                  Read Full <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
          >
            View All Insights <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** CTA Section */
function CTASection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-zinc-900/80 to-emerald-500/10 p-8 text-center backdrop-blur sm:p-12">
        {/* Glow inside card */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        <p className="relative mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Start Today — No Card Needed
        </p>
        <h2
          className="relative mb-4 text-3xl font-extrabold text-white sm:text-4xl"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Stop Trading Blind.
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Trade With Daily Clarity.
          </span>
        </h2>
        <p className="relative mx-auto mb-8 max-w-md text-sm text-zinc-400">
          Join thousands of traders who start their trading day with a clear
          bias, structured analysis, and zero noise.
        </p>
        <Link
          href="/admin/login"
          className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 px-8 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]"
        >
          Create Your Free Account
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

/** Footer */
function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400">
              <Activity size={13} className="text-zinc-950" strokeWidth={2.5} />
            </div>
            <span
              className="text-sm font-bold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Trade<span className="text-cyan-400">Insight</span>
              <span className="text-zinc-400"> Daily</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#insights" className="hover:text-white transition-colors">Insights</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          </div>

          {/* Socials */}
          <div className="flex items-center gap-3">
            {[
              { icon: MessageCircle, href: "#" },
              { icon: Code, href: "#" },
              { icon: Briefcase, href: "#" },
            ].map(({ icon: Icon, href }) => (
              <Link
                key={href + Icon.displayName}
                href={href}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition-all hover:border-white/20 hover:text-white"
              >
                <Icon size={14} />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Trade Insight Daily. All rights reserved.
          Market bias is for educational purposes only. Not financial advice.
        </div>
      </div>
    </footer>
  );
}

// ─── FONT LOADER (Syne via Google Fonts inline) ───────────────────────────────
// Add this to your <head> via layout.tsx, or use next/font.
// For self-contained convenience, we inject it here via a style tag.
function SyneFontLoader() {
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
      `,
      }}
    />
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <SyneFontLoader />
      <div className="min-h-screen bg-zinc-950 text-white antialiased">
        <Navbar />
        <main>
          <HeroSection />
          <StatsBar />
          <FeaturesSection />
          <DashboardPreview />
          <InsightsSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}