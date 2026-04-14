"use client";

// src/app/(user)/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Market Feed v3  "Mixed Freemium + Time-Delayed Unlock"
//
// Business logic:
//   • Fundamental Biases        → always FREE for everyone
//   • ICT Biases (today)        → LOCKED for free users  (isProOnly + !isHistorical)
//   • ICT Biases (yesterday+)   → FREE "historical proof" (isProOnly + isHistorical)
//
// v3 removes the v2 global paywall overlay.  Locking is now card-level:
//   locked card → blur on summary / detail / confidence bar
//              → small glassmorphism "CardLockBanner" inside the card body
//
// All v2 mobile fixes are preserved:
//   • overflow-x-hidden on root
//   • Stats Bar: horizontal flex + overflow-x-auto + min-w per card
//   • Filter row: -mx-4 / px-4 bleed + [&::-webkit-scrollbar]:hidden
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
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
  History,
  ShieldCheck,
} from "lucide-react";

// ─── SUBSCRIPTION GATE ────────────────────────────────────────────────────────
// Flip to `true` to preview the fully-unlocked Pro dashboard.
const HAS_ACTIVE_SUBSCRIPTION = false;

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Direction   = "Bullish" | "Bearish" | "Neutral";
type Category    = "Forex" | "Crypto" | "Indices" | "Commodities" | "Metals";
type FilterLabel = "All" | Category;

interface Insight {
  id:           number;
  asset:        string;
  category:     Category;
  direction:    Direction;
  biasType:     string;
  summary:      string;
  detail:       string;
  timeAgo:      string;
  publishedAt:  string;
  readMin:      number;
  confidence:   number;
  isProOnly:    boolean;  // true = ICT content; false = Fundamental (always free)
  isHistorical: boolean;  // true = yesterday or older → auto-unlocked
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
//   2× Fundamental  (isProOnly: false)                    → always free
//   2× Today ICT    (isProOnly: true, isHistorical: false) → locked for free users
//   2× Yesterday ICT(isProOnly: true, isHistorical: true)  → unlocked "Past Pro Bias"

const INSIGHTS: Insight[] = [
  // ── Fundamentals ──────────────────────────────────────────────────────────
  {
    id:           1,
    asset:        "EUR/USD",
    category:     "Forex",
    direction:    "Bullish",
    biasType:     "Fundamental Bias",
    summary:      "Softer USD tone following yesterday's weaker ISM Services data underpins the Euro. ECB speak today could amplify the move if rhetoric turns less dovish.",
    detail:       "Macro backdrop supports dip-buying. Watch the 1.0870 demand area for intraday confirmation entries.",
    timeAgo:      "2h ago",
    publishedAt:  "06:15 AM UTC",
    readMin:      4,
    confidence:   74,
    isProOnly:    false,
    isHistorical: false,
  },
  {
    id:           2,
    asset:        "GOLD",
    category:     "Metals",
    direction:    "Bullish",
    biasType:     "Fundamental Outlook",
    summary:      "Geopolitical risk premium and a pause in real yield gains continue to support Gold. CPI data due Thursday is the next major fundamental catalyst.",
    detail:       "Fundamental bias: long-side. Key support at 2,318 — a close below invalidates the setup.",
    timeAgo:      "3h ago",
    publishedAt:  "06:15 AM UTC",
    readMin:      5,
    confidence:   79,
    isProOnly:    false,
    isHistorical: false,
  },

  // ── Today's ICT Biases (locked for free users) ────────────────────────────
  {
    id:           3,
    asset:        "GBP/USD",
    category:     "Forex",
    direction:    "Bearish",
    biasType:     "ICT Bias — Today",
    summary:      "Bearish OB at 1.2738–1.2754 sitting directly above price. A retest into this zone with a rejection sets up a clean short targeting the 1.2680 BSL pool.",
    detail:       "Daily FVG at 1.2695 acting as a draw on liquidity. SL above 1.2760 for tight risk management.",
    timeAgo:      "2h ago",
    publishedAt:  "06:15 AM UTC",
    readMin:      6,
    confidence:   81,
    isProOnly:    true,
    isHistorical: false,
  },
  {
    id:           4,
    asset:        "BTC/USD",
    category:     "Crypto",
    direction:    "Bullish",
    biasType:     "ICT Bias — Today",
    summary:      "Weekly FVG between 66,200–67,100 provided a clean mitigation. Expecting displacement higher toward the 70,400 buyside liquidity as the primary draw on price.",
    detail:       "Only long-bias setups in play today. Any sell below 65,800 invalidates the weekly bullish narrative.",
    timeAgo:      "2h ago",
    publishedAt:  "06:15 AM UTC",
    readMin:      7,
    confidence:   77,
    isProOnly:    true,
    isHistorical: false,
  },

  // ── Yesterday's ICT Biases (auto-unlocked as historical accuracy proof) ────
  {
    id:           5,
    asset:        "US500",
    category:     "Indices",
    direction:    "Bullish",
    biasType:     "ICT Bias — Yesterday",
    summary:      "Price swept the 5,198 sell-side liquidity in the London session then delivered a full bullish displacement into New York open. Bias played out for +38 pts.",
    detail:       "Confirmation came via the 15-min MSS at 5,210. Entry at the FVG retest, target hit at 5,248.",
    timeAgo:      "Yesterday",
    publishedAt:  "06:15 AM UTC · Apr 13",
    readMin:      5,
    confidence:   88,
    isProOnly:    true,
    isHistorical: true,
  },
  {
    id:           6,
    asset:        "OIL (WTI)",
    category:     "Commodities",
    direction:    "Bearish",
    biasType:     "ICT Bias — Yesterday",
    summary:      "Bearish OB at 87.40–87.65 was mitigated perfectly in early London. Price delivered a sharp sell-off into the 84.90 void — a textbook ICT delivery.",
    detail:       "The session closed at 85.10, capturing 90% of the projected move. Bias accuracy: confirmed.",
    timeAgo:      "Yesterday",
    publishedAt:  "06:15 AM UTC · Apr 13",
    readMin:      4,
    confidence:   91,
    isProOnly:    true,
    isHistorical: true,
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

function isCardLocked(insight: Insight): boolean {
  return insight.isProOnly && !insight.isHistorical && !HAS_ACTIVE_SUBSCRIPTION;
}

// ─── DIRECTION BADGE ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const { Icon, badgeCls } = DIRECTION_MAP[direction];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}>
      <Icon size={11} strokeWidth={2.5} />
      {direction}
    </span>
  );
}

// ─── CONFIDENCE BAR ───────────────────────────────────────────────────────────

function ConfidenceBar({
  value,
  barCls,
  blurred,
}: {
  value:   number;
  barCls:  string;
  blurred: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 transition-all ${blurred ? "blur-sm select-none" : ""}`}>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right font-mono text-[9px] font-medium text-zinc-600">
        {value}%
      </span>
    </div>
  );
}

// ─── CARD-LEVEL LOCK BANNER ───────────────────────────────────────────────────
// A compact glassmorphism strip rendered INSIDE the card body above the
// blurred content. Not a full overlay — intentionally small and inline.

function CardLockBanner() {
  return (
    <div
      className="
        relative z-10 mb-3
        flex items-center justify-between gap-3
        overflow-hidden rounded-xl
        border border-amber-500/20
        bg-zinc-900/70 backdrop-blur-md
        px-3.5 py-2.5
      "
    >
      {/* Warm ambient glow behind the lock icon */}
      <div className="pointer-events-none absolute -left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-amber-500/15 blur-2xl" />

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10">
          <Lock size={11} className="text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[11px] font-bold leading-none text-white">Pro Insight</p>
          <p className="mt-0.5 text-[10px] font-light leading-tight text-zinc-500">
            Upgrade to unlock today's ICT bias
          </p>
        </div>
      </div>

      <Link
        href="/upgrade"
        className="
          relative shrink-0 flex items-center gap-1
          rounded-lg border border-amber-500/30 bg-amber-500/10
          px-2.5 py-1
          text-[10px] font-bold text-amber-400
          transition-all duration-150
          hover:bg-amber-500/20 hover:border-amber-500/50
        "
      >
        <Sparkles size={8} />
        Unlock
      </Link>
    </div>
  );
}

// ─── PAST PRO BIAS BADGE ──────────────────────────────────────────────────────
// Shows on historical ICT cards. Tells free users "this was premium yesterday"
// and builds trust in the quality of the paid content.

function PastProBadge() {
  return (
    <span
      className="
        inline-flex items-center gap-1 rounded-md border
        border-violet-500/25 bg-violet-500/10
        px-1.5 py-0.5
        text-[9px] font-bold uppercase tracking-wide text-violet-400
      "
    >
      <History size={8} strokeWidth={2.5} />
      Past Pro Bias
    </span>
  );
}

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const dir    = DIRECTION_MAP[insight.direction];
  const catCls = CATEGORY_STYLE[insight.category];
  const locked = isCardLocked(insight);

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
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className={`
          flex items-start justify-between gap-3
          border-b border-zinc-800/60
          bg-gradient-to-r ${dir.headerGlow} to-transparent
          px-4 py-3.5
        `}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-bold tracking-tight text-white">
              {insight.asset}
            </h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${catCls}`}>
              {insight.category}
            </span>
            {/* Past Pro badge shown on historical ICT cards */}
            {insight.isHistorical && <PastProBadge />}
          </div>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {insight.biasType}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          <DirectionBadge direction={insight.direction} />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-4 py-4">

        {/* Card-level lock banner — only for today's locked Pro cards */}
        {locked && <CardLockBanner />}

        {/* Summary — blurred when locked */}
        <p
          className={`
            flex-1 text-[12.5px] font-light leading-relaxed text-zinc-400
            transition-all duration-200
            ${locked ? "blur-sm select-none" : ""}
          `}
        >
          {insight.summary}
        </p>

        {/* Detail line — blurred when locked */}
        <p
          className={`
            mt-2 text-[11px] font-light leading-relaxed text-zinc-600
            transition-all duration-200
            ${locked ? "blur-sm select-none" : ""}
          `}
        >
          {insight.detail}
        </p>

        {/* Historical proof strip — only on unlocked past ICT cards */}
        {insight.isHistorical && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-2">
            <CheckCircle size={10} className="mt-px shrink-0 text-violet-400" strokeWidth={2} />
            <p className="text-[10px] font-light leading-relaxed text-zinc-500">
              This Pro bias was published on{" "}
              <span className="font-medium text-zinc-400">{insight.publishedAt}</span>.
              {" "}Now unlocked as historical accuracy proof.
            </p>
          </div>
        )}

        {/* Confidence bar — blurred when locked */}
        <div className="mt-4">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">
            Bias Confidence
          </p>
          <ConfidenceBar
            value={insight.confidence}
            barCls={dir.barCls}
            blurred={locked}
          />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
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

        {locked ? (
          /* Locked footer CTA */
          <Link
            href="/upgrade"
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-400/80 transition-colors hover:text-amber-400"
          >
            <Lock size={9} />
            Upgrade
          </Link>
        ) : (
          /* Unlocked — Read Insight becomes a sky pill on group-hover */
          <Link
            href={`/insights/${insight.id}`}
            className="
              flex items-center gap-1.5
              rounded-lg border border-sky-500/0
              px-2.5 py-1
              text-[11px] font-semibold text-sky-400
              transition-all duration-150
              group-hover:border-sky-500/30 group-hover:bg-sky-500/10
            "
          >
            Read Insight
            <ArrowRight size={10} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Assets Covered", value: "20",      icon: BarChart2,   iconCls: "text-sky-400",    bgCls: "bg-sky-500/10"     },
  { label: "Insights Today",  value: "6",       icon: CheckCircle, iconCls: "text-emerald-400", bgCls: "bg-emerald-500/10" },
  { label: "Session Bias",    value: "Bullish", icon: TrendingUp,  iconCls: "text-emerald-400", bgCls: "bg-emerald-500/10" },
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
              className="flex min-w-[148px] shrink-0 items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5 sm:min-w-0 sm:flex-1"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bgCls}`}>
                <Icon size={14} className={s.iconCls} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{s.value}</p>
                <p className="truncate text-[10px] text-zinc-600">{s.label}</p>
              </div>
            </div>
          );
        })}
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

  const lockedCount = INSIGHTS.filter(isCardLocked).length;

  return (
    <div className="relative overflow-x-hidden">

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.04] blur-[120px] md:left-[calc(50%+110px)]" />

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
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-1.5 text-[10px] font-medium text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · {INSIGHTS.length} Insights
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400"
              title="Refresh feed"
            >
              <RefreshCw size={13} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* ── [B] STATS BAR ─────────────────────────────────────────────── */}
        <StatsBar />

        {/* ── [C] CATEGORY FILTER ───────────────────────────────────────── */}
        <div className="-mx-4 mb-6 sm:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(({ label, icon: Icon }) => {
              const isActive = activeFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setActiveFilter(label)}
                  className={`
                    flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5
                    text-[11px] font-semibold transition-all duration-150
                    ${isActive
                      ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_14px_rgba(14,165,233,0.15)]"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }
                  `}
                >
                  <Icon size={11} strokeWidth={isActive ? 2.2 : 1.75} className={isActive ? "text-sky-400" : "text-zinc-700"} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── [D] CONTENT KEY (free users only) ────────────────────────── */}
        {/* A quick visual legend so free users immediately understand     */}
        {/* what each card tier means before they scroll into the grid.    */}
        {!HAS_ACTIVE_SUBSCRIPTION && (
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
              Content Key
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              Fundamental — Always Free
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Lock size={9} className="text-amber-400 shrink-0" />
              Today's ICT — Pro Only
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <History size={9} className="text-violet-400 shrink-0" />
              Past Pro Bias — Free After 24h
            </span>
          </div>
        )}

        {/* ── [E] INSIGHT CARDS GRID ────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-20 text-center">
            <BarChart2 size={28} className="mb-3 text-zinc-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">No insights for this category today.</p>
            <p className="mt-1 text-xs text-zinc-700">Try a different filter or check back tomorrow.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}

        {/* ── [F] BOTTOM UPGRADE NUDGE (free users with locked cards) ────── */}
        {!HAS_ACTIVE_SUBSCRIPTION && lockedCount > 0 && (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent px-6 py-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
                <Lock size={15} className="text-amber-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">
                  Today's ICT setups are locked.
                </p>
                <p className="text-[11px] font-light text-zinc-600">
                  Upgrade to access{" "}
                  <span className="font-medium text-zinc-400">
                    {lockedCount} live daily ICT biases
                  </span>
                  {" "}— published every morning before market open.
                </p>
              </div>
            </div>
            <Link
              href="/upgrade"
              className="group flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[12px] font-semibold text-amber-400 transition-all duration-150 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]"
            >
              <Sparkles size={12} />
              Upgrade to Pro
              <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {/* ── [G] SUBSCRIBED CONFIRMATION STRIP ────────────────────────── */}
        {HAS_ACTIVE_SUBSCRIPTION && (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-transparent px-6 py-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">You have full Pro access</p>
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