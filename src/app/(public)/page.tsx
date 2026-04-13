// src/app/(public)/page.tsx
// Trade Insight Daily — Redesigned Public Landing Page
// Aesthetic: Precision Minimalism — Institutional, Trustworthy, Clean SaaS
// Mobile-First | Dark Mode | Outfit Font | Zero Signal-Provider Elements

import Link from "next/link";
import {
  LineChart,
  BrainCircuit,
  Calendar,
  Globe,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  Activity,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Direction = "Bullish" | "Bearish" | "Neutral";

interface InsightCard {
  category: string;
  title: string;
  summary: string;
  direction: Direction;
  timeAgo: string;
  readMin: number;
}

interface CalendarEvent {
  time: string;
  currency: string;
  event: string;
  impact: "HIGH" | "MED";
  humanSummary: string;
  hasArticle: boolean;
}

// ─── STATIC DATA ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "AR", label: "العربية" },
  { code: "TR", label: "Türkçe" },
  { code: "ID", label: "Bahasa" },
  { code: "ES", label: "Español" },
  { code: "PT", label: "Português" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "Deutsch" },
  { code: "RU", label: "Русский" },
  { code: "ZH", label: "中文" },
];

const DAILY_ASSETS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/GBP", "GBP/JPY", "EUR/JPY", "USD/CHF",
  "BTC/USD", "ETH/USD", "XRP/USD",
  "US500", "US100", "GER40",
  "GOLD", "SILVER", "OIL", "NATGAS",
];

const FEATURES = [
  {
    icon: LineChart,
    label: "Fundamental Bias",
    headline: "Daily Intraday Bias",
    body: "20 assets covered every trading day — 10 Forex pairs, 3 Crypto, 3 Indices, and 4 Commodities. Each bias is driven by live fundamental data, not lagging indicators.",
    borderClass: "border-sky-500/30",
    bgClass: "bg-sky-500/[0.04]",
    iconClass: "text-sky-400 bg-sky-500/10",
    tag: "20 Assets Daily",
    tagClass: "text-sky-400 bg-sky-500/10 border-sky-500/25",
  },
  {
    icon: BrainCircuit,
    label: "ICT Concepts",
    headline: "ICT Concept Bias",
    body: "3–5 high-probability directional biases daily, built strictly on Inner Circle Trader methodology — Fair Value Gaps, Order Blocks, Liquidity, and Market Structure Shifts.",
    borderClass: "border-violet-500/30",
    bgClass: "bg-violet-500/[0.04]",
    iconClass: "text-violet-400 bg-violet-500/10",
    tag: "3–5 Biases Daily",
    tagClass: "text-violet-400 bg-violet-500/10 border-violet-500/25",
  },
  {
    icon: Calendar,
    label: "Smart Calendar",
    headline: "Filtered Economic Calendar",
    body: "We cut the clutter. Only high-impact events, explained in plain English. A deep-dive analysis article is published 30 minutes before every major data release.",
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/[0.04]",
    iconClass: "text-emerald-400 bg-emerald-500/10",
    tag: "High-Impact Only",
    tagClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  },
  {
    icon: Globe,
    label: "AI Translation",
    headline: "Context-Aware AI Translation",
    body: "Every page, every insight, translated natively across 10 languages. Not basic machine translation — our AI preserves financial context, terminology, and nuance.",
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/[0.04]",
    iconClass: "text-amber-400 bg-amber-500/10",
    tag: "10 Languages",
    tagClass: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  },
];

const INSIGHTS: InsightCard[] = [
  {
    category: "ICT Bias",
    title: "EUR/USD — Daily ICT Directional Bias",
    summary:
      "Buyside liquidity resting above 1.0920 draws price higher. Daily FVG at 1.0845–1.0862 acting as a propulsion zone. Bullish continuation bias aligned with weekly structure.",
    direction: "Bullish",
    timeAgo: "2h ago",
    readMin: 4,
  },
  {
    category: "Fundamental Outlook",
    title: "Gold — Weekly Fundamental Outlook",
    summary:
      "Softer USD and dovish Fed tone continue to support Gold's upward bias. Upcoming CPI release is the key risk event. Fundamental backdrop remains constructive for the metal.",
    direction: "Bullish",
    timeAgo: "5h ago",
    readMin: 5,
  },
  {
    category: "Fundamental Bias",
    title: "GBP/USD — Intraday Fundamental Bias",
    summary:
      "BoE's cautious stance and sticky UK inflation create a mixed fundamental picture. Dollar strength risk from upcoming NFP data limits clear directional conviction today.",
    direction: "Neutral",
    timeAgo: "7h ago",
    readMin: 3,
  },
];

const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    time: "08:30 NY",
    currency: "USD",
    event: "CPI (MoM)",
    impact: "HIGH",
    humanSummary:
      "Measures how much everyday prices changed last month. A hot number = stronger Dollar; a cool number = weaker Dollar.",
    hasArticle: true,
  },
  {
    time: "10:00 NY",
    currency: "USD",
    event: "ISM Services PMI",
    impact: "HIGH",
    humanSummary:
      "A snapshot of US services industry health. Above 50 signals expansion — positive for the Dollar.",
    hasArticle: false,
  },
  {
    time: "12:30 NY",
    currency: "GBP",
    event: "BoE Governor Speech",
    impact: "HIGH",
    humanSummary:
      "Hawkish hints about rate hikes will boost the Pound. Dovish language will weigh on GBP pairs.",
    hasArticle: true,
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const map: Record<Direction, { icon: React.ElementType; cls: string }> = {
    Bullish: {
      icon: TrendingUp,
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    Bearish: {
      icon: TrendingDown,
      cls: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    },
    Neutral: {
      icon: Minus,
      cls: "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    },
  };
  const { icon: Icon, cls } = map[direction];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      <Icon size={10} strokeWidth={2.5} />
      {direction}
    </span>
  );
}

// Inject Outfit font at runtime.
// For production, replace with next/font/google in layout.tsx.
function OutfitFont() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          html { font-family: 'Outfit', sans-serif; }
          @keyframes ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .animate-ticker { animation: ticker 30s linear infinite; }
        `,
      }}
    />
  );
}

// ─── SECTION: NAVBAR ─────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* ── Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Trade<span className="text-sky-400">Insight</span>{" "}
            <span className="font-light text-zinc-500">Daily</span>
          </span>
        </Link>

        {/* ── Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher — mock UI to showcase the AI translation feature */}
          <div className="group relative hidden sm:block">
            <button className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200">
              <Globe size={12} />
              EN
              <ChevronDown size={11} className="text-zinc-600" />
            </button>

            {/* Dropdown revealed on hover — purely presentational */}
            <div
              className="pointer-events-none absolute right-0 top-full mt-1.5 w-36 origin-top-right scale-95 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <span className="w-6 font-mono text-[10px] font-bold text-zinc-600">
                    {l.code}
                  </span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/admin/login"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-white"
          >
            Sign In
          </Link>

          <Link
            href="/admin/login"
            className="rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-400"
          >
            Join Free
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── SECTION: HERO ───────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden px-4 pb-16 pt-32 sm:pb-24 sm:pt-40">
      {/* Accent line at very top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

      {/* Minimal glow — subtle, not distracting */}
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[480px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.05] blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        {/* Live badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/8 px-4 py-1.5 text-[11px] font-medium text-sky-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
          </span>
          Published daily before market open
        </div>

        {/* Main headline — two-tone, minimal */}
        <h1 className="mb-5 text-[2.2rem] font-bold leading-[1.15] tracking-tight text-white sm:text-5xl">
          Institutional Market Bias
          <br />
          <span className="font-light text-zinc-500">
            &amp; Fundamental Clarity
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-8 max-w-lg text-base font-light leading-relaxed text-zinc-400">
          20 assets covered daily — Forex, Crypto, Indices &amp; Commodities.
          Driven by fundamental data and ICT methodology. Built for traders who
          want clear direction, not noise.
        </p>

        {/* CTA row */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin/login"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-400 sm:w-auto"
          >
            Get Started — It's Free
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="#calendar"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white sm:w-auto"
          >
            <Calendar size={14} className="text-zinc-500" />
            View Smart Calendar
          </Link>
        </div>

        {/* Trust micro-row */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-emerald-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-emerald-500" />
            No signals or trade recommendations
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-emerald-500" />
            10 languages supported
          </span>
        </div>
      </div>

      {/* ── Asset Ticker Strip */}
      <div className="relative z-10 mt-14 w-full">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
          20 Assets Covered Daily
        </p>

        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-zinc-950 to-transparent" />

        <div className="flex overflow-hidden border-y border-zinc-800/50 bg-zinc-900/20">
          {/* Duplicate list for seamless loop */}
          <div className="animate-ticker flex shrink-0 items-center">
            {[...DAILY_ASSETS, ...DAILY_ASSETS].map((asset, i) => (
              <span
                key={`${asset}-${i}`}
                className="flex items-center whitespace-nowrap px-5 py-3 text-xs font-medium text-zinc-600"
              >
                {asset}
                <span className="ml-5 h-3 w-px bg-zinc-800" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: FEATURES ───────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20" id="features">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            Platform Features
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Four pillars of edge.{" "}
            <span className="font-light text-zinc-500">One platform.</span>
          </h2>
        </div>

        {/* 2×2 grid — collapses to 1-col on mobile */}
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.label}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 ${feat.borderClass} ${feat.bgClass}`}
              >
                {/* Top row: icon + tag pill */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${feat.iconClass}`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${feat.tagClass}`}
                  >
                    {feat.tag}
                  </span>
                </div>

                {/* Text */}
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {feat.label}
                </p>
                <h3 className="mb-2.5 text-base font-semibold text-white">
                  {feat.headline}
                </h3>
                <p className="text-sm font-light leading-relaxed text-zinc-500">
                  {feat.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: SMART CALENDAR PREVIEW ─────────────────────────────────────────

function CalendarPreview() {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20"
      id="calendar"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/[0.05] blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        {/* Header row */}
        <div className="mb-10 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Smart Economic Calendar
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              High-impact events only.{" "}
              <span className="font-light text-zinc-500">
                Explained in plain English.
              </span>
            </h2>
          </div>
          <Link
            href="/admin/login"
            className="mt-4 hidden items-center gap-1.5 text-xs font-medium text-sky-400 transition hover:text-sky-300 sm:flex"
          >
            Open Full Calendar <ArrowRight size={13} />
          </Link>
        </div>

        {/* Calendar UI mockup */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Calendar size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Economic Calendar
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                High Impact Only
              </span>
            </div>
            <span className="text-[10px] text-zinc-700">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[68px_50px_1fr_78px] border-b border-zinc-800/40 px-4 py-2 sm:grid-cols-[80px_60px_1fr_90px]">
            {["Time", "Ccy", "Event & Plain-English Analysis", "Impact"].map(
              (h) => (
                <span
                  key={h}
                  className="text-[9px] font-semibold uppercase tracking-widest text-zinc-700"
                >
                  {h}
                </span>
              )
            )}
          </div>

          {/* Event rows */}
          <div className="divide-y divide-zinc-800/40">
            {CALENDAR_EVENTS.map((ev, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[68px_50px_1fr_78px] items-start gap-0 px-4 py-4 transition-colors hover:bg-zinc-800/25 sm:grid-cols-[80px_60px_1fr_90px]"
              >
                {/* Time */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Clock size={9} className="shrink-0 text-zinc-700" />
                  <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                    {ev.time}
                  </span>
                </div>

                {/* Currency */}
                <div className="pt-0.5">
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                    {ev.currency}
                  </span>
                </div>

                {/* Event + explanation */}
                <div className="pr-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {ev.event}
                    </span>
                    {ev.hasArticle && (
                      <span className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold text-sky-400">
                        <BookOpen size={8} />
                        Analysis 30 min before
                      </span>
                    )}
                  </div>
                  {/* Human-readable explanation — the key differentiator */}
                  <p className="text-[11px] font-light leading-relaxed text-zinc-500">
                    {ev.humanSummary}
                  </p>
                </div>

                {/* Impact badge */}
                <div className="flex items-start justify-end pt-0.5">
                  {ev.impact === "HIGH" ? (
                    <span className="flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                      <AlertTriangle size={9} />
                      HIGH
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      MED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <CheckCircle size={11} className="shrink-0 text-emerald-400" />
            <p className="text-[10px] text-zinc-600">
              Low and medium-impact events are filtered out automatically. Only
              events that genuinely move markets are shown.
            </p>
          </div>
        </div>

        {/* Mobile link */}
        <div className="mt-5 text-center sm:hidden">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400"
          >
            Open Full Calendar <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: RECENT INSIGHTS ────────────────────────────────────────────────

function InsightsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20" id="insights">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
              Recent Insights
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              What we publish{" "}
              <span className="font-light text-zinc-500">every day.</span>
            </h2>
          </div>
          <Link
            href="/admin/login"
            className="mt-4 hidden items-center gap-1.5 text-xs font-medium text-sky-400 transition hover:text-sky-300 sm:flex"
          >
            Browse All Insights <ArrowRight size={13} />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {INSIGHTS.map((ins) => (
            <article
              key={ins.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              {/* Card header: category + direction */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {ins.category}
                </span>
                <DirectionBadge direction={ins.direction} />
              </div>

              {/* Card body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-2.5 text-sm font-semibold leading-snug text-white">
                  {ins.title}
                </h3>
                <p className="flex-1 text-xs font-light leading-relaxed text-zinc-500">
                  {ins.summary}
                </p>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] text-zinc-700">
                  <Clock size={9} />
                  <span>{ins.timeAgo}</span>
                  <span>·</span>
                  <span>{ins.readMin} min read</span>
                </div>
                <Link
                  href="/admin/login"
                  className="flex items-center gap-1 text-[11px] font-medium text-sky-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                >
                  Read <ArrowRight size={10} />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile link */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400"
          >
            Browse All Insights <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: CTA BANNER ─────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center sm:px-12">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            Start Today
          </p>
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
            Clarity before every session.
          </h2>
          <p className="mx-auto mb-7 max-w-md text-sm font-light text-zinc-500">
            Join traders who read our daily bias report before the market opens
            — fundamental context, ICT structure, and a filtered calendar. Free
            to start.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/admin/login"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 sm:w-auto"
            >
              Create Free Account
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-zinc-600">
              <CheckCircle size={11} className="text-emerald-500" />
              No credit card · No signals · No noise
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: FOOTER ─────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-800/60 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500">
              <Activity size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold text-white">
              Trade<span className="text-sky-400">Insight</span>{" "}
              <span className="font-light text-zinc-600">Daily</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-600">
            {[
              { label: "Features", href: "#features" },
              { label: "Calendar", href: "#calendar" },
              { label: "Insights", href: "#insights" },
              { label: "Sign In", href: "/admin/login" },
              { label: "Privacy Policy", href: "#" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="transition-colors hover:text-zinc-300"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Languages note */}
          <div className="flex items-center gap-1.5">
            <Globe size={11} className="text-zinc-700" />
            <span className="text-[10px] text-zinc-700">
              Available in 10 languages
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 border-t border-zinc-800/60 pt-6 text-center text-[10px] leading-relaxed text-zinc-700">
          © {year} Trade Insight Daily. All content is for educational and
          informational purposes only. We do not provide financial advice,
          trading signals, or investment recommendations of any kind.
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <OutfitFont />
      <div className="min-h-screen bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <CalendarPreview />
          <InsightsSection />
          <CTABanner />
        </main>
        <Footer />
      </div>
    </>
  );
}