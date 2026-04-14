"use client";

// src/app/(user)/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Market Feed v2
//
// Changes from v1:
//   [1] MOBILE FIX    — overflow-x-hidden on root, Stats Bar is a horizontal
//                       scrollable flex on mobile (no grid-cols-3 wrapping),
//                       Filter row uses -mx-4/px-4 bleed + smooth scroll
//   [2] PAYWALL       — global binary flag (HAS_ACTIVE_SUBSCRIPTION).
//                       false → full-page glassmorphism overlay over a blurred
//                       card grid; true → normal unlocked grid.
//   [3] CARDS         — all locked:false; "Read Insight" always visible,
//                       becomes a filled sky pill on group-hover
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart2,
  BookOpen,
  RefreshCw,
  CheckCircle,
  Zap,
  Globe,
  Bitcoin,
  LineChart,
  Gem,
  Crown,
  Tv2,
  ShieldCheck,
} from "lucide-react";

// ─── MOCK SUBSCRIPTION GATE ───────────────────────────────────────────────────
// Flip to `true` to preview the fully unlocked dashboard.
const HAS_ACTIVE_SUBSCRIPTION = false;

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Direction   = "Bullish" | "Bearish" | "Neutral";
type Category    = "Forex" | "Crypto" | "Indices" | "Commodities" | "Metals";
type FilterLabel = "All" | Category;

interface Insight {
  id:         number;
  asset:      string;
  category:   Category;
  direction:  Direction;
  biasType:   string;
  summary:    string;
  detail:     string;
  timeAgo:    string;
  readMin:    number;
  confidence: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INSIGHTS: Insight[] = [
  {
    id:         1,
    asset:      "EUR/USD",
    category:   "Forex",
    direction:  "Bullish",
    biasType:   "ICT Bias",
    summary:    "Buyside liquidity resting above 1.0920 draws price higher. Daily FVG at 1.0845–1.0862 acting as a propulsion zone.",
    detail:     "Bullish continuation bias aligned with weekly market structure. Target: 1.0935 BSL.",
    timeAgo:    "2h ago",
    readMin:    4,
    confidence: 82,
  },
  {
    id:         2,
    asset:      "GOLD",
    category:   "Metals",
    direction:  "Bullish",
    biasType:   "Fundamental Outlook",
    summary:    "Softer USD and dovish Fed tone continue to support Gold's upward bias. Upcoming CPI release is the key risk event.",
    detail:     "Fundamental backdrop remains constructive. Watch the 2,345 support for long entries.",
    timeAgo:    "3h ago",
    readMin:    5,
    confidence: 76,
  },
  {
    id:         3,
    asset:      "GBP/USD",
    category:   "Forex",
    direction:  "Neutral",
    biasType:   "Fundamental Bias",
    summary:    "BoE's cautious stance and sticky UK inflation create a mixed picture. Dollar strength risk from NFP limits conviction.",
    detail:     "No clear directional edge today. Wait for a 4H confirmation break above 1.2750.",
    timeAgo:    "4h ago",
    readMin:    3,
    confidence: 48,
  },
  {
    id:         4,
    asset:      "BTC/USD",
    category:   "Crypto",
    direction:  "Bearish",
    biasType:   "ICT Bias",
    summary:    "Price swept the weekly highs at 71,400 showing signs of distribution. Bearish OB at 70,800–71,200 confirmed.",
    detail:     "Sellside liquidity pools resting at 68,900. Short from OB retest with SL above 71,450.",
    timeAgo:    "5h ago",
    readMin:    6,
    confidence: 71,
  },
  {
    id:         5,
    asset:      "US500",
    category:   "Indices",
    direction:  "Bullish",
    biasType:   "Fundamental Outlook",
    summary:    "Strong earnings and cooling inflation data underpin the bullish macro backdrop for US equities heading into Q2.",
    detail:     "Key level: 5,240 must hold as support. Bias remains long on dips into 5,210–5,225.",
    timeAgo:    "6h ago",
    readMin:    5,
    confidence: 68,
  },
  {
    id:         6,
    asset:      "OIL (WTI)",
    category:   "Commodities",
    direction:  "Bearish",
    biasType:   "Fundamental Bias",
    summary:    "OPEC+ uncertainty and rising US inventory data weigh on crude. Demand outlook from China remains a headwind.",
    detail:     "Price rejected 87.50 resistance cleanly. Targets: 84.20 then 82.80 near-term.",
    timeAgo:    "7h ago",
    readMin:    4,
    confidence: 60,
  },
];

// ─── FILTER TABS ─────────────────────────────────────────────────────────────

const FILTERS: { label: FilterLabel; icon: React.ElementType }[] = [
  { label: "All",         icon: BarChart2  },
  { label: "Forex",       icon: Globe      },
  { label: "Crypto",      icon: Bitcoin    },
  { label: "Indices",     icon: LineChart  },
  { label: "Commodities", icon: Zap        },
  { label: "Metals",      icon: Gem        },
];

// ─── DIRECTION CONFIG ─────────────────────────────────────────────────────────

const DIRECTION_MAP: Record<
  Direction,
  {
    Icon:        React.ElementType;
    badgeCls:    string;
    barCls:      string;
    glowCls:     string;
    borderHover: string;
    headerGlow:  string;
  }
> = {
  Bullish: {
    Icon:        TrendingUp,
    badgeCls:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls:      "bg-emerald-400",
    glowCls:     "hover:shadow-emerald-500/20",
    borderHover: "hover:border-emerald-500/30",
    headerGlow:  "from-emerald-500/[0.05]",
  },
  Bearish: {
    Icon:        TrendingDown,
    badgeCls:    "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls:      "bg-rose-400",
    glowCls:     "hover:shadow-rose-500/20",
    borderHover: "hover:border-rose-500/30",
    headerGlow:  "from-rose-500/[0.05]",
  },
  Neutral: {
    Icon:        Minus,
    badgeCls:    "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls:      "bg-zinc-500",
    glowCls:     "hover:shadow-zinc-500/10",
    borderHover: "hover:border-zinc-600/40",
    headerGlow:  "from-zinc-700/[0.05]",
  },
};

const CATEGORY_STYLE: Record<Category, string> = {
  Forex:       "text-sky-400    bg-sky-500/10    border-sky-500/20",
  Crypto:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Indices:     "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Commodities: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Metals:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

// ─── DIRECTION BADGE ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const { Icon, badgeCls } = DIRECTION_MAP[direction];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border
                  px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}
    >
      <Icon size={11} strokeWidth={2.5} />
      {direction}
    </span>
  );
}

// ─── CONFIDENCE BAR ───────────────────────────────────────────────────────────

function ConfidenceBar({ value, barCls }: { value: number; barCls: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${barCls}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-7 text-right font-mono text-[9px] font-medium text-zinc-600">
        {value}%
      </span>
    </div>
  );
}

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const dir    = DIRECTION_MAP[insight.direction];
  const catCls = CATEGORY_STYLE[insight.category];

  return (
    <article
      className={`
        group flex flex-col overflow-hidden
        rounded-2xl border border-zinc-800/70
        bg-zinc-900/40
        transition-all duration-200
        hover:-translate-y-0.5 hover:border-zinc-700/60
        hover:bg-zinc-900/70 hover:shadow-xl
        ${dir.glowCls} ${dir.borderHover}
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-start justify-between gap-3
          border-b border-zinc-800/60
          bg-gradient-to-r ${dir.headerGlow} to-transparent
          px-4 py-3.5
        `}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-white">
              {insight.asset}
            </h3>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9px]
                          font-bold uppercase tracking-wide ${catCls}`}
            >
              {insight.category}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {insight.biasType}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          <DirectionBadge direction={insight.direction} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="flex-1 text-[12.5px] font-light leading-relaxed text-zinc-400">
          {insight.summary}
        </p>
        <p className="mt-2 text-[11px] font-light leading-relaxed text-zinc-600">
          {insight.detail}
        </p>

        {/* Confidence bar */}
        <div className="mt-4">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">
            Bias Confidence
          </p>
          <ConfidenceBar value={insight.confidence} barCls={dir.barCls} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
        <div className="flex items-center gap-3 text-[10px] text-zinc-700">
          <span className="flex items-center gap-1">
            <Clock size={9} />
            {insight.timeAgo}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <BookOpen size={9} />
            {insight.readMin} min
          </span>
        </div>

        {/* Read Insight — always visible; fills with sky tint on hover */}
        <Link
          href={`/insights/${insight.id}`}
          className="
            flex items-center gap-1.5
            rounded-lg border border-sky-500/0 bg-transparent
            px-2.5 py-1
            text-[11px] font-semibold text-sky-400
            transition-all duration-150
            group-hover:border-sky-500/30 group-hover:bg-sky-500/10
          "
        >
          Read Insight
          <ArrowRight
            size={10}
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
// [1] Horizontal flex with overflow-x-auto on mobile.
//     Each card has min-w-[148px] so it never collapses; on sm+ it stretches.

const STATS = [
  {
    label:   "Assets Covered",
    value:   "20",
    icon:    BarChart2,
    iconCls: "text-sky-400",
    bgCls:   "bg-sky-500/10",
  },
  {
    label:   "Insights Today",
    value:   "20",
    icon:    CheckCircle,
    iconCls: "text-emerald-400",
    bgCls:   "bg-emerald-500/10",
  },
  {
    label:   "Session Bias",
    value:   "Bullish",
    icon:    TrendingUp,
    iconCls: "text-emerald-400",
    bgCls:   "bg-emerald-500/10",
  },
];

function StatsBar() {
  return (
    <div className="-mx-4 mb-8 sm:mx-0">
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="
                flex min-w-[148px] shrink-0 items-center gap-3
                rounded-xl border border-zinc-800/60
                bg-zinc-900/40 px-4 py-3.5
                sm:min-w-0 sm:flex-1
              "
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center
                            rounded-lg ${s.bgCls}`}
              >
                <Icon size={14} className={s.iconCls} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {s.value}
                </p>
                <p className="truncate text-[10px] text-zinc-600">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FULL-PAGE PAYWALL OVERLAY ────────────────────────────────────────────────
// [2] Absolutely positioned over the blurred grid. The grid itself gets
//     pointer-events-none + blur-[3px] so links can't be clicked through it.

function PaywallOverlay() {
  return (
    <div
      className="
        absolute inset-0 z-30
        flex items-center justify-center
        rounded-2xl px-4
      "
      style={{ background: "rgba(9,9,11,0.55)" }}
    >
      {/* Glassmorphism card */}
      <div
        className="
          relative w-full max-w-md overflow-hidden
          rounded-2xl
          border border-white/[0.08]
          bg-zinc-900/80 backdrop-blur-xl
          shadow-[0_32px_64px_rgba(0,0,0,0.6)]
          px-6 py-8 sm:px-8 sm:py-10
          text-center
        "
      >
        {/* Top amber accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Crown icon */}
        <div className="relative mb-5 flex justify-center">
          <div
            className="
              flex h-14 w-14 items-center justify-center
              rounded-2xl
              border border-amber-500/30 bg-amber-500/10
              shadow-[0_0_28px_rgba(245,158,11,0.25)]
            "
          >
            <Crown size={26} className="text-amber-400" strokeWidth={1.75} />
          </div>
        </div>

        {/* Copy */}
        <h2 className="mb-2 text-xl font-bold tracking-tight text-white">
          Your Free Trial Has Ended
        </h2>
        <p className="mb-1.5 text-sm font-light leading-relaxed text-zinc-400">
          You're seeing{" "}
          <span className="font-medium text-white">
            {INSIGHTS.length} daily market biases
          </span>{" "}
          blurred below. Unlock instant access to every insight, ICT setup, and calendar analysis.
        </p>
        <p className="mb-7 text-[11px] text-zinc-600">
          No commitment. Cancel anytime.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">

          {/* Primary — amber premium */}
          <Link
            href="/upgrade/premium"
            className="
              group relative flex w-full items-center justify-center gap-2
              overflow-hidden rounded-xl
              border border-amber-500/40
              bg-gradient-to-r from-amber-500/20 to-amber-600/10
              px-5 py-3.5
              text-sm font-bold text-amber-400
              transition-all duration-200
              hover:border-amber-500/60 hover:from-amber-500/30
              hover:to-amber-600/20
              hover:shadow-[0_0_28px_rgba(245,158,11,0.25)]
            "
          >
            {/* Shimmer sweep */}
            <span
              className="
                pointer-events-none absolute inset-0 -translate-x-full
                bg-gradient-to-r from-transparent via-amber-400/10 to-transparent
                transition-transform duration-700
                group-hover:translate-x-full
              "
            />
            <Sparkles size={14} className="shrink-0" />
            Upgrade to Premium
            <span className="ml-1 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
              $0.99 / mo
            </span>
            <ArrowRight
              size={13}
              className="ml-auto shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>

          {/* Secondary — sky ad-unlock */}
          <Link
            href="/upgrade/ads"
            className="
              group flex w-full items-center justify-center gap-2
              rounded-xl
              border border-sky-500/25 bg-sky-500/[0.06]
              px-5 py-3
              text-sm font-semibold text-sky-400
              transition-all duration-200
              hover:border-sky-500/40 hover:bg-sky-500/10
            "
          >
            <Tv2 size={14} className="shrink-0" />
            Unlock 1 Month via Ads
            <ArrowRight
              size={13}
              className="ml-auto shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-zinc-700">
          <ShieldCheck size={11} className="text-emerald-600" />
          Secure checkout · Cancel anytime · Instant access
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function MarketFeedPage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");

  const filtered =
    activeFilter === "All"
      ? INSIGHTS
      : INSIGHTS.filter((i) => i.category === activeFilter);

  return (
    /*
     * [1] overflow-x-hidden on the root div is the final safety net that
     *     prevents any child element from causing horizontal page scroll
     *     on mobile — even if a nested element slightly overflows.
     */
    <div className="relative overflow-x-hidden">

      {/* Ambient page glow — fixed so it doesn't cause layout shifts */}
      <div
        className="
          pointer-events-none fixed left-1/2 top-[30%]
          h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2
          rounded-full bg-sky-500/[0.04] blur-[120px]
          md:left-[calc(50%+110px)]
        "
      />

      <div className="relative">

        {/* ── [A] PAGE HEADER ───────────────────────────────────────────── */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              {formatDate()}
            </p>
            <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Today's{" "}
              <span className="text-sky-400">Market Bias</span>
            </h1>
            <p className="mt-1 text-[11px] font-light text-zinc-600">
              Published at{" "}
              <span className="font-medium text-zinc-500">06:15 AM UTC</span>
              {" "}— before the session opens.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Live badge */}
            <div
              className="
                flex items-center gap-2 rounded-full
                border border-emerald-500/20 bg-emerald-500/[0.06]
                px-3.5 py-1.5 text-[10px] font-medium text-emerald-400
              "
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · {INSIGHTS.length} Insights
            </div>
            <button
              className="
                flex h-8 w-8 items-center justify-center
                rounded-lg border border-zinc-800 bg-zinc-900/60
                text-zinc-600 transition-colors
                hover:border-zinc-700 hover:text-zinc-400
              "
              title="Refresh feed"
            >
              <RefreshCw size={13} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* ── [B] STATS BAR ─────────────────────────────────────────────── */}
        <StatsBar />

        {/* ── [C] CATEGORY FILTER ───────────────────────────────────────── */}
        {/*
         * [1] -mx-4/px-4 bleed: the container reaches the screen edges on
         *     mobile so that the scroll feels native. overflow-x-auto on the
         *     inner flex keeps scrolling contained to this element only.
         *     [&::-webkit-scrollbar]:hidden hides the bar via Tailwind's
         *     arbitrary variant — no plugin needed.
         */}
        <div className="-mx-4 mb-6 sm:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(({ label, icon: Icon }) => {
              const isActive = activeFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setActiveFilter(label)}
                  className={`
                    flex shrink-0 items-center gap-1.5
                    rounded-full border px-3.5 py-1.5
                    text-[11px] font-semibold
                    transition-all duration-150
                    ${isActive
                      ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_14px_rgba(14,165,233,0.15)]"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }
                  `}
                >
                  <Icon
                    size={11}
                    strokeWidth={isActive ? 2.2 : 1.75}
                    className={isActive ? "text-sky-400" : "text-zinc-700"}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── [D] INSIGHT GRID + PAYWALL ────────────────────────────────── */}
        {/*
         * [2] When locked: the grid gets blur + brightness + pointer-events-none
         *     so links inside are dead. The PaywallOverlay sits above via z-30.
         *     When unlocked: normal interactive grid, no overlay rendered.
         *
         * min-h ensures the overlay has enough height to look good even if the
         * filtered list is short (e.g. only 1 Crypto card showing).
         */}
        <div className="relative min-h-[520px]">

          {/* Card grid */}
          <div
            className={`
              grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3
              transition-all duration-300
              ${!HAS_ACTIVE_SUBSCRIPTION
                ? "pointer-events-none select-none blur-[3px] brightness-75"
                : ""
              }
            `}
          >
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-20 text-center">
                <BarChart2 size={28} className="mb-3 text-zinc-700" strokeWidth={1.5} />
                <p className="text-sm font-medium text-zinc-500">No insights for this category today.</p>
                <p className="mt-1 text-xs text-zinc-700">Check back tomorrow or try a different filter.</p>
              </div>
            ) : (
              filtered.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>

          {/* Paywall overlay */}
          {!HAS_ACTIVE_SUBSCRIPTION && <PaywallOverlay />}
        </div>

        {/* ── [E] SUBSCRIBED FOOTER STRIP ───────────────────────────────── */}
        {HAS_ACTIVE_SUBSCRIPTION && (
          <div
            className="
              mt-10 flex flex-col items-center justify-between gap-4
              rounded-2xl border border-emerald-500/15
              bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-transparent
              px-6 py-5 sm:flex-row
            "
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">
                  You have full Pro access
                </p>
                <p className="text-[11px] font-light text-zinc-600">
                  All {INSIGHTS.length} insights are unlocked. New biases publish daily at 06:15 UTC.
                </p>
              </div>
            </div>
            <Link
              href="/settings/subscription"
              className="shrink-0 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Manage Subscription →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}