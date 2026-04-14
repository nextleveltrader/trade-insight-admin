"use client";

// src/app/(user)/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Market Feed / Dashboard Page
//
// Design system: "Precision Minimalism"
//   bg-zinc-950 · Outfit font · sky-500 / amber-500 accents
//   Every detail — spacing, type scale, border opacity — mirrors the
//   landing page and the sidebar we built in the previous step.
//
// Sections:
//   [A] Page Header       — dynamic date + live badge
//   [B] Stats Bar         — 3 quick metrics (assets, published, session)
//   [C] Category Filter   — scrollable pill-tab row
//   [D] Insight Cards     — responsive 1→2→3 grid
//       └─ Locked variant — blur + glassmorphism paywall overlay
//   [E] Bottom CTA        — subtle upgrade nudge for free users
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
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Direction = "Bullish" | "Bearish" | "Neutral";
type Category  = "Forex" | "Crypto" | "Indices" | "Commodities" | "Metals";

interface Insight {
  id:        number;
  asset:     string;
  category:  Category;
  direction: Direction;
  biasType:  string;           // e.g. "ICT Bias" | "Fundamental Outlook"
  summary:   string;
  detail:    string;           // second sentence, shown in card body
  timeAgo:   string;
  readMin:   number;
  locked:    boolean;
  confidence: number;          // 0–100, shown as a tiny progress bar
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
    locked:     false,
    confidence: 82,
  },
  {
    id:         2,
    asset:      "GOLD",
    category:   "Metals",
    direction:  "Bullish",
    biasType:   "Fundamental Outlook",
    summary:    "Softer USD and dovish Fed tone continue to support Gold's upward bias. Upcoming CPI release is the key risk event.",
    detail:     "Fundamental backdrop remains constructive. Watch the 2,345 support confluence for long entries.",
    timeAgo:    "3h ago",
    readMin:    5,
    locked:     false,
    confidence: 76,
  },
  {
    id:         3,
    asset:      "GBP/USD",
    category:   "Forex",
    direction:  "Neutral",
    biasType:   "Fundamental Bias",
    summary:    "BoE's cautious stance and sticky UK inflation create a mixed fundamental picture. Dollar strength risk from NFP limits conviction.",
    detail:     "No clear directional edge today. Sit on hands or wait for a 4H confirmation break above 1.2750.",
    timeAgo:    "4h ago",
    readMin:    3,
    locked:     false,
    confidence: 48,
  },
  {
    id:         4,
    asset:      "BTC/USD",
    category:   "Crypto",
    direction:  "Bearish",
    biasType:   "ICT Bias",
    summary:    "Price swept the weekly highs at 71,400 and is showing signs of distribution. Bearish OB at 70,800–71,200.",
    detail:     "Sellside liquidity pools resting at 68,900. Intraday bias: short from OB retest with SL above 71,450.",
    timeAgo:    "5h ago",
    readMin:    6,
    locked:     true,
    confidence: 71,
  },
  {
    id:         5,
    asset:      "US500",
    category:   "Indices",
    direction:  "Bullish",
    biasType:   "Fundamental Outlook",
    summary:    "Strong earnings season and cooling inflation data underpin the bullish macro backdrop for US equities heading into Q2.",
    detail:     "Key level: 5,240 must hold as support. Bias remains long on dips into the 5,210–5,225 demand zone.",
    timeAgo:    "6h ago",
    readMin:    5,
    locked:     true,
    confidence: 68,
  },
  {
    id:         6,
    asset:      "OIL (WTI)",
    category:   "Commodities",
    direction:  "Bearish",
    biasType:   "Fundamental Bias",
    summary:    "OPEC+ supply uncertainty and rising US inventory data weigh on crude. Demand outlook from China remains a headwind.",
    detail:     "Price rejected the 87.50 resistance cleanly. Bearish bias targets 84.20 then 82.80 in the near-term.",
    timeAgo:    "7h ago",
    readMin:    4,
    locked:     false,
    confidence: 60,
  },
];

// ─── FILTER CATEGORIES ────────────────────────────────────────────────────────

type FilterLabel = "All" | Category;

const FILTERS: { label: FilterLabel; icon: React.ElementType }[] = [
  { label: "All",         icon: BarChart2  },
  { label: "Forex",       icon: Globe      },
  { label: "Crypto",      icon: Bitcoin    },
  { label: "Indices",     icon: LineChart  },
  { label: "Commodities", icon: Zap        },
  { label: "Metals",      icon: Gem        },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

// Direction config map
const DIRECTION_MAP: Record<
  Direction,
  {
    Icon:        React.ElementType;
    badgeCls:    string;
    barCls:      string;
    glowCls:     string;
    borderCls:   string;
    headerGlow:  string;
  }
> = {
  Bullish: {
    Icon:       TrendingUp,
    badgeCls:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls:     "bg-emerald-400",
    glowCls:    "shadow-emerald-500/20",
    borderCls:  "hover:border-emerald-500/30",
    headerGlow: "from-emerald-500/[0.05]",
  },
  Bearish: {
    Icon:       TrendingDown,
    badgeCls:   "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls:     "bg-rose-400",
    glowCls:    "shadow-rose-500/20",
    borderCls:  "hover:border-rose-500/30",
    headerGlow: "from-rose-500/[0.05]",
  },
  Neutral: {
    Icon:       Minus,
    badgeCls:   "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls:     "bg-zinc-500",
    glowCls:    "shadow-zinc-500/10",
    borderCls:  "hover:border-zinc-600/40",
    headerGlow: "from-zinc-700/[0.05]",
  },
};

const CATEGORY_STYLE: Record<Category, string> = {
  Forex:       "text-sky-400    bg-sky-500/10    border-sky-500/20",
  Crypto:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Indices:     "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Commodities: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Metals:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

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

function ConfidenceBar({ value, barCls }: { value: number; barCls: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barCls}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-7 text-right text-[9px] font-mono font-medium text-zinc-600">
        {value}%
      </span>
    </div>
  );
}

// ─── PAYWALL OVERLAY ──────────────────────────────────────────────────────────

function PaywallOverlay() {
  return (
    <div
      className="
        absolute inset-0 z-20
        flex flex-col items-center justify-center
        rounded-2xl
        bg-zinc-950/30 backdrop-blur-[2px]
      "
    >
      {/* Glassmorphism card */}
      <div
        className="
          mx-4 w-full max-w-[220px]
          overflow-hidden rounded-xl
          border border-white/[0.09]
          bg-zinc-900/70 backdrop-blur-xl
          shadow-2xl
          px-5 py-5
          text-center
        "
      >
        {/* Lock icon with amber glow */}
        <div className="mb-3 flex justify-center">
          <div
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl
              border border-amber-500/25
              bg-amber-500/10
              shadow-[0_0_18px_rgba(245,158,11,0.25)]
            "
          >
            <Lock size={18} className="text-amber-400" strokeWidth={2} />
          </div>
        </div>

        <p className="mb-0.5 text-[13px] font-semibold text-white">
          Pro Analysis
        </p>
        <p className="mb-4 text-[10px] font-light leading-relaxed text-zinc-500">
          Full bias breakdown and ICT confluences are locked.
        </p>

        <Link
          href="/upgrade"
          className="
            group flex w-full items-center justify-center gap-1.5
            rounded-lg bg-amber-500/15
            border border-amber-500/30
            px-3 py-2
            text-[11px] font-semibold text-amber-400
            transition-all duration-150
            hover:bg-amber-500/25 hover:border-amber-500/50
            hover:shadow-[0_0_14px_rgba(245,158,11,0.2)]
          "
        >
          <Sparkles size={10} />
          Start 14-Day Trial
          <ArrowRight
            size={10}
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  );
}

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const dir    = DIRECTION_MAP[insight.direction];
  const catCls = CATEGORY_STYLE[insight.category];

  return (
    <article
      className={`
        group relative flex flex-col overflow-hidden
        rounded-2xl border border-zinc-800/70
        bg-zinc-900/40
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-zinc-700/60
        hover:bg-zinc-900/70
        hover:shadow-xl ${dir.glowCls} ${dir.borderCls}
      `}
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* ── Top header band with direction-tinted gradient ─────────────── */}
      <div
        className={`
          relative flex items-start justify-between gap-3
          border-b border-zinc-800/60
          bg-gradient-to-r ${dir.headerGlow} to-transparent
          px-4 py-3.5
        `}
      >
        {/* Left: asset + category */}
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

        {/* Right: direction badge */}
        <div className="shrink-0 pt-0.5">
          <DirectionBadge direction={insight.direction} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col px-4 py-4">

        {/* Blurred text region for locked cards */}
        <div className={`flex-1 ${insight.locked ? "select-none" : ""}`}>
          <p
            className={`
              text-[12.5px] font-light leading-relaxed text-zinc-400
              ${insight.locked ? "blur-sm" : ""}
              transition-all
            `}
          >
            {insight.summary}
          </p>

          {/* Detail line — shown only when unlocked */}
          {!insight.locked && (
            <p className="mt-2 text-[11px] font-light leading-relaxed text-zinc-600">
              {insight.detail}
            </p>
          )}

          {/* Locked: extra blurred detail placeholder lines */}
          {insight.locked && (
            <div className="mt-2 space-y-1.5 blur-sm">
              <div className="h-2.5 w-4/5 rounded-full bg-zinc-700/40" />
              <div className="h-2.5 w-3/5 rounded-full bg-zinc-700/30" />
            </div>
          )}
        </div>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-700">
              Bias Confidence
            </span>
          </div>
          <ConfidenceBar
            value={insight.locked ? 0 : insight.confidence}
            barCls={dir.barCls}
          />
        </div>

        {/* Paywall overlay (locked only) */}
        {insight.locked && <PaywallOverlay />}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div
        className="
          flex items-center justify-between
          border-t border-zinc-800/60
          px-4 py-3
        "
      >
        {/* Meta */}
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

        {/* CTA */}
        {insight.locked ? (
          <Link
            href="/upgrade"
            className="
              flex items-center gap-1
              text-[11px] font-semibold text-amber-400/80
              transition-colors hover:text-amber-400
            "
          >
            <Lock size={9} />
            Unlock
          </Link>
        ) : (
          <Link
            href={`/insights/${insight.id}`}
            className="
              flex items-center gap-1
              text-[11px] font-medium text-sky-400
              opacity-0 transition-all duration-150
              group-hover:opacity-100
            "
          >
            Read Insight
            <ArrowRight
              size={10}
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Assets Covered",   value: "20",        sub: "Updated daily",         icon: BarChart2,  iconCls: "text-sky-400",    bgCls: "bg-sky-500/10"    },
  { label: "Insights Today",   value: "20",         sub: "Before market open",    icon: CheckCircle, iconCls: "text-emerald-400", bgCls: "bg-emerald-500/10" },
  { label: "Session Bias",     value: "Bullish",   sub: "Macro consensus",       icon: TrendingUp, iconCls: "text-emerald-400", bgCls: "bg-emerald-500/10" },
];

function StatsBar() {
  return (
    <div className="mb-8 grid grid-cols-3 gap-3">
      {STATS.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="
              flex items-center gap-3
              rounded-xl border border-zinc-800/60
              bg-zinc-900/40 px-4 py-3.5
            "
          >
            <div
              className={`
                hidden sm:flex h-8 w-8 shrink-0 items-center justify-center
                rounded-lg ${s.bgCls}
              `}
            >
              <Icon size={15} className={s.iconCls} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-white sm:text-xs">
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
  );
}

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────

export default function MarketFeedPage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");

  const filtered =
    activeFilter === "All"
      ? INSIGHTS
      : INSIGHTS.filter((i) => i.category === activeFilter);

  const publishedAt = "06:15 AM UTC"; // would come from DB in production

  return (
    <>
      {/* Subtle page-level ambient glow */}
      <div
        className="
          pointer-events-none fixed left-[50%] top-[30%]
          h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2
          rounded-full bg-sky-500/[0.04] blur-[120px]
          md:left-[calc(50%+110px)]
        "
      />

      <div className="relative">

        {/* ── [A] PAGE HEADER ─────────────────────────────────────────────── */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* Dynamic date */}
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              {formatDate()}
            </p>
            <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Today's{" "}
              <span className="text-sky-400">Market Bias</span>
            </h1>
            <p className="mt-1 text-[11px] font-light text-zinc-600">
              Published at{" "}
              <span className="font-medium text-zinc-500">{publishedAt}</span>
              {" "}— before the session opens.
            </p>
          </div>

          {/* Right: live badge + refresh hint */}
          <div className="flex shrink-0 items-center gap-3">
            <div
              className="
                flex items-center gap-2 rounded-full
                border border-emerald-500/20
                bg-emerald-500/[0.06]
                px-3.5 py-1.5
                text-[10px] font-medium text-emerald-400
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
                rounded-lg border border-zinc-800
                bg-zinc-900/60 text-zinc-600
                transition-colors hover:border-zinc-700 hover:text-zinc-400
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
        <div className="mb-6 -mx-4 sm:mx-0">
          <div
            className="
              flex items-center gap-2
              overflow-x-auto px-4 sm:px-0
              pb-1
              scrollbar-none
              [&::-webkit-scrollbar]:hidden
            "
          >
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

        {/* ── [D] INSIGHT CARDS GRID ────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-20 text-center">
            <BarChart2 size={28} className="mb-3 text-zinc-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">No insights for this category today.</p>
            <p className="mt-1 text-xs text-zinc-700">Check back tomorrow or select a different filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        )}

        {/* ── [E] BOTTOM UPGRADE NUDGE ──────────────────────────────────── */}
        <div
          className="
            mt-10 flex flex-col items-center justify-between gap-4
            rounded-2xl border border-amber-500/15
            bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent
            px-6 py-5
            sm:flex-row
          "
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
              <Sparkles size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">
                2 insights are locked behind Pro
              </p>
              <p className="text-[11px] font-light text-zinc-600">
                Upgrade to access full ICT breakdowns, confluence maps, and historical data.
              </p>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="
              group flex shrink-0 items-center gap-2
              rounded-xl border border-amber-500/30
              bg-amber-500/10 px-5 py-2.5
              text-[12px] font-semibold text-amber-400
              transition-all duration-150
              hover:bg-amber-500/20 hover:border-amber-500/50
              hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]
            "
          >
            Start 14-Day Free Trial
            <ArrowRight
              size={12}
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

      </div>
    </>
  );
}