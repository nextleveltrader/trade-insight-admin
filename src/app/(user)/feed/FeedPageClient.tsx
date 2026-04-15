"use client";

// src/app/(user)/feed/FeedPageClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Market Feed  v10  "Sprint 2: Real DB Data"
//
// v10 changes vs v9:
//   [DATA] Removed the entire `INSIGHTS` mock array.
//          Now receives `insights: UIInsight[]` as a prop from the server
//          shell (feed/page.tsx) which calls getLatestInsights().
//
//   [STAT] Stats bar derives live counts from the real insights array.
//
//   [EMPTY] Proper empty states when no published posts exist in the DB
//           or no posts match the active category filter.
//
//   [KEEP] All v9 layout, animation, filter, and bookmark behaviour unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useOptimistic, useTransition } from "react";
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
import { toggleSaveInsight }                from "@/actions/save-insight";
import { UIInsight, Direction, Category }   from "@/types/content";

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface MarketFeedPageProps {
  hasAccess:       boolean;
  insights:        UIInsight[];
  initialSavedIds: number[];
}

type FilterLabel = "All" | Category;

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
  { Icon: React.ElementType; badgeCls: string; barCls: string; glowCls: string; borderHover: string; headerGlow: string }
> = {
  Bullish: {
    Icon: TrendingUp,
    badgeCls:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls:      "bg-emerald-400",
    glowCls:     "sm:hover:shadow-emerald-500/20",
    borderHover: "sm:hover:border-emerald-500/30",
    headerGlow:  "from-emerald-500/[0.05]",
  },
  Bearish: {
    Icon: TrendingDown,
    badgeCls:    "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls:      "bg-rose-400",
    glowCls:     "sm:hover:shadow-rose-500/20",
    borderHover: "sm:hover:border-rose-500/30",
    headerGlow:  "from-rose-500/[0.05]",
  },
  Neutral: {
    Icon: Minus,
    badgeCls:    "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls:      "bg-zinc-500",
    glowCls:     "sm:hover:shadow-zinc-500/10",
    borderHover: "sm:hover:border-zinc-600/40",
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function isCardLocked(insight: UIInsight, hasAccess: boolean): boolean {
  return insight.isProOnly && !insight.isHistorical && !hasAccess;
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const { Icon, badgeCls } = DIRECTION_MAP[direction];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${badgeCls}`}>
      <Icon size={10} strokeWidth={2.5} />{direction}
    </span>
  );
}

function ConfidenceBar({ value, barCls, blurred }: { value: number; barCls: string; blurred: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-all ${blurred ? "blur-sm select-none" : ""}`}>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-[9px] font-medium text-zinc-600">{value}%</span>
    </div>
  );
}

function CardLockBanner() {
  return (
    <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-900/70 backdrop-blur-md px-3 py-2">
      <div className="pointer-events-none absolute -left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-amber-500/15 blur-xl" />
      <div className="relative flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10">
          <Lock size={10} className="text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[10.5px] font-bold leading-none text-white">Pro Insight</p>
          <p className="mt-0.5 text-[9.5px] font-light leading-tight text-zinc-500">Upgrade to unlock today's ICT bias</p>
        </div>
      </div>
      <Link href="/pricing" className="relative flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9.5px] font-bold text-amber-400 transition-all hover:bg-amber-500/20">
        <Sparkles size={7} />Unlock
      </Link>
    </div>
  );
}

function PastProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
      <History size={8} strokeWidth={2.5} />Past Pro
    </span>
  );
}

// ─── BOOKMARK BUTTON ──────────────────────────────────────────────────────────

function CardBookmarkButton({ insightId, initialIsSaved }: { insightId: number; initialIsSaved: boolean }) {
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(
    initialIsSaved,
    (_: boolean, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
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
        flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-150
        ${isPending ? "opacity-50" : ""}
        ${optimisticSaved
          ? "border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.18)]"
          : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-700/50 hover:text-zinc-400"
        }
      `}
    >
      {optimisticSaved ? <BookmarkCheck size={11} strokeWidth={2.2} /> : <Bookmark size={11} strokeWidth={1.75} />}
    </button>
  );
}

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  hasAccess,
  initialIsSaved,
}: {
  insight: UIInsight; hasAccess: boolean; initialIsSaved: boolean;
}) {
  const dir        = DIRECTION_MAP[insight.direction];
  const catCls     = CATEGORY_STYLE[insight.category];
  const locked     = isCardLocked(insight, hasAccess);
  const detailHref = insight.slug ? `/insights/${insight.slug}` : `/insights/${insight.id}`;

  return (
    <article className={`group flex flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:border-zinc-800/70 sm:bg-zinc-900/40 sm:transition-all sm:duration-200 sm:hover:-translate-y-0.5 sm:hover:border-zinc-700/60 sm:hover:bg-zinc-900/70 sm:hover:shadow-xl ${dir.glowCls} ${dir.borderHover}`}>

      {/* MOBILE */}
      <div className="flex flex-col px-4 py-4 sm:hidden bg-zinc-900/30 border-t border-zinc-800/40 border-b-[6px] border-b-zinc-950">
        <div className="flex items-center gap-1.5">
          <h3 className="shrink-0 text-[13.5px] font-bold tracking-tight text-white">{insight.asset}</h3>
          <span className={`shrink-0 rounded border px-1 py-px text-[8px] font-bold uppercase tracking-wide ${catCls}`}>{insight.category}</span>
          {insight.isHistorical && <span className="shrink-0"><PastProBadge /></span>}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <DirectionBadge direction={insight.direction} />
            <CardBookmarkButton insightId={insight.id} initialIsSaved={initialIsSaved} />
          </div>
        </div>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">{insight.biasType}</p>
        {locked && <div className="mt-2.5"><CardLockBanner /></div>}
        <p className={`mt-2 text-[11.5px] font-light leading-relaxed text-zinc-400 ${locked ? "blur-sm select-none" : ""} transition-all duration-200`}>{insight.summary}</p>
        {insight.isHistorical && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2 py-1.5">
            <CheckCircle size={9} className="mt-px shrink-0 text-violet-400" strokeWidth={2} />
            <p className="text-[9.5px] font-light leading-relaxed text-zinc-500">Published <span className="font-medium text-zinc-400">{insight.publishedAt}</span> · Now free.</p>
          </div>
        )}
        <div className="mt-2.5">
          <p className="mb-1 text-[8px] font-semibold uppercase tracking-widest text-zinc-700">Confidence</p>
          <ConfidenceBar value={insight.confidence} barCls={dir.barCls} blurred={locked} />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9.5px] text-zinc-700"><Clock size={8} />{insight.timeAgo}</span>
          {locked
            ? <Link href="/pricing" className="flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 hover:text-amber-400"><Lock size={8} />Upgrade</Link>
            : <Link href={detailHref} className="flex items-center gap-1 text-[10px] font-semibold text-sky-400">Read<ArrowRight size={9} /></Link>
          }
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:flex sm:flex-1 sm:flex-col">
        <div className={`flex items-start justify-between gap-2 border-b border-zinc-800/60 bg-gradient-to-r ${dir.headerGlow} to-transparent px-4 py-3.5`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight text-white">{insight.asset}</h3>
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${catCls}`}>{insight.category}</span>
              {insight.isHistorical && <PastProBadge />}
            </div>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{insight.biasType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <CardBookmarkButton insightId={insight.id} initialIsSaved={initialIsSaved} />
            <DirectionBadge direction={insight.direction} />
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 py-4">
          {locked && <CardLockBanner />}
          <p className={`flex-1 text-[12.5px] font-light leading-relaxed text-zinc-400 ${locked ? "blur-sm select-none" : ""} transition-all duration-200`}>{insight.summary}</p>
          {insight.isHistorical && (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-1.5">
              <CheckCircle size={9} className="mt-px shrink-0 text-violet-400" strokeWidth={2} />
              <p className="text-[10px] font-light leading-relaxed text-zinc-500">Published on <span className="font-medium text-zinc-400">{insight.publishedAt}</span> · Now free as historical proof.</p>
            </div>
          )}
          <div className="mt-4">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Bias Confidence</p>
            <ConfidenceBar value={insight.confidence} barCls={dir.barCls} blurred={locked} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-3 text-[10px] text-zinc-700">
            <span className="flex items-center gap-1"><Clock size={8} />{insight.timeAgo}</span>
            {insight.readMin > 0 && <><span>·</span><span className="flex items-center gap-1"><BookOpen size={8} />{insight.readMin} min</span></>}
          </div>
          {locked
            ? <Link href="/pricing" className="flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 hover:text-amber-400"><Lock size={8} />Upgrade</Link>
            : (
              <Link href={detailHref} className="flex items-center gap-1 rounded-lg border border-sky-500/0 px-2 py-0.5 text-[10px] font-semibold text-sky-400 transition-all duration-150 group-hover:border-sky-500/30 group-hover:bg-sky-500/10">
                Read<ArrowRight size={9} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            )
          }
        </div>
      </div>
    </article>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────

function StatsBar({ insights, hasAccess }: { insights: UIInsight[]; hasAccess: boolean }) {
  const bullish  = insights.filter((i) => i.direction === "Bullish").length;
  const bearish  = insights.filter((i) => i.direction === "Bearish").length;
  const bias     = insights.length === 0 ? "—" : bullish >= bearish ? "Bullish" : "Bearish";
  const BiasIcon = bias === "Bullish" ? TrendingUp : bias === "Bearish" ? TrendingDown : Minus;

  const stats = [
    { label: "Insights Today", value: String(insights.length), icon: BarChart2, iconCls: "text-sky-400",    bgCls: "bg-sky-500/10"     },
    { label: "Session Bias",   value: bias,                    icon: BiasIcon,  iconCls: bias === "Bullish" ? "text-emerald-400" : bias === "Bearish" ? "text-rose-400" : "text-zinc-400", bgCls: bias === "Bullish" ? "bg-emerald-500/10" : bias === "Bearish" ? "bg-rose-500/10" : "bg-zinc-800/40" },
    { label: "Access Level",   value: hasAccess ? "Pro / Trial" : "Free Tier", icon: hasAccess ? ShieldCheck : Lock, iconCls: hasAccess ? "text-emerald-400" : "text-amber-400", bgCls: hasAccess ? "bg-emerald-500/10" : "bg-amber-500/10" },
  ] as const;

  return (
    <div className="mb-6 w-full overflow-x-auto snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 pb-1 sm:pb-0">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex shrink-0 snap-start items-center gap-2.5 min-w-[120px] sm:min-w-0 sm:flex-1 px-3 py-2 sm:px-4 sm:py-3.5 sm:rounded-xl sm:border sm:border-zinc-800/60 sm:bg-zinc-900/40">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${s.bgCls}`}>
                <Icon size={13} className={s.iconCls} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-white sm:text-xs">{s.value}</p>
                <p className="truncate text-[9px] text-zinc-600 sm:text-[10px]">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CATEGORY FILTER ──────────────────────────────────────────────────────────

function CategoryFilter({ activeFilter, onSelect }: { activeFilter: FilterLabel; onSelect: (l: FilterLabel) => void }) {
  return (
    <div className="mb-5 w-full overflow-x-auto snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 pb-1 sm:flex-wrap sm:pb-0">
        {FILTERS.map(({ label, icon: Icon }) => {
          const isActive = activeFilter === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`flex shrink-0 snap-start items-center gap-1 sm:gap-1.5 rounded-full border px-3 py-1 sm:px-3.5 sm:py-1.5 text-[10.5px] sm:text-[11px] font-semibold transition-all duration-150 ${isActive ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.14)]" : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
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

function ContentKey({ hasAccess }: { hasAccess: boolean }) {
  if (hasAccess) return null;
  return (
    <div className="mb-4 w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
        <span className="mr-1.5 text-[8.5px] font-bold uppercase tracking-wider text-zinc-700">Key:</span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-zinc-800/60 bg-zinc-900/60 px-2 py-0.5 text-[8.5px] text-zinc-500"><span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />Fundamental — Free</span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-0.5 text-[8.5px] text-zinc-500"><Lock size={8} className="shrink-0 text-amber-400" />Today's ICT — Pro</span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-2 py-0.5 text-[8.5px] text-zinc-500"><History size={8} className="shrink-0 text-violet-400" />Past Pro — Free after 24h</span>
      </div>
    </div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────

export default function MarketFeedPage({ hasAccess, insights, initialSavedIds }: MarketFeedPageProps) {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");
  const savedIds = useMemo(() => new Set(initialSavedIds), [initialSavedIds]);

  const filtered = useMemo(
    () => activeFilter === "All" ? insights : insights.filter((i) => i.category === activeFilter),
    [insights, activeFilter],
  );

  const lockedCount = useMemo(
    () => insights.filter((i) => isCardLocked(i, hasAccess)).length,
    [insights, hasAccess],
  );

  return (
    <div className="relative w-full overflow-x-hidden">
      <div className="pointer-events-none fixed left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.04] blur-[120px] md:left-[calc(50%+110px)]" />

      <div className="relative">

        {/* HEADER */}
        <header className="mb-4 sm:mb-6">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{formatDate()}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9.5px] font-medium text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live · {insights.length}
              </div>
              <button className="hidden h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400 sm:flex" title="Refresh feed" onClick={() => window.location.reload()}>
                <RefreshCw size={13} strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Today's <span className="text-sky-400">Market Bias</span>
          </h1>
          <p className="mt-0.5 hidden text-[11px] font-light text-zinc-600 sm:mt-1 sm:block">
            Published at <span className="font-medium text-zinc-500">06:15 AM UTC</span> — before the session opens.
          </p>
        </header>

        <StatsBar insights={insights} hasAccess={hasAccess} />
        <CategoryFilter activeFilter={activeFilter} onSelect={setActiveFilter} />
        <ContentKey hasAccess={hasAccess} />

        {/* FEED */}
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-20 text-center">
            <BarChart2 size={28} className="mb-3 text-zinc-700" strokeWidth={1.5} />
            <p className="text-[13.5px] font-semibold text-zinc-500">No insights published yet</p>
            <p className="mt-1 text-[11px] text-zinc-700">The first analysis will appear here once the admin publishes it.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 py-16 text-center">
            <BarChart2 size={26} className="mb-2.5 text-zinc-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">No {activeFilter} insights today.</p>
            <p className="mt-0.5 text-xs text-zinc-700">Try a different filter or check back tomorrow.</p>
          </div>
        ) : (
          <div className="-mx-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5 2xl:grid-cols-5">
            {filtered.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                hasAccess={hasAccess}
                initialIsSaved={savedIds.has(insight.id)}
              />
            ))}
          </div>
        )}

        {/* UPGRADE NUDGE */}
        {!hasAccess && lockedCount > 0 && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent px-4 py-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 sm:h-9 sm:w-9">
                <Lock size={14} className="text-amber-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-white sm:text-[13px]">Today's ICT setups are locked.</p>
                <p className="text-[10.5px] font-light text-zinc-600 sm:text-[11px]">
                  Upgrade to access <span className="font-medium text-zinc-400">{lockedCount} live daily ICT biases</span> before market open.
                </p>
              </div>
            </div>
            <Link href="/pricing" className="group flex w-full items-center justify-center gap-2 sm:w-auto sm:shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[12px] font-semibold text-amber-400 transition-all duration-150 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]">
              <Sparkles size={11} />Upgrade to Pro<ArrowRight size={11} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {/* SUBSCRIBED STRIP */}
        {hasAccess && insights.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-transparent px-4 py-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 sm:h-9 sm:w-9">
                <ShieldCheck size={15} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-white">You have full access</p>
                <p className="text-[10.5px] font-light text-zinc-600">All {insights.length} insights unlocked. Publishes daily at 06:15 UTC.</p>
              </div>
            </div>
            <Link href="/settings/subscription" className="shrink-0 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-400">Manage →</Link>
          </div>
        )}

      </div>
    </div>
  );
}