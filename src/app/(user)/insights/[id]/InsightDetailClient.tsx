"use client";

// src/app/(user)/insights/[id]/InsightDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Detailed Insight Reading Page (Client Component)  v2
//
// v2 changes vs v1:
//   [AUTH] Removed hardcoded `IS_LOGGED_IN = false` and `HAS_PRO_ACCESS = false`
//          module-level constants.
//          Now receives `isLoggedIn: boolean` and `hasProAccess: boolean` as
//          props from the server wrapper (page.tsx), which derives both from
//          the real Auth.js JWT session before streaming HTML.
//
//   [KEEP] All v1 bookmark, share, translate, reading-progress, and paywall
//          behaviour unchanged.
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
import { toggleSaveInsight } from "@/actions/save-insight";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Direction = "Bullish" | "Bearish" | "Neutral";
type Category  = "Forex" | "Crypto" | "Indices" | "Commodities" | "Metals";

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

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface InsightDetailClientProps {
  insightId:      number;
  initialIsSaved: boolean;
  /** True when a valid Auth.js session with a user ID is present. */
  isLoggedIn:     boolean;
  /** True when the user has an active Pro subscription OR an active trial. */
  hasProAccess:   boolean;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INSIGHTS: Insight[] = [
  {
    id: 1, asset: "EUR/USD", category: "Forex", direction: "Bullish",
    biasType: "Fundamental Bias",
    summary: "Softer USD tone following yesterday's weaker ISM Services data underpins the Euro. ECB speak today could amplify the move if rhetoric turns less dovish.",
    detail:
      "The macro backdrop has shifted meaningfully in favour of EUR/USD dip-buyers. The ISM Services PMI printed at 51.4, missing the 52.8 consensus, which dragged the DXY lower across the board. This is not a one-off data miss — it extends a three-week pattern of softer US activity data that is beginning to recalibrate rate-cut expectations at the Fed.\n\nECB officials speaking today represent a significant catalyst risk. If any MPC member signals pushback against the currently priced two cuts this year, EUR/USD could see a sharp squeeze of short positions that have been building since late March.\n\nFrom a purely technical perspective, the 1.0870 area represents a clearly defined demand zone — it was the point of origin for the late-March displacement and has been tested twice on an intraday basis without a clean break.\n\nKey levels to watch:\n• Support / Entry Zone: 1.0870 – 1.0858\n• Resistance Target: 1.0935 (previous week's high)\n• Invalidation: Daily close below 1.0842\n\nRisk parameters: Given the event risk from ECB speakers, position sizing should be conservative — recommended maximum 0.75% account risk per trade until the session catalysts are resolved.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 4, confidence: 74,
    isProOnly: false, isHistorical: false,
  },
  {
    id: 2, asset: "GOLD", category: "Metals", direction: "Bullish",
    biasType: "Fundamental Outlook",
    summary: "Geopolitical risk premium and a pause in real yield gains continue to support Gold. CPI data due Thursday is the next major fundamental catalyst.",
    detail:
      "Gold remains structurally bid on a combination of persistent geopolitical risk premium and the growing consensus that US real yields have topped out near the 2.3% level.\n\nThe CPI print due Thursday at 08:30 ET is the single most important fundamental driver this week. A downside surprise would immediately reprice the front end of the rates market, weaken the USD, and send Gold through the 2,340 resistance zone.\n\nPositioning context: CFTC data shows speculative net-long positions increasing by 18,400 contracts, the largest weekly addition in Q2.\n\nKey levels:\n• Structural support: 2,318 (weekly pivot)\n• First target: 2,352 (April high)\n• Extension target: 2,388 (measured move)\n• Hard stop / invalidation: Daily close below 2,298",
    timeAgo: "3h ago", publishedAt: "06:15 AM UTC", readMin: 5, confidence: 79,
    isProOnly: false, isHistorical: false,
  },
  {
    id: 3, asset: "GBP/USD", category: "Forex", direction: "Bearish",
    biasType: "ICT Bias — Today",
    summary: "Bearish OB at 1.2738–1.2754 sitting directly above price. A retest into this zone with rejection sets up a clean short targeting the 1.2680 BSL pool.",
    detail:
      "The GBP/USD bearish setup today is defined by one of the cleanest Order Block formations seen on this pair in the last month. The OB at 1.2738–1.2754 was created by a strong bearish engulfing candle on the 4-hour chart that broke the 1.2705 structure low.\n\nExecution framework:\n• Wait for price to trade into 1.2738 – 1.2754\n• Entry: Limit at 1.2745 or market on the 15-min close below OB lower boundary\n• Stop Loss: Above OB high at 1.2760\n• Target 1: 1.2712 Daily FVG lower boundary (+26 pips)\n• Target 2: 1.2680 BSL pool (+65 pips)\n\nBias invalidation: Any 4-hour close above 1.2760 negates the bearish structure entirely.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 6, confidence: 81,
    isProOnly: true, isHistorical: false,
  },
  {
    id: 4, asset: "BTC/USD", category: "Crypto", direction: "Bullish",
    biasType: "ICT Bias — Today",
    summary: "Weekly FVG between 66,200–67,100 provided a clean mitigation. Expecting displacement higher toward the 70,400 buyside liquidity as the primary draw on price.",
    detail:
      "Bitcoin's price action since Monday has been a near-perfect institutional delivery sequence. The Weekly FVG between 66,200 and 67,100 was mitigated on an intraday low-volume sweep before reversing sharply.\n\nIntraday execution plan:\n• Bias: Long-only for today's session\n• Optimal entry: Any pullback into the 66,800–67,200 zone\n• Target: 70,400 BSL (primary draw)\n• Hard stop: 4-hour close below 65,800\n\nOn-chain context: Exchange net flows have been negative for 9 consecutive days — historically precedes supply-squeeze rallies.",
    timeAgo: "2h ago", publishedAt: "06:15 AM UTC", readMin: 7, confidence: 77,
    isProOnly: true, isHistorical: false,
  },
  {
    id: 5, asset: "US500", category: "Indices", direction: "Bullish",
    biasType: "ICT Bias — Yesterday",
    summary: "Price swept the 5,198 sell-side liquidity in the London session then delivered a full bullish displacement into New York open. Bias played out for +38 pts.",
    detail:
      "Yesterday's US500 ICT bias has been fully confirmed and is now presented as verified historical analysis — published at 06:15 AM UTC on April 13th, before any of the described price action occurred.\n\nChronological price action breakdown:\n• 07:45 UTC — Price began its engineered decline toward 5,198\n• 08:20 UTC — Low printed at 5,194 (stop hunt 4 points below the level, as anticipated)\n• 08:35 UTC — 15-min Market Structure Shift (MSS) confirmed at 5,210\n• 09:15 UTC — Price entered the FVG retest zone at 5,216–5,222\n• 11:45 UTC — Target hit at 5,248, capturing the full +38 point projected move\n\nRisk-reward achieved: Entry at 5,218 average, stop at 5,190, target at 5,248 — 1:1 on the conservative target.",
    timeAgo: "Yesterday", publishedAt: "06:15 AM UTC · Apr 13", readMin: 5, confidence: 88,
    isProOnly: true, isHistorical: true,
  },
  {
    id: 6, asset: "OIL (WTI)", category: "Commodities", direction: "Bearish",
    biasType: "ICT Bias — Yesterday",
    summary: "Bearish OB at 87.40–87.65 was mitigated perfectly in early London. Price delivered a sharp sell-off into the 84.90 void — a textbook ICT delivery.",
    detail:
      "Yesterday's WTI Crude Oil bias is now published openly as verified historical proof, having been issued at 06:15 AM UTC on April 13th — before the London session opened.\n\nChronological verification:\n• 07:10 UTC — WTI printed a high of 87.58, directly inside the 87.40–87.65 OB zone\n• 07:30 UTC — A 15-min bearish engulfing candle closed at 87.34\n• 08:15 UTC — Price broke through 86.90 with momentum\n• 10:45 UTC — Price reached 85.10, entering the upper boundary of the target void\n\nTotal captured: $2.50/bbl from limit entry at 87.40, stop above 87.70, target at 84.90. Risk-Reward: 8.3:1.",
    timeAgo: "Yesterday", publishedAt: "06:15 AM UTC · Apr 13", readMin: 4, confidence: 91,
    isProOnly: true, isHistorical: true,
  },
];

// ─── DIRECTION & CATEGORY CONFIG ─────────────────────────────────────────────

const DIRECTION_MAP: Record<Direction, {
  Icon: React.ElementType;
  badgeCls: string; barCls: string;
  glowCls: string; headerAccent: string;
}> = {
  Bullish: {
    Icon: TrendingUp,
    badgeCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    barCls: "bg-emerald-400",
    glowCls: "shadow-emerald-500/10",
    headerAccent: "from-emerald-500/[0.07]",
  },
  Bearish: {
    Icon: TrendingDown,
    badgeCls: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    barCls: "bg-rose-400",
    glowCls: "shadow-rose-500/10",
    headerAccent: "from-rose-500/[0.07]",
  },
  Neutral: {
    Icon: Minus,
    badgeCls: "text-zinc-400 bg-zinc-700/30 border-zinc-700/50",
    barCls: "bg-zinc-500",
    glowCls: "shadow-zinc-500/10",
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

// ─── LANGUAGES ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English",    native: "English"    },
  { code: "bn", label: "Bengali",    native: "বাংলা"       },
  { code: "es", label: "Spanish",    native: "Español"    },
  { code: "ar", label: "Arabic",     native: "العربية"    },
  { code: "fr", label: "French",     native: "Français"   },
  { code: "de", label: "German",     native: "Deutsch"    },
  { code: "hi", label: "Hindi",      native: "हिन्दी"      },
  { code: "id", label: "Indonesian", native: "Indonesia"  },
  { code: "ja", label: "Japanese",   native: "日本語"      },
  { code: "pt", label: "Portuguese", native: "Português"  },
  { code: "tr", label: "Turkish",    native: "Türkçe"     },
  { code: "ur", label: "Urdu",       native: "اردو"       },
];

// ─── ACCESS CONTROL ───────────────────────────────────────────────────────────

type AccessCase = "full" | "login-gate" | "pro-gate";

function resolveAccess(
  insight:      Insight | null,
  isLoggedIn:   boolean,
  hasProAccess: boolean,
): AccessCase {
  if (!insight)              return "login-gate";
  if (hasProAccess)          return "full";
  if (insight.isHistorical)  return "full";
  if (!insight.isProOnly)    return "full";
  if (!isLoggedIn)           return "login-gate";
  return "pro-gate";
}

function getSnippet(text: string): string {
  const targetLen   = Math.floor(text.length * 0.3);
  const slice       = text.slice(0, targetLen + 60);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  const cutoff = sentenceEnd > 0 ? sentenceEnd + 1 : targetLen;
  return text.slice(0, Math.min(cutoff, targetLen + 60)).trim();
}

// ─── MICRO-COMPONENTS ─────────────────────────────────────────────────────────

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
  const dropdownRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all duration-150 ${
          open
            ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
            : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        }`}
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
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-100 ${
                  selected.code === lang.code
                    ? "bg-sky-500/10 text-sky-400"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
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

// ─── PAYWALL CARDS ────────────────────────────────────────────────────────────

function LoginGateCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-violet-500/8 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
          <LogIn size={18} className="text-sky-400" strokeWidth={1.75} />
        </div>
        <h3 className="mb-1 text-[15px] font-bold text-white">Continue Reading</h3>
        <p className="mb-5 text-[12px] font-light leading-relaxed text-zinc-500">
          Create a free account to read the full analysis. Fundamental insights are always free — no credit card required.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Link href="/login" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-[12px] font-semibold text-sky-400 transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/60 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]">
            <LogIn size={12} />Login to Continue
          </Link>
          <Link href="/register" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-4 py-2.5 text-[12px] font-semibold text-zinc-300 transition-all duration-150 hover:bg-zinc-700/60 hover:text-white">
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
        <Link href="/pricing" className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 px-5 py-3 text-[12.5px] font-semibold text-amber-400 transition-all duration-150 hover:bg-amber-500/22 hover:border-amber-500/55 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)]">
          <Sparkles size={12} strokeWidth={2} />
          Upgrade to Pro
          <span className="ml-auto text-[10px] font-normal text-amber-500/60">Unlock instantly →</span>
        </Link>
        <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-3">
          {["Today's ICT daily biases","Order Blocks & FVGs","Exact entry/SL/TP levels","Liquidity target mapping","20 assets covered daily","Pre-market delivery (06:15 UTC)"].map((feat) => (
            <span key={feat} className="flex items-start gap-1.5 text-[10px] text-zinc-600">
              <Zap size={8} className="mt-px shrink-0 text-amber-600" strokeWidth={2} />{feat}
            </span>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-zinc-700">
          Yesterday's ICT biases are free. Scroll the feed to see verified historical proof.
        </p>
      </div>
    </div>
  );
}

// ─── ARTICLE BODY ─────────────────────────────────────────────────────────────

function ArticleBody({ text, accessCase, asset }: { text: string; accessCase: AccessCase; asset: string }) {
  const showFull    = accessCase === "full";
  const displayText = showFull ? text : getSnippet(text);
  const paragraphs  = displayText.split(/\n+/).filter(Boolean);

  return (
    <div className="relative">
      <div
        className="relative"
        style={!showFull ? {
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
          maskImage:        "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
        } : undefined}
      >
        {paragraphs.map((para, i) => {
          if (para.startsWith("•")) {
            return (
              <div key={i} className="my-1.5 flex items-start gap-2.5">
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                <p className="text-[13.5px] font-light leading-relaxed text-zinc-400">{para.slice(1).trim()}</p>
              </div>
            );
          }
          return <p key={i} className="mb-4 text-[13.5px] font-light leading-[1.85] text-zinc-400">{para}</p>;
        })}
      </div>
      {!showFull && (
        <div className="mt-[-2rem]">
          {accessCase === "login-gate" ? <LoginGateCard /> : <ProGateCard asset={asset} />}
        </div>
      )}
    </div>
  );
}

// ─── STICKY BOTTOM ACTION BAR ─────────────────────────────────────────────────

function StickyActionBar({
  optimisticIsSaved,
  isPending,
  onBookmark,
  onShare,
}: {
  optimisticIsSaved: boolean;
  isPending:         boolean;
  onBookmark:        () => void;
  onShare:           () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center pb-[env(safe-area-inset-bottom,0px)] pointer-events-none">
      <div className="pointer-events-auto mb-4 flex items-center gap-1 rounded-2xl border border-zinc-700/60 bg-zinc-950/85 backdrop-blur-2xl px-2 py-2 shadow-2xl shadow-black/50">
        <button
          onClick={onBookmark}
          disabled={isPending}
          title={optimisticIsSaved ? "Remove bookmark" : "Save insight"}
          className={`
            group flex items-center gap-2 rounded-xl px-3.5 py-2
            text-[11px] font-semibold transition-all duration-150
            ${isPending ? "opacity-60" : ""}
            ${optimisticIsSaved
              ? "bg-amber-500/12 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
              : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent"
            }
          `}
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
          title="Share insight"
          className="group flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2 text-[11px] font-semibold text-zinc-500 transition-all duration-150 hover:bg-zinc-800/70 hover:text-zinc-200"
        >
          <Share2 size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-800" />

        <button
          title="AI Translate (scroll up)"
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
      <Check size={12} className="text-emerald-400" strokeWidth={2.5} />
      Link copied to clipboard
    </div>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function onScroll() {
      const el  = document.documentElement;
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setProgress(Math.min(100, Math.max(0, pct * 100)));
    }
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
      <p className="mb-5 text-sm font-light text-zinc-600">This insight may have been removed or the link is incorrect.</p>
      <Link href="/feed" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white">
        <ArrowLeft size={14} />Back to Feed
      </Link>
    </div>
  );
}

// ─── CLIENT COMPONENT ─────────────────────────────────────────────────────────

export default function InsightDetailClient({
  insightId,
  initialIsSaved,
  isLoggedIn,
  hasProAccess,
}: InsightDetailClientProps) {

  const [optimisticIsSaved, setOptimisticIsSaved] = useOptimistic(
    initialIsSaved,
    (_state: boolean, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();
  const [showToast, setShowToast]    = useState(false);

  const insight    = INSIGHTS.find((i) => i.id === insightId) ?? null;
  const accessCase = resolveAccess(insight, isLoggedIn, hasProAccess);

  function handleBookmark() {
    startTransition(async () => {
      setOptimisticIsSaved(!optimisticIsSaved);
      await toggleSaveInsight(insightId);
    });
  }

  async function handleShare() {
    const url   = window.location.href;
    const title = insight
      ? `${insight.asset} — ${insight.biasType} | TradeInsight Daily`
      : "TradeInsight Daily";
    const text  = insight?.summary ?? "Market bias analysis — TradeInsight Daily";

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
    } catch {
      // silent no-op
    }
  }

  if (!insight) return <NotFound />;

  const dir       = DIRECTION_MAP[insight.direction];
  const isPastPro = insight.isProOnly && insight.isHistorical;

  return (
    <>
      <ReadingProgress />
      <ShareToast visible={showToast} />

      <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <div className="pointer-events-none fixed left-1/2 top-[20%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.03] blur-[140px]" />

        {/* ── NAV ── */}
        <nav className="sticky top-[2px] z-40 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl px-4 py-3 sm:px-6">
          <Link href="/feed" className="group flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-500 transition-all duration-150 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200">
            <ArrowLeft size={13} strokeWidth={2} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
            Market Feed
          </Link>
          <span className="hidden text-[11px] font-semibold tracking-widest text-zinc-700 sm:block">TRADE INSIGHT DAILY</span>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-500 transition-all duration-150 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200">
            <Share2 size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </nav>

        {/* ── READING COLUMN ── */}
        <main className="mx-auto w-full max-w-3xl px-4 pb-32 sm:px-6 lg:px-8">

          {/* ── ARTICLE HEADER ── */}
          <header className={`relative mt-8 mb-8 overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 bg-gradient-to-br ${dir.headerAccent} to-transparent px-5 py-6 sm:px-7 sm:py-7`}>
            <div className="pointer-events-none absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)" }}
            />
            <div className="relative">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={insight.category} />
                {isPastPro && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                    <History size={8} strokeWidth={2.5} />Past Pro · Verified
                  </span>
                )}
                <span className="ml-auto"><DirectionBadge direction={insight.direction} /></span>
              </div>
              <h1 className="mb-1 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">{insight.asset}</h1>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">{insight.biasType}</p>
              <p className="text-[13.5px] font-light leading-relaxed text-zinc-400 sm:text-sm">{insight.summary}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800/60 pt-4">
                <span className="flex items-center gap-1.5 text-[10.5px] text-zinc-600"><Clock size={10} strokeWidth={1.75} />{insight.publishedAt}</span>
                <span className="flex items-center gap-1.5 text-[10.5px] text-zinc-600"><BookOpen size={10} strokeWidth={1.75} />{insight.readMin} min read</span>
                <div className="ml-auto flex min-w-[120px] items-center gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-widest text-zinc-700">Confidence</span>
                  <div className="flex-1"><ConfidenceBar value={insight.confidence} barCls={dir.barCls} /></div>
                </div>
              </div>
            </div>
          </header>

          {/* ── HISTORICAL PROOF STRIP ── */}
          {isPastPro && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] px-4 py-3.5">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-violet-400" strokeWidth={2} />
              <div>
                <p className="text-[11.5px] font-semibold text-violet-300">Verified Historical Bias</p>
                <p className="mt-0.5 text-[11px] font-light leading-relaxed text-zinc-500">
                  This analysis was published on{" "}
                  <span className="font-medium text-zinc-400">{insight.publishedAt}</span>
                  , before the session opened. It is now freely available as proof of methodology.
                </p>
              </div>
            </div>
          )}

          {/* ── AI LANGUAGE SWITCHER ── */}
          <div className="mb-7 flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Languages size={12} className="text-sky-400" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold text-zinc-500">AI Translate</span>
              <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-zinc-600">Beta</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* ── ARTICLE BODY ── */}
          <article className="prose-none">
            <ArticleBody text={insight.detail} accessCase={accessCase} asset={insight.asset} />
          </article>

          {/* ── FULL ACCESS STRIP ── */}
          {accessCase === "full" && (
            <div className="mt-10 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="shrink-0 text-emerald-400" strokeWidth={1.75} />
                <div>
                  <p className="text-[12px] font-semibold text-emerald-300">
                    {hasProAccess ? "Full Pro Access" : isPastPro ? "Historical insight — free to read" : "Fundamental insight — free to read"}
                  </p>
                  <p className="text-[10.5px] font-light text-zinc-600">
                    {hasProAccess ? `All ${insight.readMin}-min analysis unlocked.` : "This analysis is part of your free-tier access."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── BACK LINK ── */}
          <div className="mt-10 flex items-center justify-center">
            <Link href="/feed" className="group flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-[11.5px] font-semibold text-zinc-500 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200">
              <ArrowLeft size={12} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
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