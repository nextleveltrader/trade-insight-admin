"use client";

// src/app/(user)/calendar/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Smart Economic Calendar
//
// Layout contract:
//   • Lives inside the user layout shell which provides the mobile top-header
//     and bottom-nav.  We add `pb-[72px] md:pb-0` and `pt-4 md:pt-8` so
//     content never hides behind either bar.
//   • Overflow guard: `w-full overflow-x-hidden` on the root div.
//
// Architecture:
//   [A] Smart Catalyst Banner  — next High-impact event, mock countdown, pulse
//   [B] Day + Impact filter bar — sticky on mobile, scrollable
//   [C] Event Feed             — mobile list-view / desktop grouped card
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Bell,
  Filter,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Impact   = "High" | "Medium" | "Low";
type DayTab   = "Today" | "Tomorrow" | "This Week";

interface EconomicEvent {
  id:        number;
  time:      string;           // "08:30 AM"
  currency:  string;           // "USD"
  impact:    Impact;
  title:     string;
  previous:  string;
  forecast:  string;
  actual:    string | null;    // null = not yet released
  day:       DayTab;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
//
// Mix of today / tomorrow / this-week events spanning multiple currencies and
// impact levels.  `actual` is non-null only for events that have already
// printed (used to render result styling).

const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: 1,
    time: "08:30 AM",
    currency: "USD",
    impact: "High",
    title: "Core CPI m/m",
    previous: "0.4%",
    forecast: "0.3%",
    actual: null,
    day: "Today",
  },
  {
    id: 2,
    time: "10:00 AM",
    currency: "USD",
    impact: "Medium",
    title: "ISM Services PMI",
    previous: "51.4",
    forecast: "52.0",
    actual: null,
    day: "Today",
  },
  {
    id: 3,
    time: "02:00 PM",
    currency: "GBP",
    impact: "Medium",
    title: "Claimant Count Change",
    previous: "18.0K",
    forecast: "14.2K",
    actual: "16.8K",
    day: "Today",
  },
  {
    id: 4,
    time: "03:30 PM",
    currency: "EUR",
    impact: "High",
    title: "ECB Press Conference",
    previous: "—",
    forecast: "Hawkish",
    actual: null,
    day: "Today",
  },
  {
    id: 5,
    time: "08:30 AM",
    currency: "USD",
    impact: "High",
    title: "Initial Jobless Claims",
    previous: "211K",
    forecast: "215K",
    actual: null,
    day: "Tomorrow",
  },
  {
    id: 6,
    time: "09:00 AM",
    currency: "EUR",
    impact: "Medium",
    title: "German Ifo Business Climate",
    previous: "87.5",
    forecast: "88.2",
    actual: null,
    day: "Tomorrow",
  },
  {
    id: 7,
    time: "08:30 AM",
    currency: "USD",
    impact: "High",
    title: "Nonfarm Payrolls",
    previous: "236K",
    forecast: "240K",
    actual: null,
    day: "This Week",
  },
];

// ─── CURRENCY CONFIG ──────────────────────────────────────────────────────────

const CURRENCY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  USD: { bg: "bg-emerald-500/12", text: "text-emerald-400", border: "border-emerald-500/25" },
  EUR: { bg: "bg-sky-500/12",     text: "text-sky-400",     border: "border-sky-500/25"     },
  GBP: { bg: "bg-violet-500/12",  text: "text-violet-400",  border: "border-violet-500/25"  },
  JPY: { bg: "bg-rose-500/12",    text: "text-rose-400",    border: "border-rose-500/25"    },
  AUD: { bg: "bg-amber-500/12",   text: "text-amber-400",   border: "border-amber-500/25"   },
  CAD: { bg: "bg-orange-500/12",  text: "text-orange-400",  border: "border-orange-500/25"  },
};

function getCurrencyStyle(currency: string) {
  return CURRENCY_STYLE[currency] ?? {
    bg: "bg-zinc-700/20", text: "text-zinc-400", border: "border-zinc-700/40",
  };
}

// ─── IMPACT CONFIG ────────────────────────────────────────────────────────────

const IMPACT_CONFIG: Record<Impact, {
  dot:    string;   // tailwind bg colour for the dot
  label:  string;
  badge:  string;   // full badge classes
  glow:   string;   // shadow/glow for banner
}> = {
  High:   {
    dot:   "bg-rose-500",
    label: "High",
    badge: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    glow:  "shadow-rose-500/20",
  },
  Medium: {
    dot:   "bg-amber-400",
    label: "Medium",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    glow:  "shadow-amber-500/15",
  },
  Low:    {
    dot:   "bg-zinc-600",
    label: "Low",
    badge: "text-zinc-500 bg-zinc-700/20 border-zinc-700/40",
    glow:  "shadow-zinc-700/10",
  },
};

// ─── ACTUAL RESULT COLOURING ──────────────────────────────────────────────────
//
// Simple heuristic: if actual > forecast → green beat, actual < forecast → red miss.
// Falls back to neutral for non-numeric values.

function getActualColour(actual: string, forecast: string): string {
  const a = parseFloat(actual);
  const f = parseFloat(forecast);
  if (isNaN(a) || isNaN(f)) return "text-zinc-300";
  if (a > f) return "text-emerald-400";
  if (a < f) return "text-rose-400";
  return "text-zinc-300";
}

function ActualIcon({ actual, forecast }: { actual: string; forecast: string }) {
  const a = parseFloat(actual);
  const f = parseFloat(forecast);
  if (isNaN(a) || isNaN(f)) return <Minus size={9} className="text-zinc-600" />;
  if (a > f) return <TrendingUp  size={9} className="text-emerald-400" strokeWidth={2.5} />;
  if (a < f) return <TrendingDown size={9} className="text-rose-400"    strokeWidth={2.5} />;
  return <Minus size={9} className="text-zinc-400" />;
}

// ─── MOCK COUNTDOWN HOOK ──────────────────────────────────────────────────────
//
// Counts down from a fixed offset (2h 15m) for demo purposes.
// In production replace with real time-to-event calculation.

function useCountdown(initialSeconds: number) {
  const [secs, setSecs] = useState(initialSeconds);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

// ─── SMART CATALYST BANNER ────────────────────────────────────────────────────
//
// Highlights the next High-impact event not yet released.
// Animated pulse ring + countdown clock.

function SmartCatalystBanner({ event }: { event: EconomicEvent }) {
  const countdown = useCountdown(8100); // 2h 15m = 8100s
  const cur       = getCurrencyStyle(event.currency);

  return (
    <div
      className="
        relative mb-5 overflow-hidden rounded-2xl
        border border-rose-500/20
        bg-gradient-to-br from-rose-500/[0.07] via-zinc-900/60 to-zinc-900/40
        px-4 py-4 sm:px-6 sm:py-5
        shadow-xl shadow-rose-500/10
        backdrop-blur-sm
      "
    >
      {/* Ambient glow blob */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-6 left-12 h-24 w-24 rounded-full bg-amber-500/8 blur-2xl" />

      {/* Header row */}
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Pulse ring */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-400">
            Next Major Catalyst
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
          <Zap size={8} strokeWidth={2.5} />
          High Impact
        </span>
      </div>

      {/* Main content */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Currency badge + title */}
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${cur.bg} ${cur.text} ${cur.border}`}>
              {event.currency}
            </span>
            <h2 className="text-[15px] font-bold leading-tight text-white sm:text-base">
              {event.title}
            </h2>
          </div>

          {/* Prev / Forecast row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[11px] text-zinc-600">
              Previous <span className="font-medium text-zinc-400">{event.previous}</span>
            </span>
            <span className="text-[11px] text-zinc-600">
              Forecast <span className="font-medium text-zinc-300">{event.forecast}</span>
            </span>
          </div>
        </div>

        {/* Countdown clock */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className="
              flex items-center gap-2
              rounded-xl border border-zinc-700/60
              bg-zinc-900/70 px-3 py-2
              backdrop-blur-sm
            "
          >
            <Clock size={12} className="shrink-0 text-zinc-500" strokeWidth={1.75} />
            <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
              {countdown}
            </span>
          </div>
          <p className="text-right text-[9px] text-zinc-700">{event.time} UTC</p>
        </div>
      </div>

      {/* Bottom CTA strip */}
      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-zinc-800/60 pt-3">
        <div className="flex items-center gap-1.5">
          <Bell size={10} className="text-zinc-700" strokeWidth={1.75} />
          <span className="text-[10px] text-zinc-700">Alert when released</span>
        </div>
        <button className="flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-[10px] font-semibold text-zinc-400 transition-all duration-150 hover:border-zinc-600 hover:text-zinc-200">
          Set Alert
          <ChevronRight size={9} />
        </button>
      </div>
    </div>
  );
}

// ─── DAY + IMPACT FILTER BAR ──────────────────────────────────────────────────
//
// Sticky on mobile so it stays visible while scrolling the event list.
// Day tabs on the left, impact toggle on the right (both inside one scroll container).

const DAY_TABS: DayTab[] = ["Today", "Tomorrow", "This Week"];

function FilterBar({
  activeDay,
  onDay,
  highOnly,
  onHighOnly,
}: {
  activeDay:  DayTab;
  onDay:      (d: DayTab) => void;
  highOnly:   boolean;
  onHighOnly: (v: boolean) => void;
}) {
  return (
    <div
      className="
        sticky top-0 z-30 mb-4
        -mx-4 px-4
        sm:static sm:mx-0 sm:px-0
        bg-zinc-950/90 backdrop-blur-xl
        pt-2 pb-2
        border-b border-zinc-800/50
        sm:border-none sm:bg-transparent sm:backdrop-blur-0
        sm:pt-0
      "
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">

        {/* Day tabs */}
        <div className="flex shrink-0 items-center gap-1.5">
          {DAY_TABS.map((day) => {
            const isActive = activeDay === day;
            return (
              <button
                key={day}
                onClick={() => onDay(day)}
                className={`
                  flex shrink-0 items-center gap-1.5 rounded-full border
                  px-3 py-1.5 text-[10.5px] font-semibold
                  transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? "border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.12)]"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }
                `}
              >
                <Calendar size={9} strokeWidth={isActive ? 2.2 : 1.75} />
                {day}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="mx-1 h-5 w-px shrink-0 bg-zinc-800" />

        {/* High-impact toggle */}
        <button
          onClick={() => onHighOnly(!highOnly)}
          className={`
            flex shrink-0 items-center gap-1.5 rounded-full border
            px-3 py-1.5 text-[10.5px] font-semibold
            transition-all duration-150 whitespace-nowrap
            ${highOnly
              ? "border-rose-500/35 bg-rose-500/12 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.12)]"
              : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            }
          `}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {highOnly && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
            )}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${highOnly ? "bg-rose-500" : "bg-zinc-700"}`} />
          </span>
          🔥 High Impact
        </button>

        {/* Impact key — desktop only */}
        <div className="ml-auto hidden shrink-0 items-center gap-3 sm:flex">
          {(["High", "Medium", "Low"] as Impact[]).map((lvl) => (
            <span key={lvl} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_CONFIG[lvl].dot}`} />
              {lvl}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DATA ROW CELL ────────────────────────────────────────────────────────────
//
// Renders a Prev / Est / Act triplet.
// "Act" gets colour-coded on beat/miss; null shows a dashed placeholder.

function DataCell({ label, value, isActual, forecast }: {
  label:    string;
  value:    string | null;
  isActual: boolean;
  forecast: string;
}) {
  const isEmpty = value === null;
  const colour  = isActual && value ? getActualColour(value, forecast) : "text-zinc-300";

  return (
    <div className="flex min-w-[44px] flex-col items-center gap-0.5">
      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-700">
        {label}
      </span>
      {isEmpty ? (
        <span className="text-[11px] font-medium text-zinc-700">—</span>
      ) : (
        <div className="flex items-center gap-0.5">
          {isActual && <ActualIcon actual={value!} forecast={forecast} />}
          <span className={`text-[11px] font-semibold tabular-nums ${colour}`}>
            {value}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── IMPACT DOT ──────────────────────────────────────────────────────────────

function ImpactDot({ impact }: { impact: Impact }) {
  const cfg = IMPACT_CONFIG[impact];
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {impact === "High" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-50`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
    </span>
  );
}

// ─── EVENT ROW ────────────────────────────────────────────────────────────────
//
// Renders two layouts:
//   mobile  (sm:hidden) → edge-to-edge list row, border-b separator
//   desktop (hidden sm:flex) → flex row inside the grouped card

function EventRow({ event, isLast }: { event: EconomicEvent; isLast: boolean }) {
  const cur = getCurrencyStyle(event.currency);
  const cfg = IMPACT_CONFIG[event.impact];

  const mobileRow = (
    <div
      className={`
        flex items-center gap-3 px-4 py-3.5 sm:hidden
        ${!isLast ? "border-b border-zinc-800/60" : ""}
        transition-colors duration-100 active:bg-zinc-800/20
      `}
    >
      {/* Left: time + currency */}
      <div className="flex w-[68px] shrink-0 flex-col items-start gap-1">
        <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-400">
          {event.time}
        </span>
        <span
          className={`
            inline-flex items-center rounded border
            px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide
            ${cur.bg} ${cur.text} ${cur.border}
          `}
        >
          {event.currency}
        </span>
      </div>

      {/* Middle: impact dot + title */}
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="mt-[3px] shrink-0">
          <ImpactDot impact={event.impact} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-white">
            {event.title}
          </p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-700">
            {cfg.label} impact
          </p>
        </div>
      </div>

      {/* Right: data grid */}
      <div className="flex shrink-0 items-center gap-2">
        <DataCell label="Prev" value={event.previous} isActual={false} forecast={event.forecast} />
        <div className="h-5 w-px bg-zinc-800/80" />
        <DataCell label="Est"  value={event.forecast}  isActual={false} forecast={event.forecast} />
        <div className="h-5 w-px bg-zinc-800/80" />
        <DataCell label="Act"  value={event.actual}    isActual={true}  forecast={event.forecast} />
      </div>
    </div>
  );

  const desktopRow = (
    <div
      className={`
        hidden sm:flex items-center gap-4 px-5 py-3.5
        ${!isLast ? "border-b border-zinc-800/50" : ""}
        transition-colors duration-100 hover:bg-zinc-800/20
        group
      `}
    >
      {/* Time */}
      <div className="flex w-[80px] shrink-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-medium tabular-nums text-zinc-400">
          <Clock size={9} strokeWidth={1.75} className="shrink-0 text-zinc-700" />
          {event.time}
        </span>
      </div>

      {/* Currency badge */}
      <div className="flex w-[52px] shrink-0 justify-center">
        <span
          className={`
            inline-flex items-center rounded-lg border
            px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide
            ${cur.bg} ${cur.text} ${cur.border}
          `}
        >
          {event.currency}
        </span>
      </div>

      {/* Impact dot */}
      <div className="flex w-5 shrink-0 justify-center">
        <ImpactDot impact={event.impact} />
      </div>

      {/* Title + impact badge */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <p className="truncate text-[13px] font-semibold text-white group-hover:text-zinc-100">
          {event.title}
        </p>
        <span
          className={`
            hidden lg:inline-flex shrink-0 items-center gap-1 rounded-md border
            px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide
            ${cfg.badge}
          `}
        >
          {event.impact}
        </span>
      </div>

      {/* Data grid */}
      <div className="flex shrink-0 items-center gap-3">
        <DataCell label="Prev" value={event.previous} isActual={false} forecast={event.forecast} />
        <div className="h-6 w-px bg-zinc-800" />
        <DataCell label="Forecast" value={event.forecast} isActual={false} forecast={event.forecast} />
        <div className="h-6 w-px bg-zinc-800" />
        <DataCell label="Actual"   value={event.actual}   isActual={true}  forecast={event.forecast} />
      </div>
    </div>
  );

  return (
    <>
      {mobileRow}
      {desktopRow}
    </>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ highOnly }: { highOnly: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <Calendar size={19} className="text-zinc-700" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium text-zinc-500">
        {highOnly ? "No high-impact events for this period." : "No events scheduled."}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-700">
        {highOnly ? "Try removing the High Impact filter." : "Check back later."}
      </p>
    </div>
  );
}

// ─── DESKTOP TABLE HEADER ────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className="hidden sm:flex items-center gap-4 border-b border-zinc-800/70 px-5 py-2.5">
      <div className="w-[80px] shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">Time</span>
      </div>
      <div className="w-[52px] shrink-0 text-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">CCY</span>
      </div>
      <div className="w-5 shrink-0" />
      <div className="flex-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">Event</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="w-[44px] text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">Prev</span>
        <div className="w-px" />
        <span className="w-[52px] text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">Forecast</span>
        <div className="w-px" />
        <span className="w-[44px] text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">Actual</span>
      </div>
    </div>
  );
}

// ─── EVENT FEED ───────────────────────────────────────────────────────────────
//
// Mobile:  naked list rows (full-bleed via -mx-4) with border-b separators.
// Desktop: all rows wrapped in a rounded bordered container card.

function EventFeed({ events }: { events: EconomicEvent[] }) {
  if (events.length === 0) return null;

  return (
    <>
      {/* ── MOBILE FULL-BLEED ── */}
      <div className="-mx-4 sm:hidden">
        {events.map((ev, idx) => (
          <EventRow key={ev.id} event={ev} isLast={idx === events.length - 1} />
        ))}
      </div>

      {/* ── DESKTOP CARD ── */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40">
        <TableHeader />
        {events.map((ev, idx) => (
          <EventRow key={ev.id} event={ev} isLast={idx === events.length - 1} />
        ))}
      </div>
    </>
  );
}

// ─── TIMEZONE NOTE ────────────────────────────────────────────────────────────

function TimezoneNote() {
  return (
    <div className="mt-5 flex items-center justify-center gap-1.5">
      <Globe size={10} className="text-zinc-700" strokeWidth={1.75} />
      <p className="text-[10px] text-zinc-700">
        All times in{" "}
        <span className="font-medium text-zinc-600">UTC</span>.
        Tap an event to set a local alert.
      </p>
    </div>
  );
}

// ─── VOLATILITY LEGEND STRIP (desktop footer) ─────────────────────────────────

function VolatilityLegend() {
  return (
    <div className="mt-6 hidden items-center justify-between gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-2.5 sm:flex">
      <div className="flex items-center gap-1.5">
        <Filter size={10} className="text-zinc-700" strokeWidth={1.75} />
        <span className="text-[10px] font-semibold text-zinc-700">Impact Legend</span>
      </div>
      <div className="flex items-center gap-5">
        {(["High", "Medium", "Low"] as Impact[]).map((lvl) => (
          <span key={lvl} className="flex items-center gap-2 text-[10px] text-zinc-600">
            <span className={`h-2 w-2 rounded-full ${IMPACT_CONFIG[lvl].dot}`} />
            <span className="font-medium">{lvl}</span>
            <span className="text-zinc-700">—</span>
            <span>
              {lvl === "High"   && "Major volatility expected"}
              {lvl === "Medium" && "Moderate market reaction"}
              {lvl === "Low"    && "Minimal price movement"}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-zinc-700">
        <AlertTriangle size={9} strokeWidth={1.75} />
        Data is indicative
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function EconomicCalendarPage() {
  const [activeDay,  setActiveDay]  = useState<DayTab>("Today");
  const [highOnly,   setHighOnly]   = useState(false);

  // Derive the next high-impact upcoming event for the banner.
  const nextCatalyst = ECONOMIC_EVENTS.find(
    (e) => e.impact === "High" && e.actual === null,
  ) ?? ECONOMIC_EVENTS[0];

  // Filter events.
  const visible = ECONOMIC_EVENTS.filter((e) => {
    if (e.day !== activeDay) return false;
    if (highOnly && e.impact !== "High") return false;
    return true;
  });

  // Count helpers for the summary row.
  const todayEvents  = ECONOMIC_EVENTS.filter((e) => e.day === "Today");
  const highCount    = todayEvents.filter((e) => e.impact === "High").length;

  return (
    <div className="relative w-full overflow-x-hidden pb-[72px] pt-4 md:pb-0 md:pt-8">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed left-1/2 top-[25%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.03] blur-[120px]" />

      <div className="relative">

        {/* ── [A] PAGE HEADER ──────────────────────────────────────────── */}
        <header className="mb-4 sm:mb-5">

          {/* Row 1 */}
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Economic Calendar
            </p>
            {/* Today's summary pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-zinc-900/50 px-3 py-1 text-[9.5px] text-zinc-600">
              <span className="font-medium text-zinc-400">{todayEvents.length}</span> events
              <span className="h-px w-px" />
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="font-medium text-rose-400">{highCount}</span> high
            </div>
          </div>

          {/* Row 2: headline */}
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Market{" "}
            <span className="text-sky-400">Catalysts</span>
          </h1>

          {/* Row 3: sub-text — desktop only */}
          <p className="mt-0.5 hidden text-[11px] font-light text-zinc-600 sm:mt-1 sm:block">
            Macro events with the potential to move markets.
            Published before each session opens.
          </p>
        </header>

        {/* ── [B] SMART CATALYST BANNER ────────────────────────────────── */}
        <SmartCatalystBanner event={nextCatalyst} />

        {/* ── [C] FILTER BAR ───────────────────────────────────────────── */}
        <FilterBar
          activeDay={activeDay}
          onDay={setActiveDay}
          highOnly={highOnly}
          onHighOnly={setHighOnly}
        />

        {/* ── [D] EVENT FEED ───────────────────────────────────────────── */}
        {visible.length === 0 ? (
          <EmptyState highOnly={highOnly} />
        ) : (
          <EventFeed events={visible} />
        )}

        {/* ── [E] TIMEZONE NOTE ────────────────────────────────────────── */}
        <TimezoneNote />

        {/* ── [F] VOLATILITY LEGEND ────────────────────────────────────── */}
        <VolatilityLegend />

      </div>
    </div>
  );
}