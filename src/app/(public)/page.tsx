// src/app/(public)/page.tsx
//
// Trade Insight Daily — Hero Redesign (v4)
// ─────────────────────────────────────────────────────────────────────────────
// v4 Changes (Hero & Navbar only — all other sections unchanged):
//
//   [1] TYPOGRAPHY     — headline tracking-tight + tighter leading; subheadline
//                        leading-[1.85] for open, editorial breathing room
//   [2] VERTICAL FLOW  — hero uses min-h-[88vh] + flex justify-center so the
//                        "message" always sits in the visual centre; ticker is
//                        pushed down with mt-24 sm:mt-32; features section
//                        gains extra pt-24 sm:pt-28 gap above it
//   [3] LIVE BADGE     — glassmorphism pill with green pulse dot replacing the
//                        plain <p> tag above the ticker
//   [4] AMBIENT GLOW   — three-layer radial gradient system behind hero text
//   [5] CTA GLOW       — sky-blue box-shadow on hover for the primary button
//   [6] NAVBAR         — language switcher refined to icon-only + code, smaller
//   [7] FORCE-DYNAMIC  — export const dynamic = 'force-dynamic'
// ─────────────────────────────────────────────────────────────────────────────

// [7] Force Next.js to always SSR this page (never statically cache it),
//     so the live asset list from the DB is always fresh.
export const dynamic = "force-dynamic";

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
  Languages,
  Sparkles,
} from "lucide-react";

import { getDb }                  from "@/db";
import { assets, categories }  from "@/db/schema";
import { eq }                  from "drizzle-orm";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Direction = "Bullish" | "Bearish" | "Neutral";

interface InsightCard {
  category:  string;
  title:     string;
  summary:   string;
  direction: Direction;
  timeAgo:   string;
  readMin:   number;
}

interface CalendarEvent {
  time:          string;
  currency:      string;
  event:         string;
  impact:        "HIGH" | "MED";
  humanSummary:  string;
  hasArticle:    boolean;
}

// ─── FALLBACK DATA (used only when DB has no rows) ────────────────────────────

const FALLBACK_ASSETS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/GBP", "GBP/JPY", "EUR/JPY", "USD/CHF",
  "BTC/USD", "ETH/USD", "XRP/USD",
  "US500",   "US100",   "GER40",
  "GOLD",    "SILVER",  "OIL",    "NATGAS",
];

// ─── STATIC DATA ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "BN", label: "বাংলা" }, // Added
  { code: "HI", label: "हिन्दी" }, // Added
  { code: "AR", label: "العربية" },
  { code: "TR", label: "Türkçe" },
  { code: "ID", label: "Bahasa" },
  { code: "ES", label: "Español" },
  { code: "PT", label: "Português" },
  { code: "FR", label: "Français" },
  { code: "RU", label: "Русский" },
  { code: "DE", label: "Deutsch" },
  { code: "CN", label: "中文" },
];

const FEATURES = [
  {
    icon:        LineChart,
    label:       "Fundamental Bias",
    headline:    "Daily Intraday Bias",
    body:        "Every asset covered daily is driven by live macro and fundamental data — not lagging indicators. Forex, Crypto, Indices, and Commodities, all before the session opens.",
    borderClass: "border-sky-500/30",
    bgClass:     "bg-sky-500/[0.04]",
    iconClass:   "text-sky-400 bg-sky-500/10",
    tag:         "20 Assets Daily",
    tagClass:    "text-sky-400 bg-sky-500/10 border-sky-500/25",
  },
  {
    icon:        BrainCircuit,
    label:       "ICT Concepts",
    headline:    "ICT Concept Bias",
    body:        "3–5 high-probability directional biases daily, built strictly on ICT methodology — Fair Value Gaps, Order Blocks, Liquidity Sweeps, and Market Structure Shifts.",
    borderClass: "border-violet-500/30",
    bgClass:     "bg-violet-500/[0.04]",
    iconClass:   "text-violet-400 bg-violet-500/10",
    tag:         "3–5 Biases Daily",
    tagClass:    "text-violet-400 bg-violet-500/10 border-violet-500/25",
  },
  {
    icon:        Calendar,
    label:       "Smart Calendar",
    headline:    "Filtered Economic Calendar",
    body:        "We cut the noise. Only high-impact events, with each one explained in your native language via AI. A deep-dive analysis article drops 30 minutes before every major release.",
    borderClass: "border-emerald-500/30",
    bgClass:     "bg-emerald-500/[0.04]",
    iconClass:   "text-emerald-400 bg-emerald-500/10",
    tag:         "High-Impact Only",
    tagClass:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  },
  {
    icon:        Languages,
    label:       "AI Translation",
    headline:    "Reads Like It Was Written For You",
    body:        "Every insight, every calendar explanation, every analysis — translated into your native language by a context-aware AI. Not Google Translate. Financial terminology stays precise.",
    borderClass: "border-amber-500/30",
    bgClass:     "bg-amber-500/[0.04]",
    iconClass:   "text-amber-400 bg-amber-500/10",
    tag:         "12 Languages",
    tagClass:    "text-amber-400 bg-amber-500/10 border-amber-500/25",
  },
];

const INSIGHTS: InsightCard[] = [
  {
    category:  "ICT Bias",
    title:     "EUR/USD — Daily ICT Directional Bias",
    summary:   "Buyside liquidity resting above 1.0920 draws price higher. Daily FVG at 1.0845–1.0862 acting as a propulsion zone. Bullish continuation bias aligned with weekly structure.",
    direction: "Bullish",
    timeAgo:   "2h ago",
    readMin:   4,
  },
  {
    category:  "Fundamental Outlook",
    title:     "Gold — Weekly Fundamental Outlook",
    summary:   "Softer USD and dovish Fed tone continue to support Gold's upward bias. Upcoming CPI release is the key risk event. Fundamental backdrop remains constructive for the metal.",
    direction: "Bullish",
    timeAgo:   "5h ago",
    readMin:   5,
  },
  {
    category:  "Fundamental Bias",
    title:     "GBP/USD — Intraday Fundamental Bias",
    summary:   "BoE's cautious stance and sticky UK inflation create a mixed fundamental picture. Dollar strength risk from upcoming NFP data limits clear directional conviction today.",
    direction: "Neutral",
    timeAgo:   "7h ago",
    readMin:   3,
  },
];

const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    time:         "08:30 NY",
    currency:     "USD",
    event:        "CPI (MoM)",
    impact:       "HIGH",
    humanSummary: "Measures how much everyday prices changed last month. A hot number = stronger Dollar; a cool number = weaker Dollar.",
    hasArticle:   true,
  },
  {
    time:         "10:00 NY",
    currency:     "USD",
    event:        "ISM Services PMI",
    impact:       "HIGH",
    humanSummary: "A snapshot of US services industry health. Above 50 signals expansion — positive for the Dollar.",
    hasArticle:   false,
  },
  {
    time:         "12:30 NY",
    currency:     "GBP",
    event:        "BoE Governor Speech",
    impact:       "HIGH",
    humanSummary: "Hawkish hints about rate hikes will boost the Pound. Dovish language will weigh on GBP pairs.",
    hasArticle:   true,
  },
];

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
// For production: replace @import with next/font/google in layout.tsx.

function GlobalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          html { font-family: 'Outfit', sans-serif; }

          /* ── Infinite horizontal ticker ───────────────────────────────── */
          @keyframes ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .ticker-track {
            animation: ticker 34s linear infinite;
            will-change: transform;
          }
          .ticker-track:hover { animation-play-state: paused; }

          /* ── CTA primary button hover-glow ────────────────────────────── */
          /* [5] Tailwind's JIT can't generate arbitrary box-shadow with
                 CSS vars, so we define it here as a utility class.         */
          .btn-glow:hover {
            box-shadow: 0 0 28px rgba(14, 165, 233, 0.40);
          }

          /* ── Ambient hero glow pulse (very slow, subtle) ──────────────── */
          @keyframes ambientPulse {
            0%, 100% { opacity: 0.55; }
            50%       { opacity: 0.75; }
          }
          .hero-glow { animation: ambientPulse 8s ease-in-out infinite; }
        `,
      }}
    />
  );
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const map: Record<Direction, { Icon: React.ElementType; cls: string }> = {
    Bullish: { Icon: TrendingUp,   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    Bearish: { Icon: TrendingDown, cls: "text-rose-400    bg-rose-500/10    border-rose-500/25"    },
    Neutral: { Icon: Minus,        cls: "text-zinc-400    bg-zinc-700/30    border-zinc-700/50"    },
  };
  const { Icon, cls } = map[direction];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon size={10} strokeWidth={2.5} />
      {direction}
    </span>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
// [6] Language switcher: icon-only trigger (Globe + code + chevron), no label.
//     Dropdown remains full but the trigger itself is visually leaner.

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/85 backdrop-blur-lg">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Trade<span className="text-sky-400">Insight</span>{" "}
            <span className="font-light text-zinc-500">Daily</span>
          </span>
        </Link>

        {/* ── Right controls ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/*
           * [6] REFINED Language Switcher
           * Trigger: 28 px tall, icon + "EN" + micro-chevron — very compact.
           * Dropdown: unchanged content, but now has an AI badge at the top.
           */}
          <div className="group relative hidden sm:block">
            {/* Compact trigger */}
            <button
              aria-label="Switch display language"
              className="flex h-7 items-center gap-1 rounded-md border border-zinc-800
                         bg-zinc-900/80 px-2 text-[11px] font-medium text-zinc-400
                         transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <Globe size={11} className="text-sky-400/80" />
              <span className="font-mono tracking-wide">EN</span>
              <ChevronDown size={10} className="text-zinc-700" />
            </button>

            {/* Dropdown */}
            <div
              className="pointer-events-none absolute right-0 top-full mt-2 w-40 origin-top-right
                         scale-95 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900
                         opacity-0 shadow-2xl ring-1 ring-black/30
                         transition-all duration-150
                         group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
            >
              {/* AI badge header */}
              <div className="flex items-center gap-1.5 border-b border-zinc-800/80 px-3 py-2">
                <Sparkles size={9} className="text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">
                  AI-Translated
                </span>
              </div>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left
                             text-xs text-zinc-400 transition-colors
                             hover:bg-zinc-800/70 hover:text-white"
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
            className="rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold
                       text-white transition-colors hover:bg-sky-400"
          >
            Join Free
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
// [1] Typography  — leading-[1.15] on h1, tracking-tight; subtext leading-[1.85]
// [2] Vertical    — min-h-[88vh] + flex-col justify-center; ticker at mt-24/32
// [3] Live Badge  — glassmorphism pill with green pulse dot above ticker
// [4] Glow        — three-layer ambient radial gradient system
// [5] CTA glow    — .btn-glow utility class (defined in GlobalStyles)

function HeroSection({ liveAssets }: { liveAssets: string[] }) {
  return (
    <section
      className="relative flex min-h-[88vh] flex-col overflow-hidden
                 px-4 pt-14 sm:px-6"
      /* pt-14 matches the fixed navbar height so content isn't hidden */
    >
      {/* ── Top accent line ─────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r
                      from-transparent via-sky-500/40 to-transparent" />

      {/* ── [4] Three-layer ambient glow system ─────────────────────────── */}
      {/*  Layer 1: Large, centred, primary sky-blue — slow pulse           */}
      <div
        className="hero-glow pointer-events-none absolute left-1/2 top-[42%]
                   h-[560px] w-[820px] -translate-x-1/2 -translate-y-1/2
                   rounded-full bg-sky-500/[0.07] blur-[110px]"
      />
      {/*  Layer 2: Smaller emerald offset to upper-left                    */}
      <div
        className="pointer-events-none absolute left-[20%] top-[28%]
                   h-72 w-72 -translate-x-1/2 -translate-y-1/2
                   rounded-full bg-emerald-500/[0.05] blur-[80px]"
      />
      {/*  Layer 3: Sky tint, offset lower-right, barely visible            */}
      <div
        className="pointer-events-none absolute right-[18%] top-[60%]
                   h-56 w-56 translate-x-1/2
                   rounded-full bg-sky-400/[0.04] blur-[70px]"
      />

      {/* ── Hero message — vertically centred in the viewport ───────────── */}
      {/*
       * flex-1 + flex + items-center makes this sub-div take all remaining
       * height (after the navbar offset) and centres its children.
       */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center
                      pb-4 pt-10 text-center sm:pt-6">

        {/* Publication status badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/20
                     bg-sky-500/[0.06] px-4 py-1.5 text-[11px] font-medium text-sky-400
                     backdrop-blur-sm"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping
                             rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
          </span>
          Published daily before market open
        </div>

        {/* ── [1] Headline — tracking-tight + tight leading ─────────────── */}
        <h1
          className="mx-auto mb-6 max-w-2xl text-[2.15rem] font-bold
                     leading-[1.13] tracking-tight text-white
                     sm:text-[3.25rem] sm:leading-[1.1]"
        >
          Institutional Market Bias
          <br />
          <span className="font-light text-zinc-500">&amp; Fundamental Clarity</span>
        </h1>

        {/* ── [1] Subheadline — leading-[1.85] for editorial open feel ──── */}
        <p
          className="mx-auto mb-9 max-w-[38rem] text-base font-light
                     leading-[1.85] text-zinc-400 sm:text-[1.05rem]"
        >
          {liveAssets.length} assets covered daily — Forex, Crypto,
          Indices &amp; Commodities.
          Driven by fundamentals and ICT methodology.{" "}
          <span className="font-medium text-amber-400">
            Read in your native language,
          </span>{" "}
          powered by context-aware AI translation.
        </p>

        {/* CTA row */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {/* [5] Primary button — .btn-glow adds hover box-shadow in CSS */}
          <Link
            href="/admin/login"
            className="btn-glow group flex w-full items-center justify-center gap-2
                       rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white
                       transition-all duration-200 hover:bg-sky-400 sm:w-auto"
          >
            Get Started — It's Free
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>

          {/* Secondary — subtle hover lift */}
          <Link
            href="#calendar"
            className="flex w-full items-center justify-center gap-2 rounded-xl
                       border border-zinc-800 bg-zinc-900/70 px-6 py-3 text-sm
                       font-medium text-zinc-300 transition-all duration-200
                       hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-white
                       sm:w-auto"
          >
            <Calendar size={14} className="text-zinc-500" />
            View Smart Calendar
          </Link>
        </div>

        {/* Trust micro-strip */}
        <div
          className="mt-7 flex flex-wrap items-center justify-center
                     gap-x-5 gap-y-2 text-xs text-zinc-600"
        >
          {[
            "No credit card required",
            "No signals or recommendations",
            "12 languages, AI-translated",
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle size={11} className="text-emerald-500/80" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── [2] Asset Ticker — pushed well below the message ────────────── */}
      {/*
       * mt-24 sm:mt-32 creates the deliberate visual breathing room between
       * the "Message" zone (headline + CTAs) and the "Data" zone (ticker).
       * This is the key layout fix for the cramped feeling.
       */}
      <div className="relative z-10 mt-24 w-full sm:mt-32">

        {/* ── [3] Premium "Live Status" badge above the ticker ─────────── */}
        <div className="mb-4 flex justify-center">
          <div
            className="inline-flex items-center gap-2.5 rounded-full border
                       border-white/[0.08] bg-white/[0.04] px-4 py-2
                       text-xs backdrop-blur-md"
          >
            {/* Green pulse dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping
                           rounded-full bg-emerald-400 opacity-70"
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-medium text-zinc-300">
              Live ·{" "}
              <span className="text-white">{liveAssets.length} Assets</span>{" "}
              Covered Daily
            </span>
          </div>
        </div>

        {/* Edge fade masks */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10
                     w-20 bg-gradient-to-r from-zinc-950 to-transparent"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10
                     w-20 bg-gradient-to-l from-zinc-950 to-transparent"
        />

        {/* Scrolling strip */}
        <div className="flex overflow-hidden border-y border-zinc-800/40 bg-zinc-900/15">
          <div className="ticker-track flex shrink-0 items-center">
            {/* Duplicate the list so the loop is seamless */}
            {[...liveAssets, ...liveAssets].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="flex items-center whitespace-nowrap px-5 py-3.5
                           text-[11px] font-medium tracking-wide text-zinc-600"
              >
                {name}
                <span className="ml-5 h-3 w-px bg-zinc-800/80" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade into the next section */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-16
                   bg-gradient-to-t from-zinc-950 to-transparent"
      />
    </section>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────
// [2] Added pt-24 sm:pt-28 to create a large, professional gap after the ticker.

function FeaturesSection() {
  return (
    <section
      className="px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20"
      id="features"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 sm:mb-12">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            Platform Features
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Four pillars of edge.{" "}
            <span className="font-light text-zinc-500">One platform.</span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.label}
                className={`group relative overflow-hidden rounded-2xl border p-6
                            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                            ${feat.borderClass} ${feat.bgClass}`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center
                                rounded-xl ${feat.iconClass}`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px]
                                font-semibold uppercase tracking-wide ${feat.tagClass}`}
                  >
                    {feat.tag}
                  </span>
                </div>
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

// ─── AI TRANSLATION BANNER ───────────────────────────────────────────────────

function TranslationBanner() {
  return (
    <section className="px-4 pb-10 sm:px-6 sm:pb-14">
      <div className="mx-auto max-w-5xl">
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/20
                     bg-amber-500/[0.04] px-6 py-7 sm:px-8"
        >
          <div
            className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40
                       -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center
                         rounded-2xl bg-amber-500/15"
            >
              <Languages size={22} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  Every insight reads like it was written for you
                </p>
                <span
                  className="flex items-center gap-1 rounded-full border border-amber-500/25
                             bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold
                             uppercase tracking-wider text-amber-400"
                >
                  <Sparkles size={8} />
                  AI-Powered
                </span>
              </div>
              <p className="text-xs font-light leading-relaxed text-zinc-500">
                Our native AI translation preserves financial terminology, ICT concepts,
                and market context across{" "}
                <span className="font-medium text-zinc-300">12 languages</span>.
                This is not generic machine translation — it is purpose-built for market
                analysis.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:w-56 sm:shrink-0 sm:justify-end">
              {LANGUAGES.map((l) => (
                <span
                  key={l.code}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5
                             text-[10px] font-medium text-zinc-500
                             transition-colors hover:border-zinc-700 hover:text-zinc-300"
                >
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SMART CALENDAR PREVIEW ──────────────────────────────────────────────────

function CalendarPreview() {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20"
      id="calendar"
    >
      <div
        className="pointer-events-none absolute right-0 top-1/2 h-72 w-72
                   -translate-y-1/2 translate-x-1/2 rounded-full
                   bg-emerald-500/[0.05] blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-10 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Smart Economic Calendar
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              High-impact events only.{" "}
              <span className="font-light text-zinc-500">Explained in your language.</span>
            </h2>
          </div>
          <Link
            href="/admin/login"
            className="mt-4 hidden items-center gap-1.5 text-xs font-medium text-sky-400
                       transition hover:text-sky-300 sm:flex"
          >
            Open Full Calendar <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Calendar size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-white">Economic Calendar</span>
              <span
                className="rounded-full border border-emerald-500/25 bg-emerald-500/10
                           px-2.5 py-0.5 text-[10px] font-bold text-emerald-400"
              >
                High Impact Only
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages size={11} className="text-amber-400" />
              <span className="text-[10px] text-amber-500/80">AI-translated to your language</span>
            </div>
          </div>

          {/* Column headers */}
          <div
            className="grid grid-cols-[68px_50px_1fr_78px] border-b border-zinc-800/40
                       px-4 py-2 sm:grid-cols-[80px_60px_1fr_90px]"
          >
            {["Time", "Ccy", "Event & Plain-Language Analysis", "Impact"].map((h) => (
              <span
                key={h}
                className="text-[9px] font-semibold uppercase tracking-widest text-zinc-700"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Event rows */}
          <div className="divide-y divide-zinc-800/40">
            {CALENDAR_EVENTS.map((ev, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[68px_50px_1fr_78px] items-start gap-0 px-4 py-4
                           transition-colors hover:bg-zinc-800/25
                           sm:grid-cols-[80px_60px_1fr_90px]"
              >
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Clock size={9} className="shrink-0 text-zinc-700" />
                  <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                    {ev.time}
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                    {ev.currency}
                  </span>
                </div>
                <div className="pr-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{ev.event}</span>
                    {ev.hasArticle && (
                      <span
                        className="flex items-center gap-1 rounded-full border border-sky-500/30
                                   bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold text-sky-400"
                      >
                        <BookOpen size={8} />
                        Analysis 30 min before
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-light leading-relaxed text-zinc-500">
                    {ev.humanSummary}
                  </p>
                </div>
                <div className="flex items-start justify-end pt-0.5">
                  <span
                    className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                      ev.impact === "HIGH"
                        ? "border-rose-500/25 bg-rose-500/10 text-rose-400"
                        : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {ev.impact === "HIGH" && <AlertTriangle size={9} />}
                    {ev.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <CheckCircle size={11} className="shrink-0 text-emerald-400" />
            <p className="text-[10px] text-zinc-600">
              Low and medium-impact events are filtered out. Only events that genuinely move
              markets are listed.
            </p>
          </div>
        </div>

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

// ─── RECENT INSIGHTS ─────────────────────────────────────────────────────────

function InsightsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20" id="insights">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
              Recent Insights
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              What we published{" "}
              <span className="font-light text-zinc-500">today.</span>
            </h2>
          </div>
          <Link
            href="/admin/login"
            className="mt-4 hidden items-center gap-1.5 text-xs font-medium text-sky-400
                       transition hover:text-sky-300 sm:flex"
          >
            Browse All Insights <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {INSIGHTS.map((ins) => (
            <article
              key={ins.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800
                         bg-zinc-900/40 transition-all duration-200
                         hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {ins.category}
                </span>
                <DirectionBadge direction={ins.direction} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-2.5 text-sm font-semibold leading-snug text-white">
                  {ins.title}
                </h3>
                <p className="flex-1 text-xs font-light leading-relaxed text-zinc-500">
                  {ins.summary}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] text-zinc-700">
                  <Clock size={9} />
                  <span>{ins.timeAgo}</span>
                  <span>·</span>
                  <span>{ins.readMin} min read</span>
                </div>
                <Link
                  href="/admin/login"
                  className="flex items-center gap-1 text-[11px] font-medium text-sky-400
                             opacity-0 transition-all group-hover:opacity-100"
                >
                  Read <ArrowRight size={10} />
                </Link>
              </div>
            </article>
          ))}
        </div>

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

// ─── CTA BANNER ──────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div
          className="relative overflow-hidden rounded-2xl border border-zinc-800
                     bg-zinc-900/50 px-6 py-12 text-center sm:px-12"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-36 w-64
                       -translate-x-1/2 -translate-y-1/2 rounded-full
                       bg-sky-500/10 blur-3xl"
          />

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            Start Today
          </p>
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
            Clarity before every session.
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm font-light text-zinc-500">
            Join traders who read our daily bias before the market opens —
            fundamental context, ICT structure, and a filtered calendar. Free
            to start. Translated into your language automatically.
          </p>

          <div className="flex flex-col items-center gap-3">
            <Link
              href="/admin/login"
              className="btn-glow group inline-flex items-center gap-2 rounded-xl
                         bg-sky-500 px-7 py-3 text-sm font-semibold text-white
                         transition-all duration-200 hover:bg-sky-400"
            >
              Create Free Account
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-zinc-600">
              <CheckCircle size={11} className="text-emerald-500" />
              No credit card &nbsp;·&nbsp; No signals &nbsp;·&nbsp; No noise
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-800/60 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500">
              <Activity size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold text-white">
              Trade<span className="text-sky-400">Insight</span>{" "}
              <span className="font-light text-zinc-600">Daily</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-600">
            {[
              { label: "Features",       href: "#features"     },
              { label: "Calendar",       href: "#calendar"     },
              { label: "Insights",       href: "#insights"     },
              { label: "Sign In",        href: "/admin/login"  },
              { label: "Privacy Policy", href: "#"             },
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

          <div className="flex items-center gap-1.5">
            <Languages size={11} className="text-amber-500/60" />
            <span className="text-[10px] text-zinc-700">AI-translated · 12 languages</span>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-800/60 pt-6 text-center text-[10px] leading-relaxed text-zinc-700">
          © {year} Trade Insight Daily. All content is for educational and informational
          purposes only. We do not provide financial advice, trading signals, or investment
          recommendations of any kind.
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ROOT (async Server Component) ──────────────────────────────────────

export default async function LandingPage() {
  let liveAssets: string[] = [];

  try {
    const rows = await getDb()
      .select({ name: assets.name, categoryName: categories.name })
      .from(assets)
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .orderBy(categories.id, assets.id);

    liveAssets = rows.map((r) => r.name);
  } catch (err) {
    console.error("[LandingPage] DB fetch failed, using fallback assets:", err);
  }

  const displayAssets = liveAssets.length > 0 ? liveAssets : FALLBACK_ASSETS;

  return (
    <>
      <GlobalStyles />
      <div
        className="min-h-screen bg-zinc-950 text-white antialiased
                   selection:bg-sky-500/30 selection:text-sky-200"
      >
        <Navbar />
        <main>
          <HeroSection liveAssets={displayAssets} />
          <FeaturesSection />
          <TranslationBanner />
          <CalendarPreview />
          <InsightsSection />
          <CTABanner />
        </main>
        <Footer />
      </div>
    </>
  );
}