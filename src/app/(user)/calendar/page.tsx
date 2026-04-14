"use client";

// src/app/(user)/calendar/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Smart Trade Setup Engine  v2
//
// Architecture:
//   [A] Hero Section      — "Immediate Next" mega card + "Up Next" rail
//   [B] Filter Bar        — day tabs + impact toggle, sticky on mobile
//   [C] Event Feed        — accordion list, mobile edge-to-edge / desktop card
//       └─ DeepDataPanel  — 3-tab expandable: Explanation | History | AI Insight
//
// Freemium gates:
//   History tab   → first 2 rows free, blur mask + glassmorphism upgrade card
//   AI Insight    → fully locked unless HAS_PRO_ACCESS; copy varies by aiStatus
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Bell,
  Lock,
  Sparkles,
  Brain,
  BarChart2,
  BookOpen,
  ArrowRight,
  Activity,
} from "lucide-react";

// ─── ACCESS CONTROL ───────────────────────────────────────────────────────────
const IS_LOGGED_IN   = false;
const HAS_PRO_ACCESS = false;

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Impact   = "High" | "Medium" | "Low";
type DayTab   = "Today" | "Tomorrow" | "This Week";
type AiStatus = "processing" | "ready" | "live";
type DeepTab  = "explanation" | "history" | "insight";

interface HistoryPoint {
  date:     string;
  actual:   string;
  forecast: string;
  pipMove:  string;
}

interface EconomicEvent {
  id:             number;
  time:           string;
  currency:       string;
  impact:         Impact;
  title:          string;
  previous:       string;
  forecast:       string;
  actual:         string | null;
  day:            DayTab;
  affectedAssets: string[];
  aiStatus:       AiStatus;
  explanation:    string;
  history:        HistoryPoint[];
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: 1,
    time: "08:30 AM", currency: "USD", impact: "High",
    title: "Core CPI m/m",
    previous: "0.4%", forecast: "0.3%", actual: null,
    day: "Today",
    affectedAssets: ["XAU/USD", "EUR/USD", "DXY"],
    aiStatus: "live",
    explanation:
      "Core CPI (Consumer Price Index) measures the change in the price of goods and services, excluding volatile food and energy costs. Think of it as the Federal Reserve's favourite thermometer for inflation. A reading above forecast signals stubborn inflation — which typically strengthens the Dollar as traders price in higher interest rates staying in place for longer. Below forecast? Dollar weakens as rate-cut hopes revive.",
    history: [
      { date: "Apr 10", actual: "0.4%", forecast: "0.3%", pipMove: "+62 Pips" },
      { date: "Mar 12", actual: "0.4%", forecast: "0.3%", pipMove: "+45 Pips" },
      { date: "Feb 13", actual: "0.3%", forecast: "0.3%", pipMove: "+8 Pips"  },
      { date: "Jan 11", actual: "0.2%", forecast: "0.3%", pipMove: "-38 Pips" },
      { date: "Dec 12", actual: "0.3%", forecast: "0.3%", pipMove: "+5 Pips"  },
      { date: "Nov 14", actual: "0.2%", forecast: "0.2%", pipMove: "-12 Pips" },
    ],
  },
  {
    id: 2,
    time: "10:00 AM", currency: "USD", impact: "Medium",
    title: "ISM Services PMI",
    previous: "51.4", forecast: "52.0", actual: null,
    day: "Today",
    affectedAssets: ["EUR/USD", "GBP/USD"],
    aiStatus: "ready",
    explanation:
      "The ISM Services PMI is a monthly survey of purchasing managers in the US service sector — restaurants, banks, hospitals, and tech firms. A reading above 50 signals expansion; below 50 signals contraction. Since services represent roughly 80% of US economic output, this print heavily influences the Fed's view on economic health and directly impacts Dollar pairs.",
    history: [
      { date: "Apr 03", actual: "51.4", forecast: "52.8", pipMove: "-32 Pips" },
      { date: "Mar 05", actual: "52.6", forecast: "53.0", pipMove: "-18 Pips" },
      { date: "Feb 05", actual: "53.4", forecast: "52.5", pipMove: "+28 Pips" },
      { date: "Jan 07", actual: "54.1", forecast: "52.2", pipMove: "+41 Pips" },
      { date: "Dec 04", actual: "52.1", forecast: "52.5", pipMove: "-14 Pips" },
    ],
  },
  {
    id: 3,
    time: "02:00 PM", currency: "GBP", impact: "Medium",
    title: "Claimant Count Change",
    previous: "18.0K", forecast: "14.2K", actual: "16.8K",
    day: "Today",
    affectedAssets: ["GBP/USD", "EUR/GBP"],
    aiStatus: "processing",
    explanation:
      "Claimant Count Change measures the monthly change in the number of people claiming unemployment benefits in the UK. Lower claims = tighter labour market = wage pressure = potential BoE rate hikes = GBP bullish. Higher claims suggest economic slack, which typically weakens Sterling. This is one of the Bank of England's key labour market indicators.",
    history: [
      { date: "Apr 16", actual: "16.8K", forecast: "14.2K", pipMove: "-22 Pips" },
      { date: "Mar 19", actual: "18.0K", forecast: "16.5K", pipMove: "-31 Pips" },
      { date: "Feb 20", actual: "14.2K", forecast: "15.0K", pipMove: "+18 Pips" },
      { date: "Jan 16", actual: "11.0K", forecast: "15.2K", pipMove: "+44 Pips" },
      { date: "Dec 17", actual: "0.3K",  forecast: "12.0K", pipMove: "+52 Pips" },
    ],
  },
  {
    id: 4,
    time: "03:30 PM", currency: "EUR", impact: "High",
    title: "ECB Press Conference",
    previous: "—", forecast: "Hawkish", actual: null,
    day: "Today",
    affectedAssets: ["EUR/USD", "EUR/GBP", "XAU/USD"],
    aiStatus: "ready",
    explanation:
      "The ECB Press Conference follows the rate decision and is where markets really react. President Lagarde's tone — hawkish (fighting inflation) vs dovish (supporting growth) — can move Euro pairs by 80–150 pips in minutes. Traders watch for hints on the pace of future rate cuts, balance sheet reduction, and growth outlook. One sentence can redraw the entire EUR technical picture for the week.",
    history: [
      { date: "Mar 07", actual: "Dovish",  forecast: "Neutral", pipMove: "-78 Pips" },
      { date: "Feb 01", actual: "Neutral", forecast: "Dovish",  pipMove: "+55 Pips" },
      { date: "Jan 25", actual: "Hawkish", forecast: "Neutral", pipMove: "+92 Pips" },
      { date: "Dec 14", actual: "Dovish",  forecast: "Dovish",  pipMove: "-12 Pips" },
      { date: "Nov 02", actual: "Neutral", forecast: "Hawkish", pipMove: "-65 Pips" },
    ],
  },
  {
    id: 5,
    time: "08:30 AM", currency: "USD", impact: "High",
    title: "Initial Jobless Claims",
    previous: "211K", forecast: "215K", actual: null,
    day: "Tomorrow",
    affectedAssets: ["XAU/USD", "EUR/USD", "USD/JPY"],
    aiStatus: "processing",
    explanation:
      "Initial Jobless Claims is a weekly snapshot of how many Americans filed for unemployment benefits for the first time. It's one of the most timely leading indicators of the US labour market. Fewer claims → labour market is tight → Fed stays hawkish → Dollar strengthens. More claims → cracks appearing → Dollar weakens and gold often rallies.",
    history: [
      { date: "Apr 11", actual: "211K", forecast: "215K", pipMove: "+18 Pips" },
      { date: "Apr 04", actual: "222K", forecast: "214K", pipMove: "-24 Pips" },
      { date: "Mar 28", actual: "210K", forecast: "212K", pipMove: "+9 Pips"  },
      { date: "Mar 21", actual: "223K", forecast: "215K", pipMove: "-31 Pips" },
      { date: "Mar 14", actual: "209K", forecast: "218K", pipMove: "+37 Pips" },
    ],
  },
  {
    id: 6,
    time: "09:00 AM", currency: "EUR", impact: "Medium",
    title: "German Ifo Business Climate",
    previous: "87.5", forecast: "88.2", actual: null,
    day: "Tomorrow",
    affectedAssets: ["EUR/USD", "EUR/CHF"],
    aiStatus: "processing",
    explanation:
      "The German Ifo Business Climate Index surveys around 9,000 German firms on their current business situation and 6-month outlook. Germany is the Eurozone's largest economy, so this index is a leading indicator of European economic health. A surprise to the upside lifts the Euro; a miss reinforces the Eurozone's structural weakness narrative.",
    history: [
      { date: "Mar 25", actual: "87.5", forecast: "86.9", pipMove: "+21 Pips" },
      { date: "Feb 26", actual: "85.5", forecast: "86.0", pipMove: "-16 Pips" },
      { date: "Jan 29", actual: "84.7", forecast: "84.9", pipMove: "-8 Pips"  },
      { date: "Dec 18", actual: "86.0", forecast: "85.6", pipMove: "+14 Pips" },
      { date: "Nov 25", actual: "85.7", forecast: "86.3", pipMove: "-19 Pips" },
    ],
  },
  {
    id: 7,
    time: "08:30 AM", currency: "USD", impact: "High",
    title: "Nonfarm Payrolls",
    previous: "236K", forecast: "240K", actual: null,
    day: "This Week",
    affectedAssets: ["XAU/USD", "EUR/USD", "USD/JPY", "GBP/USD"],
    aiStatus: "processing",
    explanation:
      "Nonfarm Payrolls (NFP) is the single most market-moving economic event in the world. Released on the first Friday of each month, it measures how many jobs were added to the US economy (excluding farming, private households, and non-profits). A strong beat means the Fed has room to keep rates elevated — Dollar rips higher, Gold tumbles. A miss does the exact opposite, often triggering 100–200 pip moves across major pairs within seconds of the release.",
    history: [
      { date: "Apr 05", actual: "303K", forecast: "214K", pipMove: "+128 Pips" },
      { date: "Mar 08", actual: "275K", forecast: "198K", pipMove: "+96 Pips"  },
      { date: "Feb 02", actual: "353K", forecast: "180K", pipMove: "+142 Pips" },
      { date: "Jan 05", actual: "216K", forecast: "175K", pipMove: "+62 Pips"  },
      { date: "Dec 08", actual: "199K", forecast: "180K", pipMove: "+38 Pips"  },
      { date: "Nov 03", actual: "150K", forecast: "180K", pipMove: "-71 Pips"  },
    ],
  },
];

// ─── CONFIG MAPS ──────────────────────────────────────────────────────────────

const CURRENCY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  USD: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25" },
  EUR: { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25"     },
  GBP: { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/25"  },
  JPY: { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/25"    },
};
function getCurrStyle(c: string) {
  return CURRENCY_STYLE[c] ?? { bg: "bg-zinc-700/20", text: "text-zinc-400", border: "border-zinc-700/40" };
}

const IMPACT_CFG: Record<Impact, { dot: string; badge: string; border: string; label: string }> = {
  High:   { dot: "bg-rose-500",  badge: "text-rose-400 bg-rose-500/10",   border: "border-rose-500/25",  label: "High"   },
  Medium: { dot: "bg-amber-400", badge: "text-amber-400 bg-amber-500/10", border: "border-amber-500/25", label: "Medium" },
  Low:    { dot: "bg-zinc-600",  badge: "text-zinc-500 bg-zinc-700/20",   border: "border-zinc-700/40",  label: "Low"    },
};

const AI_STATUS_CFG: Record<AiStatus, { label: string; colour: string; border: string; bg: string; desc: string }> = {
  processing: { label: "Processing",   colour: "text-zinc-400",    border: "border-zinc-700/50",    bg: "bg-zinc-800/40",    desc: "AI analysis starts 1h before release" },
  ready:      { label: "Bias Ready",   colour: "text-amber-400",   border: "border-amber-500/30",   bg: "bg-amber-500/8",    desc: "AI bias computed — upgrade to unlock" },
  live:       { label: "Live Signal",  colour: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/8",  desc: "Live trade setup available now"       },
};

// Mock AI trade setups (Pro-only content)
const MOCK_AI_SETUPS: Record<number, {
  bias: string; detail: string;
  pairs: { pair: string; direction: "long" | "short"; entry: string; sl: string; tp: string }[];
}> = {
  1: {
    bias: "Bearish USD if print < 0.3%. Bullish USD if print ≥ 0.4%.",
    detail: "Core CPI has beaten forecast in 4 of the last 5 releases. A 3rd consecutive beat would likely send DXY through 105.80 resistance and pressure XAU/USD below the 2,280 structural support.",
    pairs: [
      { pair: "XAU/USD", direction: "short", entry: "2,318–2,325", sl: "2,345", tp: "2,268" },
      { pair: "EUR/USD", direction: "short", entry: "1.0840–1.0855", sl: "1.0900", tp: "1.0760" },
    ],
  },
  4: {
    bias: "Bullish EUR on Hawkish tone. Bearish EUR on Dovish or rate-cut signals.",
    detail: "Lagarde's press conferences are notorious for re-pricing the Euro regardless of the rate decision itself. Any explicit mention of June cuts would be the surprise and could deliver 80–100 pips south instantly.",
    pairs: [
      { pair: "EUR/USD", direction: "long", entry: "1.0760–1.0775", sl: "1.0720", tp: "1.0870" },
    ],
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function pipColour(pip: string) {
  if (pip.startsWith("+")) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" };
  if (pip.startsWith("-")) return { text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25"    };
  return { text: "text-zinc-400", bg: "bg-zinc-800/40", border: "border-zinc-700/40" };
}

function getActualColour(actual: string, forecast: string) {
  const a = parseFloat(actual), f = parseFloat(forecast);
  if (isNaN(a) || isNaN(f)) return "text-zinc-300";
  return a > f ? "text-emerald-400" : a < f ? "text-rose-400" : "text-zinc-300";
}

// ─── MOCK COUNTDOWN ───────────────────────────────────────────────────────────

function useCountdown(initial: number) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setS((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// [A] HERO SECTION
// ─────────────────────────────────────────────────────────────────────────────

function ImmediateNextCard({ event }: { event: EconomicEvent }) {
  const countdown = useCountdown(4500);
  const cur = getCurrStyle(event.currency);
  const imp = IMPACT_CFG[event.impact];
  const ai  = AI_STATUS_CFG[event.aiStatus];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.08] via-zinc-900/50 to-zinc-900/40 backdrop-blur-sm shadow-2xl shadow-rose-500/8">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-amber-500/8 blur-2xl" />

      {/* Top strip */}
      <div className="relative flex items-center justify-between gap-2 border-b border-zinc-800/50 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-rose-400">Immediate Next</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ai.colour} ${ai.border} ${ai.bg}`}>
          <Activity size={8} strokeWidth={2.5} />
          {ai.label}
        </span>
      </div>

      {/* Body */}
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${cur.bg} ${cur.text} ${cur.border}`}>
            {event.currency}
          </span>
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${imp.badge} ${imp.border}`}>
            {imp.label} Impact
          </span>
        </div>

        <h2 className="mb-0.5 text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
          {event.title}
        </h2>
        <p className="mb-3 text-[10.5px] font-medium uppercase tracking-wider text-zinc-600">{event.time} UTC</p>

        {/* Affected assets */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-700">Affects:</span>
          {event.affectedAssets.map((a) => (
            <span key={a} className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[9.5px] font-semibold text-zinc-400">
              {a}
            </span>
          ))}
        </div>

        {/* Prev / Forecast + countdown */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="mb-0.5 text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">Previous</p>
              <p className="font-mono text-[14px] font-semibold text-zinc-400">{event.previous}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">Forecast</p>
              <p className="font-mono text-[14px] font-semibold text-white">{event.forecast}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/80 px-3 py-2">
              <Clock size={11} className="text-zinc-600" strokeWidth={1.75} />
              <span className="font-mono text-[14px] font-bold tabular-nums text-white">{countdown}</span>
            </div>
            <span className="text-[9px] text-zinc-700">until release</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between gap-3 border-t border-zinc-800/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5">
          <Bell size={9} className="text-zinc-700" />
          <span className="text-[9.5px] text-zinc-700">Alert me when released</span>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5 text-[10px] font-semibold text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200">
          <Bell size={9} strokeWidth={2} />
          Set Alert
          <ChevronRight size={9} />
        </button>
      </div>
    </div>
  );
}

function UpNextRail({ events }: { events: EconomicEvent[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-700">Up Next</p>
      {events.map((ev) => {
        const cur = getCurrStyle(ev.currency);
        const imp = IMPACT_CFG[ev.impact];
        const ai  = AI_STATUS_CFG[ev.aiStatus];
        return (
          <div key={ev.id} className="group relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3.5 py-3 transition-all duration-150 hover:border-zinc-700/60 hover:bg-zinc-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={`rounded border px-1 py-0.5 text-[8px] font-extrabold uppercase ${cur.bg} ${cur.text} ${cur.border}`}>
                    {ev.currency}
                  </span>
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    {ev.impact === "High" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${imp.dot} opacity-50`} />}
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${imp.dot}`} />
                  </span>
                  <span className={`text-[8.5px] font-semibold ${ai.colour}`}>{ai.label}</span>
                </div>
                <p className="truncate text-[11.5px] font-semibold text-white">{ev.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ev.affectedAssets.slice(0, 2).map((a) => (
                    <span key={a} className="text-[8.5px] text-zinc-700">{a}</span>
                  ))}
                  {ev.affectedAssets.length > 2 && <span className="text-[8.5px] text-zinc-700">+{ev.affectedAssets.length - 2}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[10.5px] font-medium text-zinc-500">{ev.time}</p>
                <p className="mt-0.5 text-[9px] text-zinc-700">{ev.forecast}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeroSection({ events }: { events: EconomicEvent[] }) {
  const upcoming = events.filter((e) => e.actual === null);
  const hero     = upcoming[0];
  const upNext   = upcoming.slice(1, 3);
  if (!hero) return null;
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
      <ImmediateNextCard event={hero} />
      {upNext.length > 0 && <UpNextRail events={upNext} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// [B] FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────

const DAY_TABS: DayTab[] = ["Today", "Tomorrow", "This Week"];

function FilterBar({
  activeDay, onDay, highOnly, onHighOnly,
}: {
  activeDay: DayTab; onDay: (d: DayTab) => void;
  highOnly: boolean; onHighOnly: (v: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-zinc-800/50 bg-zinc-950/90 px-4 pb-2 pt-2 backdrop-blur-xl sm:static sm:mx-0 sm:border-none sm:bg-transparent sm:pb-0 sm:backdrop-blur-0">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center gap-1.5">
          {DAY_TABS.map((day) => (
            <button
              key={day}
              onClick={() => onDay(day)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10.5px] font-semibold transition-all duration-150 ${
                activeDay === day
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.12)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <Calendar size={9} strokeWidth={activeDay === day ? 2.2 : 1.75} />
              {day}
            </button>
          ))}
        </div>

        <div className="mx-1 h-5 w-px shrink-0 bg-zinc-800" />

        <button
          onClick={() => onHighOnly(!highOnly)}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10.5px] font-semibold transition-all duration-150 ${
            highOnly
              ? "border-rose-500/35 bg-rose-500/12 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.12)]"
              : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {highOnly && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${highOnly ? "bg-rose-500" : "bg-zinc-700"}`} />
          </span>
          🔥 High Only
        </button>

        {/* Desktop impact legend */}
        <div className="ml-auto hidden shrink-0 items-center gap-4 sm:flex">
          {(["High", "Medium", "Low"] as Impact[]).map((lvl) => (
            <span key={lvl} className="flex items-center gap-1.5 text-[9.5px] text-zinc-600">
              <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_CFG[lvl].dot}`} />
              {lvl}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEEP DATA PANEL — Tab 1: Explanation (Free)
// ─────────────────────────────────────────────────────────────────────────────

function ExplanationTab({ event }: { event: EconomicEvent }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen size={11} className="text-sky-400" strokeWidth={1.75} />
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-sky-400">Plain English</span>
        <span className="ml-auto rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
          Free
        </span>
      </div>
      <p className="text-[12.5px] font-light leading-[1.8] text-zinc-400">{event.explanation}</p>
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/50 pt-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-700">Affected pairs:</span>
        {event.affectedAssets.map((a) => (
          <span key={a} className="rounded-md border border-zinc-700/50 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEEP DATA PANEL — Tab 2: History (Freemium)
// ─────────────────────────────────────────────────────────────────────────────

const FREE_ROWS = 2;

function HistoryGateCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-900/90 px-5 py-5 backdrop-blur-md shadow-2xl shadow-black/50">
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-orange-500/8 blur-xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <Lock size={13} className="text-amber-400" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[12px] font-bold leading-none text-white">Full History Locked</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Unlock all historical prints + volatility data</p>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-y-1.5 gap-x-4">
          {[
            "Full 12-month history", "Actual vs Forecast delta",
            "Pip move per release",  "Volatility heatmap",
            "Beat/miss streaks",     "Seasonal patterns",
          ].map((f) => (
            <span key={f} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Zap size={8} className="shrink-0 text-amber-600" strokeWidth={2} />{f}
            </span>
          ))}
        </div>
        <Link
          href="/upgrade"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 py-2.5 text-[11.5px] font-semibold text-amber-400 transition-all hover:bg-amber-500/20 hover:border-amber-500/55 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <Sparkles size={11} />
          Unlock Full History & Volatility Data
          <ArrowRight size={10} className="ml-auto" />
        </Link>
      </div>
    </div>
  );
}

function HistoryTab({ event }: { event: EconomicEvent }) {
  const visibleRows = HAS_PRO_ACCESS ? event.history : event.history.slice(0, FREE_ROWS);
  const hasGate     = !HAS_PRO_ACCESS && event.history.length > FREE_ROWS;
  const blurRows    = event.history.slice(FREE_ROWS, FREE_ROWS + 3);

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <BarChart2 size={11} className="text-amber-400" strokeWidth={1.75} />
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400">Release History</span>
        {!HAS_PRO_ACCESS && (
          <span className="ml-auto rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">
            {FREE_ROWS} free · Pro for all
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="mb-1 grid grid-cols-4 gap-2 px-2">
        {["Date", "Actual", "Forecast", "Pip Move"].map((h) => (
          <span key={h} className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">{h}</span>
        ))}
      </div>

      {/* Free rows */}
      <div className="space-y-1">
        {visibleRows.map((row, i) => {
          const pc = pipColour(row.pipMove);
          return (
            <div
              key={i}
              className={`grid grid-cols-4 items-center gap-2 rounded-lg px-2 py-2.5 ${i % 2 === 0 ? "bg-zinc-800/20" : ""}`}
            >
              <span className="text-[11px] font-medium text-zinc-500">{row.date}</span>
              <span className={`text-[11px] font-semibold tabular-nums ${getActualColour(row.actual, row.forecast)}`}>
                {row.actual}
              </span>
              <span className="text-[11px] text-zinc-500 tabular-nums">{row.forecast}</span>
              <span className={`inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${pc.text} ${pc.bg} ${pc.border}`}>
                {row.pipMove}
              </span>
            </div>
          );
        })}
      </div>

      {/* Freemium gate */}
      {hasGate && (
        <div className="relative mt-1">
          {/* Blurred ghost rows */}
          <div className="select-none blur-[5px]" aria-hidden="true">
            {blurRows.map((row, i) => {
              const pc = pipColour(row.pipMove);
              return (
                <div key={i} className={`grid grid-cols-4 items-center gap-2 rounded-lg px-2 py-2.5 ${i % 2 === 0 ? "bg-zinc-800/20" : ""}`}>
                  <span className="text-[11px] font-medium text-zinc-500">{row.date}</span>
                  <span className={`text-[11px] font-semibold ${getActualColour(row.actual, row.forecast)}`}>{row.actual}</span>
                  <span className="text-[11px] text-zinc-500">{row.forecast}</span>
                  <span className={`inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${pc.text} ${pc.bg} ${pc.border}`}>{row.pipMove}</span>
                </div>
              );
            })}
          </div>
          {/* Gradient fade over blurred rows */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-transparent to-zinc-950" />
          {/* Upgrade card */}
          <div className="relative mt-[-0.25rem]">
            <HistoryGateCard />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEEP DATA PANEL — Tab 3: AI Smart Insight (Pro)
// ─────────────────────────────────────────────────────────────────────────────

function SmartInsightGateCard({ event }: { event: EconomicEvent }) {
  const ai = AI_STATUS_CFG[event.aiStatus];
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/80 px-5 py-5 backdrop-blur-md shadow-2xl shadow-black/50">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/8 blur-2xl" />
      <div className="relative">
        {/* AI status */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60">
            <Lock size={15} className="text-zinc-500" strokeWidth={1.75} />
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ai.colour} ${ai.border} ${ai.bg}`}>
              <Activity size={8} strokeWidth={2.5} />
              {ai.label}
            </span>
            <p className="mt-0.5 text-[11px] font-light text-zinc-500">{ai.desc}</p>
          </div>
        </div>

        {/* Status-specific copy */}
        {event.aiStatus === "processing" ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
            <Brain size={12} className="mt-0.5 shrink-0 text-zinc-600" strokeWidth={1.5} />
            <p className="text-[11.5px] font-light leading-relaxed text-zinc-600">
              AI analysis hasn't started yet — it begins 1 hour before release to incorporate the freshest positioning data and liquidity maps.
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2.5">
            <p className="text-[11.5px] font-light leading-relaxed text-zinc-400">
              {event.aiStatus === "ready"
                ? `AI Bias is ready for ${event.title}. Upgrade to unlock the full directional bias, institutional order flow read, and trade setup with entry, SL, and TP levels.`
                : `Live AI Signal is active for ${event.title}. The trade setup has been computed from real-time order flow and is ready to execute. Upgrade to view it.`
              }
            </p>
          </div>
        )}

        {/* Feature list */}
        <div className="mb-4 grid grid-cols-2 gap-y-1.5 gap-x-4">
          {[
            "Directional bias (Bull/Bear)", "Institutional order flow",
            "Entry zone & SL/TP levels",   "Liquidity target mapping",
            "Pre/post release playbook",    "Volatility range estimate",
          ].map((f) => (
            <span key={f} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Brain size={8} className="shrink-0 text-violet-600" strokeWidth={2} />{f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        {!IS_LOGGED_IN ? (
          <div className="flex flex-col gap-2">
            <Link href="/register" className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 py-2.5 text-[11.5px] font-semibold text-sky-400 transition-all hover:bg-sky-500/18">
              Create Free Account <ArrowRight size={10} />
            </Link>
            <Link href="/upgrade" className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 py-2.5 text-[11.5px] font-semibold text-amber-400 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_18px_rgba(245,158,11,0.14)]">
              <Sparkles size={11} />
              Upgrade to Pro — Unlock AI Insight
            </Link>
          </div>
        ) : (
          <Link href="/upgrade" className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 py-2.5 text-[11.5px] font-semibold text-amber-400 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_18px_rgba(245,158,11,0.14)]">
            <Sparkles size={11} />
            Upgrade to Pro — Unlock AI Insight
          </Link>
        )}
      </div>
    </div>
  );
}

function SmartInsightFullContent({ event }: { event: EconomicEvent }) {
  const setup = MOCK_AI_SETUPS[event.id];
  if (!setup) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Brain size={22} className="mb-2 text-zinc-700" strokeWidth={1.5} />
        <p className="text-[12px] text-zinc-600">No AI setup available for this event yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">AI Directional Bias</p>
        <p className="text-[13px] font-semibold leading-relaxed text-emerald-300">{setup.bias}</p>
      </div>
      <p className="text-[12.5px] font-light leading-[1.8] text-zinc-400">{setup.detail}</p>
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600">Trade Setups</p>
        <div className="space-y-2">
          {setup.pairs.map((p) => (
            <div key={p.pair} className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[12px] font-bold text-white">{p.pair}</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${
                  p.direction === "long"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}>
                  {p.direction === "long"
                    ? <TrendingUp   className="mr-0.5 inline" size={8} />
                    : <TrendingDown className="mr-0.5 inline" size={8} />
                  }
                  {p.direction.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([["Entry", p.entry], ["Stop Loss", p.sl], ["Take Profit", p.tp]] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-700">{label}</p>
                    <p className="font-mono text-[11px] font-semibold text-zinc-300">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800/60 px-3 py-2">
        <AlertTriangle size={10} className="shrink-0 text-zinc-700" strokeWidth={1.75} />
        <p className="text-[9.5px] text-zinc-700">For informational purposes only. Not financial advice.</p>
      </div>
    </div>
  );
}

function SmartInsightTab({ event }: { event: EconomicEvent }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Brain size={11} className="text-violet-400" strokeWidth={1.75} />
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-violet-400">AI Trade Insight</span>
        <span className="ml-auto rounded-md border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-400">Pro</span>
      </div>
      {HAS_PRO_ACCESS
        ? <SmartInsightFullContent event={event} />
        : <SmartInsightGateCard   event={event} />
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEEP DATA PANEL — Tab switcher
// ─────────────────────────────────────────────────────────────────────────────

const DEEP_TABS: { id: DeepTab; label: string; Icon: React.ElementType; tier: "free" | "mixed" | "pro" }[] = [
  { id: "explanation", label: "What is this?", Icon: BookOpen, tier: "free"  },
  { id: "history",     label: "History",        Icon: BarChart2, tier: "mixed" },
  { id: "insight",     label: "AI Insight",     Icon: Brain,     tier: "pro"   },
];
const TIER_BADGE: Record<string, string> = {
  free:  "text-emerald-400 border-emerald-500/25 bg-emerald-500/8",
  mixed: "text-amber-400 border-amber-500/25 bg-amber-500/8",
  pro:   "text-violet-400 border-violet-500/25 bg-violet-500/8",
};

function DeepDataPanel({ event }: { event: EconomicEvent }) {
  const [activeTab, setActiveTab] = useState<DeepTab>("explanation");
  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950/60 px-4 pb-5 pt-3 sm:px-5">
      {/* Tab bar */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        {DEEP_TABS.map(({ id, label, Icon, tier }) => {
          const isAct = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[10.5px] font-semibold transition-all duration-150 ${
                isAct
                  ? "border-zinc-600/80 bg-zinc-800/80 text-white"
                  : "border-transparent bg-transparent text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon size={10} strokeWidth={isAct ? 2.2 : 1.75} />
              {label}
              <span className={`rounded border px-1 py-px text-[7.5px] font-bold uppercase tracking-wider ${TIER_BADGE[tier]}`}>
                {tier === "mixed" ? "Pro+" : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </button>
          );
        })}
      </div>
      {/* Content */}
      {activeTab === "explanation" && <ExplanationTab event={event} />}
      {activeTab === "history"     && <HistoryTab     event={event} />}
      {activeTab === "insight"     && <SmartInsightTab event={event} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// [C] EVENT FEED — Accordion cards
// ─────────────────────────────────────────────────────────────────────────────

function DataCell({ label, value, isActual, forecast }: {
  label: string; value: string | null; isActual: boolean; forecast: string;
}) {
  const colour = isActual && value ? getActualColour(value, forecast) : "text-zinc-300";
  const a = value !== null && isActual ? parseFloat(value) : NaN;
  const f = isActual ? parseFloat(forecast) : NaN;
  const Icon = !isNaN(a) && !isNaN(f)
    ? (a > f ? TrendingUp : a < f ? TrendingDown : Minus)
    : null;

  return (
    <div className="flex min-w-[44px] flex-col items-center gap-0.5">
      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-700">{label}</span>
      {value === null ? (
        <span className="text-[11px] font-medium text-zinc-700">—</span>
      ) : (
        <div className="flex items-center gap-0.5">
          {isActual && Icon && <Icon size={8} className={colour} strokeWidth={2.5} />}
          <span className={`text-[11px] font-semibold tabular-nums ${isActual ? colour : "text-zinc-300"}`}>{value}</span>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, isLast }: { event: EconomicEvent; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = getCurrStyle(event.currency);
  const imp = IMPACT_CFG[event.impact];
  const ai  = AI_STATUS_CFG[event.aiStatus];

  return (
    <div className={!isLast ? "border-b border-zinc-800/60" : ""}>

      {/* ── Row (mobile + desktop share same logic, differing only in px/gap) ── */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors duration-100 active:bg-zinc-800/20 hover:bg-zinc-800/10 sm:gap-4 sm:px-5"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Left: time + currency */}
        <div className="flex w-[68px] shrink-0 flex-col items-start gap-1 sm:w-[76px]">
          <span className="flex items-center gap-1 font-mono text-[10.5px] font-medium tabular-nums text-zinc-400">
            <Clock size={8} strokeWidth={1.75} className="text-zinc-700" />
            {event.time}
          </span>
          <span className={`rounded-lg border px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide ${cur.bg} ${cur.text} ${cur.border}`}>
            {event.currency}
          </span>
        </div>

        {/* Middle: impact + title + assets + AI status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              {event.impact === "High" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${imp.dot} opacity-50`} />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${imp.dot}`} />
            </span>
            <p className="truncate text-[12.5px] font-semibold leading-tight text-white">{event.title}</p>
          </div>
          {/* Asset tags + AI badge row */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {event.affectedAssets.slice(0, 3).map((a) => (
              <span key={a} className="rounded border border-zinc-800/70 bg-zinc-900/40 px-1.5 py-px text-[8.5px] font-medium text-zinc-600">
                {a}
              </span>
            ))}
            {event.affectedAssets.length > 3 && (
              <span className="text-[8px] text-zinc-700">+{event.affectedAssets.length - 3}</span>
            )}
            <span className={`hidden rounded-full border px-1.5 py-px text-[8px] font-bold uppercase tracking-wide sm:inline-flex ${ai.colour} ${ai.border} ${ai.bg}`}>
              {ai.label}
            </span>
          </div>
        </div>

        {/* Right: data cells + deep data toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Desktop: show Prev too */}
          <div className="hidden items-center gap-2 sm:flex">
            <DataCell label="Prev" value={event.previous} isActual={false} forecast={event.forecast} />
            <div className="h-5 w-px bg-zinc-800" />
            <DataCell label="Est"  value={event.forecast} isActual={false} forecast={event.forecast} />
            <div className="h-5 w-px bg-zinc-800" />
            <DataCell label="Act"  value={event.actual}   isActual={true}  forecast={event.forecast} />
          </div>
          {/* Mobile: condensed */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <DataCell label="Est"  value={event.forecast} isActual={false} forecast={event.forecast} />
            <div className="h-4 w-px bg-zinc-800" />
            <DataCell label="Act"  value={event.actual}   isActual={true}  forecast={event.forecast} />
          </div>

          {/* Deep data toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[9.5px] font-semibold transition-all duration-150 ${
              open
                ? "border-sky-500/35 bg-sky-500/12 text-sky-400"
                : "border-zinc-700/50 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            <Sparkles size={8} strokeWidth={2} />
            <span className="hidden sm:inline">Deep Data</span>
            <ChevronDown size={9} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Accordion panel ── */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0"}`}>
        {open && <DeepDataPanel event={event} />}
      </div>
    </div>
  );
}

function EventFeed({ events }: { events: EconomicEvent[] }) {
  if (events.length === 0) return null;
  return (
    <>
      {/* Mobile: full-bleed */}
      <div className="-mx-4 sm:hidden">
        {events.map((ev, i) => <EventCard key={ev.id} event={ev} isLast={i === events.length - 1} />)}
      </div>
      {/* Desktop: card container */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 sm:block">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-zinc-800/70 px-5 py-2.5">
          <span className="w-[76px] shrink-0 text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">Time</span>
          <span className="flex-1 text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">Event / Assets</span>
          <div className="flex shrink-0 items-center gap-8 pr-[100px] text-[8.5px] font-bold uppercase tracking-widest text-zinc-700">
            <span>Prev</span><span>Forecast</span><span>Actual</span>
          </div>
        </div>
        {events.map((ev, i) => <EventCard key={ev.id} event={ev} isLast={i === events.length - 1} />)}
      </div>
    </>
  );
}

function EmptyState({ highOnly }: { highOnly: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <Calendar size={18} className="text-zinc-700" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium text-zinc-500">
        {highOnly ? "No high-impact events for this period." : "No events scheduled."}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-700">
        {highOnly ? "Try removing the filter." : "Check back later."}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function EconomicCalendarPage() {
  const [activeDay, setActiveDay] = useState<DayTab>("Today");
  const [highOnly,  setHighOnly]  = useState(false);

  const todayEvents    = ECONOMIC_EVENTS.filter((e) => e.day === "Today");
  const todayHighCount = todayEvents.filter((e) => e.impact === "High").length;

  const visible = ECONOMIC_EVENTS.filter((e) => {
    if (e.day !== activeDay) return false;
    if (highOnly && e.impact !== "High") return false;
    return true;
  });

  return (
    <div className="relative w-full overflow-x-hidden pb-[72px] pt-4 md:pb-0 md:pt-8">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed left-1/2 top-[25%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.03] blur-[120px]" />

      <div className="relative">

        {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
        <header className="mb-4 sm:mb-5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Smart Economic Calendar
            </p>
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-zinc-900/50 px-3 py-1 text-[9.5px] text-zinc-600">
              <span className="font-medium text-zinc-400">{todayEvents.length}</span> today
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="font-medium text-rose-400">{todayHighCount}</span> high
            </div>
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Market <span className="text-sky-400">Catalysts</span>
          </h1>
          <p className="mt-0.5 hidden text-[11px] font-light text-zinc-600 sm:mt-1 sm:block">
            AI-powered trade setups — published before each session opens.
          </p>
        </header>

        {/* ── [A] HERO ─────────────────────────────────────────────────── */}
        <HeroSection events={todayEvents} />

        {/* ── [B] FILTER BAR ───────────────────────────────────────────── */}
        <FilterBar activeDay={activeDay} onDay={setActiveDay} highOnly={highOnly} onHighOnly={setHighOnly} />

        {/* ── [C] EVENT FEED ───────────────────────────────────────────── */}
        {visible.length === 0
          ? <EmptyState highOnly={highOnly} />
          : <EventFeed events={visible} />
        }

        {/* ── FOOTER NOTE ─────────────────────────────────────────────── */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <Globe size={10} className="text-zinc-700" strokeWidth={1.75} />
          <p className="text-[10px] text-zinc-700">
            All times in <span className="font-medium text-zinc-600">UTC</span>.
            Data is indicative only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}