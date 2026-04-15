"use client";

// src/app/(user)/insights/[id]/InsightDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Insight Detail Page (Client Component)  v3
//
// v3 changes vs v2:
//   [DATA] The local INSIGHTS mock array is completely removed.
//          The component now receives a `post: UIInsightDetail | null` prop
//          from the server wrapper.  If null, <NotFound /> is rendered.
//
//   [HTML] The body field is TipTap-generated HTML.  A new <PostBodyRenderer>
//          component renders it with dangerouslySetInnerHTML, applying custom
//          dark-theme prose styles without requiring the @tailwindcss/typography
//          plugin.  The paywall mask (gradient + gate card) is applied via CSS
//          mask on the same element.
//
//   [META] The article header is derived from real post fields (asset, biasType,
//          direction, confidence, publishedAt, readMin) — no mock values.
//
//   [KEEP] Bookmark (useOptimistic + useTransition), share (Web Share API /
//          clipboard fallback), language switcher, reading progress bar, and
//          sticky action bar are all unchanged from v2.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useOptimistic, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BookOpen,
  Lock,
  Sparkles,
  Languages,
  ChevronDown,
  CheckCircle,
  History,
  ShieldCheck,
  Check,
  LogIn,
  Zap,
} from "lucide-react";
import { toggleSaveInsight }                    from "@/actions/save-insight";
import { UIInsightDetail, Direction, Category } from "@/types/content";

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface InsightDetailClientProps {
  /** Full post from the DB, or null if the ID doesn't resolve to a published post. */
  post:           UIInsightDetail | null;
  insightId:      number;
  initialIsSaved: boolean;
  isLoggedIn:     boolean;
  hasProAccess:   boolean;
}

// ─── DIRECTION CONFIG ─────────────────────────────────────────────────────────

const DIRECTION_MAP: Record<Direction, {
  Icon: React.ElementType;
  badgeCls: string; barCls: string; headerAccent: string;
}> = {
  Bullish: {
    Icon: TrendingUp,
    badgeCls:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls:       "bg-emerald-400",
    headerAccent: "from-emerald-500/[0.07]",
  },
  Bearish: {
    Icon: TrendingDown,
    badgeCls:     "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls:       "bg-rose-400",
    headerAccent: "from-rose-500/[0.07]",
  },
  Neutral: {
    Icon: Minus,
    badgeCls:     "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls:       "bg-zinc-500",
    headerAccent: "from-zinc-700/[0.07]",
  },
};

const CATEGORY_STYLE: Record<Category, string> = {
  Forex:       "text-sky-400    bg-sky-500/10    border-sky-500/20",
  Crypto:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Indices:     "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Commodities: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Metals:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

// ─── LANGUAGE LIST ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English",    native: "English"   },
  { code: "bn", label: "Bengali",    native: "বাংলা"      },
  { code: "es", label: "Spanish",    native: "Español"   },
  { code: "ar", label: "Arabic",     native: "العربية"   },
  { code: "fr", label: "French",     native: "Français"  },
  { code: "de", label: "German",     native: "Deutsch"   },
  { code: "hi", label: "Hindi",      native: "हिन्दी"     },
  { code: "id", label: "Indonesian", native: "Indonesia" },
  { code: "ja", label: "Japanese",   native: "日本語"     },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "tr", label: "Turkish",    native: "Türkçe"    },
  { code: "ur", label: "Urdu",       native: "اردو"      },
];

// ─── ACCESS RESOLUTION ────────────────────────────────────────────────────────

type AccessCase = "full" | "login-gate" | "pro-gate";

function resolveAccess(
  post:         UIInsightDetail,
  isLoggedIn:   boolean,
  hasProAccess: boolean,
): AccessCase {
  if (hasProAccess)        return "full";
  if (post.isHistorical)  return "full";
  if (!post.isProOnly)    return "full";
  if (!isLoggedIn)        return "login-gate";
  return "pro-gate";
}

// ─── TIPTAP BODY RENDERER ─────────────────────────────────────────────────────
// Renders TipTap HTML with custom dark-theme styles.
// No @tailwindcss/typography needed — all prose styles are inlined via a
// <style> tag scoped to the `.tid-prose` class.

const PROSE_STYLES = `
  .tid-prose { color: rgb(161 161 170); font-size: 13.5px; line-height: 1.85; }
  .tid-prose p { margin-bottom: 1rem; }
  .tid-prose h1, .tid-prose h2, .tid-prose h3, .tid-prose h4 {
    color: #fff; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; line-height: 1.3;
  }
  .tid-prose h2 { font-size: 1.15rem; }
  .tid-prose h3 { font-size: 1rem; }
  .tid-prose ul, .tid-prose ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  .tid-prose ul { list-style-type: disc; }
  .tid-prose ol { list-style-type: decimal; }
  .tid-prose li { margin-bottom: 0.35rem; }
  .tid-prose strong { color: rgb(228 228 231); font-weight: 600; }
  .tid-prose em { color: rgb(212 212 216); font-style: italic; }
  .tid-prose a { color: rgb(56 189 248); text-decoration: underline; text-underline-offset: 2px; }
  .tid-prose blockquote {
    border-left: 2px solid rgb(63 63 70);
    padding-left: 1rem;
    margin: 1rem 0;
    color: rgb(113 113 122);
    font-style: italic;
  }
  .tid-prose code {
    background: rgb(39 39 42);
    border: 1px solid rgb(63 63 70);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    font-family: ui-monospace, monospace;
    color: rgb(167 243 208);
  }
  .tid-prose pre {
    background: rgb(24 24 27);
    border: 1px solid rgb(63 63 70);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin-bottom: 1rem;
  }
  .tid-prose pre code { background: transparent; border: none; padding: 0; }
  .tid-prose hr { border-color: rgb(63 63 70); margin: 1.5rem 0; }
  .tid-prose table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 12.5px; }
  .tid-prose th {
    background: rgb(39 39 42); color: rgb(228 228 231); font-weight: 600;
    border: 1px solid rgb(63 63 70); padding: 0.5rem 0.75rem; text-align: left;
  }
  .tid-prose td { border: 1px solid rgb(63 63 70); padding: 0.5rem 0.75rem; color: rgb(161 161 170); }
  .tid-prose tr:nth-child(even) td { background: rgb(24 24 27 / 0.4); }
  .tid-prose mark { background: rgb(234 179 8 / 0.2); color: rgb(253 224 71); padding: 1px 3px; border-radius: 2px; }
  .tid-prose img { border-radius: 8px; max-width: 100%; margin: 1rem 0; }
`;

function PostBodyRenderer({
  body,
  accessCase,
  asset,
}: {
  body:       string;
  accessCase: AccessCase;
  asset:      string;
}) {
  const showFull = accessCase === "full";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROSE_STYLES }} />
      <div className="relative">
        <div
          className="tid-prose"
          dangerouslySetInnerHTML={{ __html: body }}
          style={!showFull ? {
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
            maskImage:        "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
            maxHeight:        "320px",
            overflow:         "hidden",
          } : undefined}
        />
        {!showFull && (
          <div className="mt-2">
            {accessCase === "login-gate" ? <LoginGateCard /> : <ProGateCard asset={asset} />}
          </div>
        )}
      </div>
    </>
  );
}

// ─── PAYWALL CARDS ────────────────────────────────────────────────────────────

function LoginGateCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
          <LogIn size={18} className="text-sky-400" strokeWidth={1.75} />
        </div>
        <h3 className="mb-1 text-[15px] font-bold text-white">Continue Reading</h3>
        <p className="mb-5 text-[12px] font-light leading-relaxed text-zinc-500">
          Create a free account to read the full analysis. Fundamental insights are always free — no credit card required.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Link href="/login" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-[12px] font-semibold text-sky-400 transition-all hover:bg-sky-500/25 hover:border-sky-500/60">
            <LogIn size={12} />Login to Continue
          </Link>
          <Link href="/register" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-4 py-2.5 text-[12px] font-semibold text-zinc-300 transition-all hover:bg-zinc-700/60 hover:text-white">
            Create Free Account
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {["Free forever plan", "No credit card", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-zinc-600">
              <CheckCircle size={9} className="text-emerald-600" strokeWidth={2} />{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProGateCard({ asset }: { asset: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-zinc-900/80 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-amber-500/8 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <Lock size={17} className="text-amber-400" strokeWidth={2} />
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
            <Sparkles size={8} strokeWidth={2} />Pro Insight
          </span>
        </div>
        <h3 className="mb-1 text-[15px] font-bold text-white">Unlock Today's ICT Bias for {asset}</h3>
        <p className="mb-5 text-[12px] font-light leading-relaxed text-zinc-500">
          Today's ICT bias — including Order Blocks, FVGs, liquidity targets, and exact entry/exit levels — is reserved for Pro subscribers.
        </p>
        <Link href="/pricing" className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 px-5 py-3 text-[12.5px] font-semibold text-amber-400 transition-all hover:bg-amber-500/22 hover:border-amber-500/55 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)]">
          <Sparkles size={12} strokeWidth={2} />Upgrade to Pro
          <span className="ml-auto text-[10px] font-normal text-amber-500/60">Unlock instantly →</span>
        </Link>
        <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-3">
          {["Today's ICT daily biases","Order Blocks & FVGs","Exact entry/SL/TP levels","Liquidity target mapping","20 assets covered daily","Pre-market delivery (06:15 UTC)"].map((feat) => (
            <span key={feat} className="flex items-start gap-1.5 text-[10px] text-zinc-600">
              <Zap size={8} className="mt-px shrink-0 text-amber-600" strokeWidth={2} />{feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: Direction }) {
  const { Icon, badgeCls } = DIRECTION_MAP[direction];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}>
      <Icon size={11} strokeWidth={2.5} />{direction}
    </span>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${CATEGORY_STYLE[category]}`}>
      {category}
    </span>
  );
}

function ConfidenceBar({ value, barCls }: { value: number; barCls: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[11px] font-medium text-zinc-500">{value}%</span>
    </div>
  );
}

// ─── LANGUAGE SWITCHER ────────────────────────────────────────────────────────

function LanguageSwitcher() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const ref                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all duration-150 ${open ? "border-sky-500/40 bg-sky-500/10 text-sky-400" : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
      >
        <Languages size={12} strokeWidth={1.75} />
        <span>{selected.native}</span>
        <ChevronDown size={10} strokeWidth={2} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="p-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setSelected(lang); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${selected.code === lang.code ? "bg-sky-500/10 text-sky-400" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"}`}
              >
                <span className="text-[11px] font-medium">{lang.label}</span>
                <span className="text-[10px] text-zinc-600">{lang.native}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-800/60 px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-zinc-700">AI Translation — UI Preview</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STICKY ACTION BAR ────────────────────────────────────────────────────────

function StickyActionBar({
  optimisticIsSaved, isPending, onBookmark, onShare,
}: {
  optimisticIsSaved: boolean; isPending: boolean;
  onBookmark: () => void; onShare: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center pb-[env(safe-area-inset-bottom,0px)] pointer-events-none">
      <div className="pointer-events-auto mb-4 flex items-center gap-1 rounded-2xl border border-zinc-700/60 bg-zinc-950/85 backdrop-blur-2xl px-2 py-2 shadow-2xl shadow-black/50">
        <button
          onClick={onBookmark}
          disabled={isPending}
          title={optimisticIsSaved ? "Remove bookmark" : "Save insight"}
          className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-all duration-150 ${isPending ? "opacity-60" : ""} ${optimisticIsSaved ? "bg-amber-500/12 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]" : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent"}`}
        >
          {optimisticIsSaved
            ? <BookmarkCheck size={14} strokeWidth={2}    className="transition-transform duration-150 group-active:scale-90" />
            : <Bookmark      size={14} strokeWidth={1.75} className="transition-transform duration-150 group-active:scale-90" />
          }
          <span className="hidden sm:inline">{optimisticIsSaved ? "Saved" : "Save"}</span>
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-800" />

        <button
          onClick={onShare}
          className="group flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2 text-[11px] font-semibold text-zinc-500 transition-all duration-150 hover:bg-zinc-800/70 hover:text-zinc-200"
        >
          <Share2 size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-800" />

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2 text-[11px] font-semibold text-zinc-500 transition-all duration-150 hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/20"
        >
          <Languages size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">Translate</span>
        </button>
      </div>
    </div>
  );
}

function ShareToast({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed right-4 top-6 z-[60] flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl px-4 py-2.5 text-[11.5px] font-medium text-zinc-300 shadow-xl shadow-black/40 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
      <Check size={12} className="text-emerald-400" strokeWidth={2.5} />Link copied to clipboard
    </div>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el  = document.documentElement;
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setProgress(Math.min(100, Math.max(0, pct * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-zinc-900">
      <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-[width] duration-100" style={{ width: `${progress}%` }} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <BookOpen size={22} className="text-zinc-600" strokeWidth={1.5} />
      </div>
      <h2 className="mb-1 text-lg font-bold text-white">Insight Not Found</h2>
      <p className="mb-5 text-sm font-light text-zinc-600">
        This insight may have been removed or the link is incorrect.
      </p>
      <Link href="/feed" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white">
        <ArrowLeft size={14} />Back to Feed
      </Link>
    </div>
  );
}

// ─── MAIN CLIENT COMPONENT ────────────────────────────────────────────────────

export default function InsightDetailClient({
  post,
  insightId,
  initialIsSaved,
  isLoggedIn,
  hasProAccess,
}: InsightDetailClientProps) {

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const [optimisticIsSaved, setOptimisticIsSaved] = useOptimistic(
    initialIsSaved,
    (_state: boolean, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleBookmark() {
    startTransition(async () => {
      setOptimisticIsSaved(!optimisticIsSaved);
      await toggleSaveInsight(insightId);
    });
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  const [showToast, setShowToast] = useState(false);

  async function handleShare() {
    const url   = window.location.href;
    const title = post ? `${post.asset} — ${post.biasType} | TradeInsight Daily` : "TradeInsight Daily";
    const text  = post?.summary ?? "Market bias analysis — TradeInsight Daily";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2400);
    } catch { /* silent */ }
  }

  // ── Early return — post not found ─────────────────────────────────────────
  if (!post) return <NotFound />;

  const dir        = DIRECTION_MAP[post.direction];
  const accessCase = resolveAccess(post, isLoggedIn, hasProAccess);
  const isPastPro  = post.isProOnly && post.isHistorical;

  return (
    <>
      <ReadingProgress />
      <ShareToast visible={showToast} />

      <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <div className="pointer-events-none fixed left-1/2 top-[20%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.03] blur-[140px]" />

        {/* ── NAV ── */}
        <nav className="sticky top-[2px] z-40 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl px-4 py-3 sm:px-6">
          <Link href="/feed" className="group flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-500 transition-all hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200">
            <ArrowLeft size={13} strokeWidth={2} className="transition-transform group-hover:-translate-x-0.5" />Market Feed
          </Link>
          <span className="hidden text-[11px] font-semibold tracking-widest text-zinc-700 sm:block">TRADE INSIGHT DAILY</span>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-500 transition-all hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200">
            <Share2 size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </nav>

        {/* ── READING COLUMN ── */}
        <main className="mx-auto w-full max-w-3xl px-4 pb-32 sm:px-6 lg:px-8">

          {/* ARTICLE HEADER */}
          <header className={`relative mt-8 mb-8 overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 bg-gradient-to-br ${dir.headerAccent} to-transparent px-5 py-6 sm:px-7 sm:py-7`}>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)" }}
            />
            <div className="relative">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={post.category} />
                {isPastPro && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                    <History size={8} strokeWidth={2.5} />Past Pro · Verified
                  </span>
                )}
                <span className="ml-auto"><DirectionBadge direction={post.direction} /></span>
              </div>

              <h1 className="mb-1 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">{post.asset}</h1>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">{post.biasType}</p>
              <p className="text-[13.5px] font-light leading-relaxed text-zinc-400 sm:text-sm">{post.summary}</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800/60 pt-4">
                <span className="flex items-center gap-1.5 text-[10.5px] text-zinc-600"><Clock size={10} strokeWidth={1.75} />{post.publishedAt}</span>
                {post.readMin > 0 && (
                  <span className="flex items-center gap-1.5 text-[10.5px] text-zinc-600"><BookOpen size={10} strokeWidth={1.75} />{post.readMin} min read</span>
                )}
                <div className="ml-auto flex min-w-[120px] items-center gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-widest text-zinc-700">Confidence</span>
                  <div className="flex-1"><ConfidenceBar value={post.confidence} barCls={dir.barCls} /></div>
                </div>
              </div>
            </div>
          </header>

          {/* HISTORICAL PROOF STRIP */}
          {isPastPro && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] px-4 py-3.5">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-violet-400" strokeWidth={2} />
              <div>
                <p className="text-[11.5px] font-semibold text-violet-300">Verified Historical Bias</p>
                <p className="mt-0.5 text-[11px] font-light leading-relaxed text-zinc-500">
                  This analysis was published on{" "}
                  <span className="font-medium text-zinc-400">{post.publishedAt}</span>
                  , before the session opened. It is now freely available as proof of methodology.
                </p>
              </div>
            </div>
          )}

          {/* AI LANGUAGE SWITCHER */}
          <div className="mb-7 flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Languages size={12} className="text-sky-400" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold text-zinc-500">AI Translate</span>
              <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-zinc-600">Beta</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* ARTICLE BODY — TipTap HTML */}
          <article>
            {post.body ? (
              <PostBodyRenderer
                body={post.body}
                accessCase={accessCase}
                asset={post.asset}
              />
            ) : (
              // Edge case: post exists but body is empty (draft published without content)
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-6 text-center">
                <p className="text-[12px] text-zinc-600">Full analysis content is being prepared.</p>
              </div>
            )}
          </article>

          {/* FULL ACCESS STRIP */}
          {accessCase === "full" && (
            <div className="mt-10 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="shrink-0 text-emerald-400" strokeWidth={1.75} />
                <div>
                  <p className="text-[12px] font-semibold text-emerald-300">
                    {hasProAccess
                      ? "Full Pro Access"
                      : isPastPro
                        ? "Historical insight — free to read"
                        : "Fundamental insight — free to read"}
                  </p>
                  <p className="text-[10.5px] font-light text-zinc-600">
                    {hasProAccess
                      ? `All ${post.readMin > 0 ? `${post.readMin}-min ` : ""}analysis unlocked.`
                      : "This analysis is part of your free-tier access."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BACK LINK */}
          <div className="mt-10 flex items-center justify-center">
            <Link href="/feed" className="group flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-[11.5px] font-semibold text-zinc-500 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200">
              <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
              Back to Market Feed
            </Link>
          </div>
        </main>
      </div>

      <StickyActionBar
        optimisticIsSaved={optimisticIsSaved}
        isPending={isPending}
        onBookmark={handleBookmark}
        onShare={handleShare}
      />
    </>
  );
}