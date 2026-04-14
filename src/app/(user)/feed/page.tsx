"use client";

// src/app/(user)/feed/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Market Feed  v8  "Bookmark-Aware Cards"
//
// v8 changes vs v7 (layout UNCHANGED):
//
//   [SAVE] PER-CARD BOOKMARK ICON
//     • Both mobile list-item and desktop card now have a small Bookmark
//       button in the top-right corner of the header row.
//     • Uses useOptimistic + useTransition inside InsightCard so the icon
//       flips to BookmarkCheck (amber glow) with zero perceived latency.
//     • Initial saved state is hydrated from D1 via getSavedPostIds() in a
//       useEffect on mount, then passed down as `initialIsSaved` per card.
//
//   [ICON] subtle zinc-600 at rest → amber-400 glow when active.
//          Active state: border-amber-500/25 bg-amber-500/10 text-amber-400.
//          Idle state:   transparent border, text-zinc-600, hover→zinc-400.
//
//   [KEEP] All v7 grid/gap/overflow behaviour unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useOptimistic, useTransition } from "react";
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
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { toggleSaveInsight, getSavedPostIds } from "@/actions/save-insight";

// ─── SUBSCRIPTION GATE ────────────────────────────────────────────────────────
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
  isProOnly:    boolean;
  isHistorical: boolean;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INSIGHTS: Insight[] = [
  {
    id: 1, asset: "EUR/USD", category: "Forex", direction: "Bullish",
    biasType: "Fundamental Bias",
    summary: "Softer USD tone following yesterday's weaker ISM Services data underpins the Euro. ECB speak today could amplify the move if rhetoric turns less dovish.",
    detail: "Macro backdrop supports dip-buying. Watch the 1.0870 demand area for intraday confirmation entries.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 4, confidence: 74,
    isProOnly: false, isHistorical: false,
  },
  {
    id: 2, asset: "GOLD", category: "Metals", direction: "Bullish",
    biasType: "Fundamental Outlook",
    summary: "Geopolitical risk premium and a pause in real yield gains continue to support Gold. CPI data due Thursday is the next major fundamental catalyst.",
    detail: "Fundamental bias: long-side. Key support at 2,318 — a close below invalidates the setup.",
    timeAgo: "3h ago", publishedAt: "06:15 AM UTC", readMin: 5, confidence: 79,
    isProOnly: false, isHistorical: false,
  },
  {
    id: 3, asset: "GBP/USD", category: "Forex", direction: "Bearish",
    biasType: "ICT Bias — Today",
    summary: "Bearish OB at 1.2738–1.2754 sitting directly above price. A retest into this zone with rejection sets up a clean short targeting the 1.2680 BSL pool.",
    detail: "Daily FVG at 1.2695 acting as a draw on liquidity. SL above 1.2760 for tight risk management.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 6, confidence: 81,
    isProOnly: true, isHistorical: false,
  },
  {
    id: 4, asset: "BTC/USD", category: "Crypto", direction: "Bullish",
    biasType: "ICT Bias — Today",
    summary: "Weekly FVG between 66,200–67,100 provided a clean mitigation. Expecting displacement higher toward the 70,400 buyside liquidity as the primary draw on price.",
    detail: "Only long-bias setups in play today. Any sell below 65,800 invalidates the weekly bullish narrative.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 7, confidence: 77,
    isProOnly: true, isHistorical: false,
  },
  {
    id: 5, asset: "US500", category: "Indices", direction: "Bullish",
    biasType: "ICT Bias — Yesterday",
    summary: "Price swept the 5,198 sell-side liquidity in the London session then delivered a full bullish displacement into New York open. Bias played out for +38 pts.",
    detail: "Confirmation came via the 15-min MSS at 5,210. Entry at the FVG retest, target hit at 5,248.",
    timeAgo: "Yesterday", publishedAt: "06:15 AM UTC · Apr 13", readMin: 5, confidence: 88,
    isProOnly: true, isHistorical: true,
  },
  {
    id: 6, asset: "OIL (WTI)", category: "Commodities", direction: "Bearish",
    biasType: "ICT Bias — Yesterday",
    summary: "Bearish OB at 87.40–87.65 was mitigated perfectly in early London. Price delivered a sharp sell-off into the 84.90 void — a textbook ICT delivery.",
    detail: "The session closed at 85.10, capturing 90% of the projected move. Bias accuracy: confirmed.",
    timeAgo: "Yesterday", publishedAt: "06:15 AM UTC · Apr 13", readMin: 4, confidence: 91,
    isProOnly: true, isHistorical: true,
  },
];

// ─── FILTER TABS ──────────────────────────────────────────────────────────────

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
    Icon: React.ElementType;
    badgeCls: string; barCls: string;
    glowCls: string; borderHover: string; headerGlow: string;
  }
> = {
  Bullish: {
    Icon: TrendingUp,
    badgeCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls: "bg-emerald-400", glowCls: "sm:hover:shadow-emerald-500/20",
    borderHover: "sm:hover:border-emerald-500/30", headerGlow: "from-emerald-500/[0.05]",
  },
  Bearish: {
    Icon: TrendingDown,
    badgeCls: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls: "bg-rose-400", glowCls: "sm:hover:shadow-rose-500/20",
    borderHover: "sm:hover:border-rose-500/30", headerGlow: "from-rose-500/[0.05]",
  },
  Neutral: {
    Icon: Minus,
    badgeCls: "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls: "bg-zinc-500", glowCls: "sm:hover:shadow-zinc-500/10",
    borderHover: "sm:hover:border-zinc-600/40", headerGlow: "from-zinc-700/[0.05]",
  },
};

const CATEGORY_STYLE: Record<Category, string> = {
  Forex:       "text-sky-400    bg-sky-500/10    border-sky-500/20",
  Crypto:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Indices:     "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Commodities: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Metals:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function isCardLocked(i: Insight) {
  return i.isProOnly && !i.isHistorical && !HAS_ACTIVE_SUBSCRIPTION;
}

// ─── MICRO-COMPONENTS ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const { Icon, badgeCls } = DIRECTION_MAP[direction];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${badgeCls}`}>
      <Icon size={10} strokeWidth={2.5} />
      {direction}
    </span>
  );
}

function ConfidenceBar({
  value,
  barCls,
  blurred,
}: {
  value: number;
  barCls: string;
  blurred: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 transition-all ${blurred ? "blur-sm select-none" : ""}`}>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-[9px] font-medium text-zinc-600">{value}%</span>
    </div>
  );
}

// ─── CARD LOCK BANNER ─────────────────────────────────────────────────────────

function CardLockBanner() {
  return (
    <div
      className="
        relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2
        overflow-hidden rounded-xl
        border border-amber-500/20 bg-zinc-900/70 backdrop-blur-md
        px-3 py-2
      "
    >
      <div className="pointer-events-none absolute -left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-amber-500/15 blur-xl" />
      <div className="relative flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10">
          <Lock size={10} className="text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[10.5px] font-bold leading-none text-white">Pro Insight</p>
          <p className="mt-0.5 text-[9.5px] font-light leading-tight text-zinc-500">
            Upgrade to unlock today's ICT bias
          </p>
        </div>
      </div>
      <Link
        href="/upgrade"
        className="
          relative flex items-center gap-1 rounded-lg border border-amber-500/30
          bg-amber-500/10 px-2 py-0.5 text-[9.5px] font-bold text-amber-400
          transition-all hover:bg-amber-500/20
        "
      >
        <Sparkles size={7} />
        Unlock
      </Link>
    </div>
  );
}

function PastProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
      <History size={8} strokeWidth={2.5} />
      Past Pro
    </span>
  );
}

// ─── CARD BOOKMARK BUTTON ─────────────────────────────────────────────────────
//
// Self-contained: owns its own useOptimistic + useTransition so the icon
// flips synchronously on click without waiting for the D1 round-trip.
//
// Styling intent:
//   • Idle   → text-zinc-600,  transparent bg/border  (barely visible)
//   • Hover  → text-zinc-400  (soft lift, no heavy chrome)
//   • Active → text-amber-400 + amber glow ring        (warm bookmark gold)
//   • isPending → slight opacity reduction signals in-flight write

function CardBookmarkButton({
  insightId,
  initialIsSaved,
}: {
  insightId: number;
  initialIsSaved: boolean;
}) {
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(
    initialIsSaved,
    (_: boolean, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // Prevent the click from propagating to a parent <Link> or card.
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved);
      await toggleSaveInsight(insightId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={optimisticSaved ? "Remove bookmark" : "Save insight"}
      className={`
        flex h-6 w-6 shrink-0 items-center justify-center rounded-lg
        border transition-all duration-150
        ${isPending ? "opacity-50" : ""}
        ${optimisticSaved
          ? "border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.18)]"
          : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-700/50 hover:text-zinc-400"
        }
      `}
    >
      {optimisticSaved
        ? <BookmarkCheck size={11} strokeWidth={2.2} />
        : <Bookmark      size={11} strokeWidth={1.75} />
      }
    </button>
  );
}

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  initialIsSaved,
}: {
  insight: Insight;
  initialIsSaved: boolean;
}) {
  const dir    = DIRECTION_MAP[insight.direction];
  const catCls = CATEGORY_STYLE[insight.category];
  const locked = isCardLocked(insight);

  return (
    <article
      className={`
        group flex flex-col
        sm:overflow-hidden sm:rounded-2xl
        sm:border sm:border-zinc-800/70 sm:bg-zinc-900/40
        sm:transition-all sm:duration-200
        sm:hover:-translate-y-0.5 sm:hover:border-zinc-700/60
        sm:hover:bg-zinc-900/70 sm:hover:shadow-xl
        ${dir.glowCls} ${dir.borderHover}
      `}
    >

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE LIST ITEM  — hidden on sm+
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="
          flex flex-col px-4 py-4 sm:hidden
          bg-zinc-900/30
          border-t border-zinc-800/40
          border-b-[6px] border-b-zinc-950
        "
      >

        {/* Row 1 ── Asset · Category · [Past Pro] · Direction · Bookmark */}
        <div className="flex items-center gap-1.5">
          <h3 className="shrink-0 text-[13.5px] font-bold tracking-tight text-white">
            {insight.asset}
          </h3>
          <span className={`shrink-0 rounded border px-1 py-px text-[8px] font-bold uppercase tracking-wide ${catCls}`}>
            {insight.category}
          </span>
          {insight.isHistorical && (
            <span className="shrink-0">
              <PastProBadge />
            </span>
          )}
          {/* Direction badge + bookmark pushed to right */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <DirectionBadge direction={insight.direction} />
            <CardBookmarkButton insightId={insight.id} initialIsSaved={initialIsSaved} />
          </div>
        </div>

        {/* Row 2 ── Bias type label */}
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
          {insight.biasType}
        </p>

        {locked && (
          <div className="mt-2.5">
            <CardLockBanner />
          </div>
        )}

        <p
          className={`
            mt-2 text-[11.5px] font-light leading-relaxed text-zinc-400
            ${locked ? "blur-sm select-none" : ""}
            transition-all duration-200
          `}
        >
          {insight.summary}
        </p>

        {insight.isHistorical && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2 py-1.5">
            <CheckCircle size={9} className="mt-px shrink-0 text-violet-400" strokeWidth={2} />
            <p className="text-[9.5px] font-light leading-relaxed text-zinc-500">
              Published{" "}
              <span className="font-medium text-zinc-400">{insight.publishedAt}</span>
              {" "}· Now free.
            </p>
          </div>
        )}

        <div className="mt-2.5">
          <p className="mb-1 text-[8px] font-semibold uppercase tracking-widest text-zinc-700">
            Confidence
          </p>
          <ConfidenceBar value={insight.confidence} barCls={dir.barCls} blurred={locked} />
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9.5px] text-zinc-700">
            <span className="flex items-center gap-1">
              <Clock size={8} />
              {insight.timeAgo}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <BookOpen size={8} />
              {insight.readMin} min
            </span>
          </div>
          {locked ? (
            <Link
              href="/upgrade"
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 transition-colors hover:text-amber-400"
            >
              <Lock size={8} />
              Upgrade
            </Link>
          ) : (
            <Link
              href={`/insights/${insight.id}`}
              className="flex items-center gap-1 text-[10px] font-semibold text-sky-400"
            >
              Read
              <ArrowRight size={9} />
            </Link>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP CARD — hidden on mobile, shown on sm+
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:flex sm:flex-1 sm:flex-col">

        {/* Card Header — asset · category · [Past Pro] | bookmark · direction */}
        <div
          className={`
            flex items-start justify-between gap-2
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
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${catCls}`}>
                {insight.category}
              </span>
              {insight.isHistorical && <PastProBadge />}
            </div>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {insight.biasType}
            </p>
          </div>

          {/* Right cluster: bookmark + direction badge */}
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <CardBookmarkButton insightId={insight.id} initialIsSaved={initialIsSaved} />
            <DirectionBadge direction={insight.direction} />
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col px-4 py-4">
          {locked && <CardLockBanner />}

          <p
            className={`
              flex-1 text-[12.5px] font-light leading-relaxed text-zinc-400
              ${locked ? "blur-sm select-none" : ""}
              transition-all duration-200
            `}
          >
            {insight.summary}
          </p>

          <p
            className={`
              mt-2 text-[11px] font-light leading-relaxed text-zinc-600
              ${locked ? "blur-sm select-none" : ""}
              transition-all duration-200
            `}
          >
            {insight.detail}
          </p>

          {insight.isHistorical && (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-1.5">
              <CheckCircle size={9} className="mt-px shrink-0 text-violet-400" strokeWidth={2} />
              <p className="text-[10px] font-light leading-relaxed text-zinc-500">
                Published on{" "}
                <span className="font-medium text-zinc-400">{insight.publishedAt}</span>
                {" "}· Now free as historical proof.
              </p>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">
              Bias Confidence
            </p>
            <ConfidenceBar value={insight.confidence} barCls={dir.barCls} blurred={locked} />
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-3 text-[10px] text-zinc-700">
            <span className="flex items-center gap-1">
              <Clock size={8} />
              {insight.timeAgo}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <BookOpen size={8} />
              {insight.readMin} min
            </span>
          </div>
          {locked ? (
            <Link
              href="/upgrade"
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 transition-colors hover:text-amber-400"
            >
              <Lock size={8} />
              Upgrade
            </Link>
          ) : (
            <Link
              href={`/insights/${insight.id}`}
              className="
                flex items-center gap-1 rounded-lg border border-sky-500/0 px-2 py-0.5
                text-[10px] font-semibold text-sky-400
                transition-all duration-150
                group-hover:border-sky-500/30 group-hover:bg-sky-500/10
              "
            >
              Read
              <ArrowRight size={9} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
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
    <div className="mb-6 w-full overflow-x-auto snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 pb-1 sm:pb-0">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="
                flex shrink-0 snap-start items-center gap-2.5
                min-w-[120px] sm:min-w-0 sm:flex-1
                px-3 py-2 sm:px-4 sm:py-3.5
                sm:rounded-xl sm:border sm:border-zinc-800/60 sm:bg-zinc-900/40
              "
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${s.bgCls}`}>
                <Icon size={13} className={s.iconCls} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-white sm:text-xs">
                  {s.value}
                </p>
                <p className="truncate text-[9px] text-zinc-600 sm:text-[10px]">
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CATEGORY FILTER ──────────────────────────────────────────────────────────

function CategoryFilter({
  activeFilter,
  onSelect,
}: {
  activeFilter: FilterLabel;
  onSelect: (l: FilterLabel) => void;
}) {
  return (
    <div className="mb-5 w-full overflow-x-auto snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 pb-1 sm:flex-wrap sm:pb-0">
        {FILTERS.map(({ label, icon: Icon }) => {
          const isActive = activeFilter === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`
                flex shrink-0 snap-start items-center gap-1 sm:gap-1.5
                rounded-full border px-3 py-1 sm:px-3.5 sm:py-1.5
                text-[10.5px] sm:text-[11px] font-semibold
                transition-all duration-150
                ${isActive
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.14)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }
              `}
            >
              <Icon size={10} strokeWidth={isActive ? 2.2 : 1.75} className={isActive ? "text-sky-400" : "text-zinc-700"} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CONTENT KEY ──────────────────────────────────────────────────────────────

function ContentKey() {
  if (HAS_ACTIVE_SUBSCRIPTION) return null;
  return (
    <div className="mb-4 w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
        <span className="mr-1.5 text-[8.5px] font-bold uppercase tracking-wider text-zinc-700">
          Key:
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-zinc-800/60 bg-zinc-900/60 px-2 py-0.5 text-[8.5px] text-zinc-500">
          <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
          Fundamental — Free
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-0.5 text-[8.5px] text-zinc-500">
          <Lock size={8} className="shrink-0 text-amber-400" />
          Today's ICT — Pro
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-2 py-0.5 text-[8.5px] text-zinc-500">
          <History size={8} className="shrink-0 text-violet-400" />
          Past Pro — Free after 24h
        </span>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function MarketFeedPage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");

  // ── Saved IDs hydration ───────────────────────────────────────────────────
  //
  // Fetch the user's saved post IDs once on mount so each InsightCard can
  // receive the correct `initialIsSaved` prop.  This drives the initial icon
  // state; per-card useOptimistic then takes over for subsequent toggles.
  //
  // Note: because toggleSaveInsight calls revalidatePath("/feed"), navigating
  // away and back will re-render this server route with a fresh HTML shell,
  // meaning this useEffect re-fires and stays in sync with D1.

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getSavedPostIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {
        // Non-fatal: if the fetch fails the icons simply start as unsaved.
        // The user can still toggle; the action will correct state on the next load.
      });
  }, []);

  const filtered =
    activeFilter === "All"
      ? INSIGHTS
      : INSIGHTS.filter((i) => i.category === activeFilter);

  const lockedCount = INSIGHTS.filter(isCardLocked).length;

  return (
    <div className="relative w-full overflow-x-hidden">

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.04] blur-[120px] md:left-[calc(50%+110px)]" />

      <div className="relative">

        {/* ── [A] HEADER ────────────────────────────────────────────────── */}
        <header className="mb-4 sm:mb-6">

          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              {formatDate()}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9.5px] font-medium text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live · {INSIGHTS.length}
              </div>
              <button
                className="hidden h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400 sm:flex"
                title="Refresh feed"
              >
                <RefreshCw size={13} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Today's{" "}
            <span className="text-sky-400">Market Bias</span>
          </h1>

          <p className="mt-0.5 hidden text-[11px] font-light text-zinc-600 sm:mt-1 sm:block">
            Published at{" "}
            <span className="font-medium text-zinc-500">06:15 AM UTC</span>
            {" "}— before the session opens.
          </p>
        </header>

        {/* ── [B] STATS BAR ─────────────────────────────────────────────── */}
        <StatsBar />

        {/* ── [C] CATEGORY FILTER ───────────────────────────────────────── */}
        <CategoryFilter activeFilter={activeFilter} onSelect={setActiveFilter} />

        {/* ── [D] CONTENT KEY ───────────────────────────────────────────── */}
        <ContentKey />

        {/* ── [E] INSIGHT FEED ──────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-16 text-center">
            <BarChart2 size={26} className="mb-2.5 text-zinc-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">No insights for this category today.</p>
            <p className="mt-0.5 text-xs text-zinc-700">Try a different filter or check back tomorrow.</p>
          </div>
        ) : (
          <div
            className="
              -mx-4
              sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4
              lg:grid-cols-3
              xl:grid-cols-4 xl:gap-5
              2xl:grid-cols-5
            "
          >
            {filtered.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                initialIsSaved={savedIds.has(insight.id)}
              />
            ))}
          </div>
        )}

        {/* ── [F] BOTTOM UPGRADE NUDGE ──────────────────────────────────── */}
        {!HAS_ACTIVE_SUBSCRIPTION && lockedCount > 0 && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent px-4 py-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 sm:h-9 sm:w-9">
                <Lock size={14} className="text-amber-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-white sm:text-[13px]">
                  Today's ICT setups are locked.
                </p>
                <p className="text-[10.5px] font-light text-zinc-600 sm:text-[11px]">
                  Upgrade to access{" "}
                  <span className="font-medium text-zinc-400">{lockedCount} live daily ICT biases</span>
                  {" "}before market open.
                </p>
              </div>
            </div>
            <Link
              href="/upgrade"
              className="
                group flex w-full items-center justify-center gap-2 sm:w-auto sm:shrink-0
                rounded-xl border border-amber-500/30 bg-amber-500/10
                px-5 py-2.5
                text-[12px] font-semibold text-amber-400
                transition-all duration-150
                hover:bg-amber-500/20 hover:border-amber-500/50
                hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]
              "
            >
              <Sparkles size={11} />
              Upgrade to Pro
              <ArrowRight size={11} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {/* ── [G] SUBSCRIBED STRIP ──────────────────────────────────────── */}
        {HAS_ACTIVE_SUBSCRIPTION && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-transparent px-4 py-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 sm:h-9 sm:w-9">
                <ShieldCheck size={15} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-white">You have full Pro access</p>
                <p className="text-[10.5px] font-light text-zinc-600">
                  All {INSIGHTS.length} insights unlocked. Publishes daily at 06:15 UTC.
                </p>
              </div>
            </div>
            <Link
              href="/settings/subscription"
              className="shrink-0 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Manage →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}