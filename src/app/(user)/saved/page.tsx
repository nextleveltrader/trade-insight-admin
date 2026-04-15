// src/app/(user)/saved/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Saved Insights  (Sprint 2 update)
//
// Server Component.
//
// Changes vs Sprint 1:
//   • Calls getSavedInsights() which does a real DB join between
//     saved_posts → posts → assets.  The old two-step pattern
//     (get IDs → filter mock array) is completely removed.
//   • Receives hasAccess from the real Auth.js session.
//   • Mock INSIGHTS array is gone.
//
// Sprint 3 TODO — Bug #11:
//   savedPosts.postId is TEXT; posts.id is INTEGER.
//   getSavedInsights() already applies a CAST workaround; the permanent fix
//   (change column type to INTEGER) is tracked in the Sprint 3 bug list.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle,
  History,
  Bookmark,
  ArrowLeft,
  BarChart2,
} from "lucide-react";
import { auth }               from "@/auth";
import { getSavedInsights }   from "@/actions/get-content";
import { UIInsight, Direction, Category } from "@/types/content";

// ─── ACCESS HELPER ────────────────────────────────────────────────────────────

function resolveAccess(session: any): boolean {
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;
  return isPro || (trialEndsAt !== null && Date.now() < trialEndsAt);
}

function isCardLocked(i: UIInsight, hasAccess: boolean) {
  return i.isProOnly && !i.isHistorical && !hasAccess;
}

// ─── DIRECTION & CATEGORY CONFIG ─────────────────────────────────────────────

const DIRECTION_MAP: Record<
  Direction,
  { Icon: React.ElementType; badgeCls: string; barCls: string; glowCls: string; borderHover: string; headerGlow: string }
> = {
  Bullish: {
    Icon: TrendingUp,
    badgeCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", barCls: "bg-emerald-400",
    glowCls: "sm:hover:shadow-emerald-500/20", borderHover: "sm:hover:border-emerald-500/30", headerGlow: "from-emerald-500/[0.05]",
  },
  Bearish: {
    Icon: TrendingDown,
    badgeCls: "text-rose-400 bg-rose-500/10 border-rose-500/25", barCls: "bg-rose-400",
    glowCls: "sm:hover:shadow-rose-500/20", borderHover: "sm:hover:border-rose-500/30", headerGlow: "from-rose-500/[0.05]",
  },
  Neutral: {
    Icon: Minus,
    badgeCls: "text-zinc-400 bg-zinc-700/30 border-zinc-700/50", barCls: "bg-zinc-500",
    glowCls: "sm:hover:shadow-zinc-500/10", borderHover: "sm:hover:border-zinc-600/40", headerGlow: "from-zinc-700/[0.05]",
  },
};

const CATEGORY_STYLE: Record<Category, string> = {
  Forex:       "text-sky-400    bg-sky-500/10    border-sky-500/20",
  Crypto:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Indices:     "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Commodities: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Metals:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

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

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────

function InsightCard({ insight, hasAccess }: { insight: UIInsight; hasAccess: boolean }) {
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
          <span className="ml-auto shrink-0"><DirectionBadge direction={insight.direction} /></span>
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
          <div className="flex items-center gap-2 text-[9.5px] text-zinc-700">
            <span className="flex items-center gap-1"><Clock size={8} />{insight.timeAgo}</span>
            {insight.readMin > 0 && <><span>·</span><span className="flex items-center gap-1"><BookOpen size={8} />{insight.readMin} min</span></>}
          </div>
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
          <div className="shrink-0 pt-0.5"><DirectionBadge direction={insight.direction} /></div>
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

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20 py-20 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-zinc-800/60 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/60">
          <Bookmark size={22} className="text-zinc-700" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mb-1 text-[14px] font-semibold text-zinc-400">No saved insights yet</h3>
      <p className="mb-6 max-w-xs text-[11.5px] font-light leading-relaxed text-zinc-600">
        Bookmark any insight from the Market Feed and it will appear here for quick reference.
      </p>
      <Link href="/feed" className="group flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-[11.5px] font-semibold text-sky-400 transition-all duration-150 hover:bg-sky-500/18 hover:border-sky-500/50 hover:shadow-[0_0_18px_rgba(14,165,233,0.14)]">
        Browse Market Feed<ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function SavedInsightsPage() {
  // Run session fetch and saved posts fetch in parallel.
  const [session, savedInsights] = await Promise.all([
    auth(),
    getSavedInsights(),
  ]);

  const hasAccess = resolveAccess(session);

  return (
    <div className="relative w-full overflow-x-hidden">
      <div className="pointer-events-none fixed left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.03] blur-[120px]" />

      <div className="relative">
        {/* HEADER */}
        <header className="mb-6 sm:mb-8">
          <Link href="/feed" className="mb-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-zinc-600 transition-colors hover:text-zinc-300">
            <ArrowLeft size={11} strokeWidth={2} />Market Feed
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                Saved <span className="text-amber-400">Insights</span>
              </h1>
              <p className="mt-0.5 text-[11px] font-light text-zinc-600 sm:mt-1">
                {savedInsights.length > 0
                  ? `${savedInsights.length} bookmark${savedInsights.length !== 1 ? "s" : ""} — your personal reading list.`
                  : "Your bookmarked insights appear here."}
              </p>
            </div>
            {savedInsights.length > 0 && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.07] px-3 py-1.5 text-[10.5px] font-semibold text-amber-400">
                <Bookmark size={10} strokeWidth={2} />{savedInsights.length}
              </div>
            )}
          </div>
        </header>

        {/* FEED */}
        {savedInsights.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary stats row */}
            <div className="mb-4 flex items-center gap-2 text-[10px] text-zinc-600">
              <BarChart2 size={10} strokeWidth={1.75} />
              <span>
                {savedInsights.filter((i) => !isCardLocked(i, hasAccess)).length} readable ·{" "}
                {savedInsights.filter((i) => isCardLocked(i, hasAccess)).length} locked
              </span>
            </div>

            <div className="-mx-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5 2xl:grid-cols-5">
              {savedInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} hasAccess={hasAccess} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}