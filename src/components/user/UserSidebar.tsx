"use client";

// src/components/user/UserSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Premium Desktop Sidebar
//
// Design notes:
//   • Glassmorphism shell: bg-zinc-950/80 + backdrop-blur-xl + border-r
//   • Logo mirrors the landing page exactly (Activity icon + brand wordmark)
//   • Nav items: icon + label + active state via usePathname
//     Active = left-border glow + icon colour pop + bg tint
//   • Pro Trial badge: amber/gold gradient card at the bottom
//   • Settings link: subtle zinc icon row above the trial badge
//   • Width: 220 px on lg, 64 px (icon-only) on md — full on lg
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  BrainCircuit,
  Calendar,
  Bookmark,
  Settings,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Lock,
} from "lucide-react";

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label:    "Market Feed",
    href:     "/feed",
    icon:     LayoutDashboard,
    accent:   "sky",
    // Tailwind classes keyed by accent colour
    activeBg:     "bg-sky-500/[0.08]",
    activeBorder: "border-sky-500/70",
    activeIcon:   "text-sky-400",
    activeText:   "text-white",
    activeDot:    "bg-sky-400",
    hoverBg:      "hover:bg-sky-500/[0.04]",
    hoverText:    "hover:text-zinc-200",
  },
  {
    label:    "ICT Setups",
    href:     "/ict",
    icon:     BrainCircuit,
    accent:   "violet",
    activeBg:     "bg-violet-500/[0.08]",
    activeBorder: "border-violet-500/70",
    activeIcon:   "text-violet-400",
    activeText:   "text-white",
    activeDot:    "bg-violet-400",
    hoverBg:      "hover:bg-violet-500/[0.04]",
    hoverText:    "hover:text-zinc-200",
  },
  {
    label:    "Smart Calendar",
    href:     "/calendar",
    icon:     Calendar,
    accent:   "emerald",
    activeBg:     "bg-emerald-500/[0.08]",
    activeBorder: "border-emerald-500/70",
    activeIcon:   "text-emerald-400",
    activeText:   "text-white",
    activeDot:    "bg-emerald-400",
    hoverBg:      "hover:bg-emerald-500/[0.04]",
    hoverText:    "hover:text-zinc-200",
  },
  {
    label:    "Saved Insights",
    href:     "/saved",
    icon:     Bookmark,
    accent:   "amber",
    activeBg:     "bg-amber-500/[0.08]",
    activeBorder: "border-amber-500/70",
    activeIcon:   "text-amber-400",
    activeText:   "text-white",
    activeDot:    "bg-amber-400",
    hoverBg:      "hover:bg-amber-500/[0.04]",
    hoverText:    "hover:text-zinc-200",
  },
];

// ─── SIDEBAR COMPONENT ────────────────────────────────────────────────────────

export function UserSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        fixed inset-y-0 left-0 z-40
        flex w-[220px] flex-col
        hidden md:flex w-[220px] flex-col
        border-r border-zinc-800/60
        bg-zinc-950/80 backdrop-blur-xl
      "
    >
      {/* ── Top accent line (mirrors landing page hero) ─────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800/60 px-4">
        <Link href="/feed" className="flex items-center gap-2.5 group">
          <div
            className="
              relative flex h-7 w-7 shrink-0 items-center justify-center
              rounded-lg bg-sky-500
              shadow-[0_0_14px_rgba(14,165,233,0.45)]
              transition-shadow duration-300
              group-hover:shadow-[0_0_22px_rgba(14,165,233,0.65)]
            "
          >
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Trade<span className="text-sky-400">Insight</span>{" "}
            <span className="font-light text-zinc-500">Daily</span>
          </span>
        </Link>
      </div>

      {/* ── Market pulse micro-strip ──────────────────────────────────────── */}
      <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] font-medium text-zinc-500">
          Markets <span className="text-emerald-400">Open</span>
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-700">
          <TrendingUp size={9} />
          Live
        </span>
      </div>

      {/* ── Section label ─────────────────────────────────────────────────── */}
      <p className="mt-5 px-4 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-700">
        Navigation
      </p>

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <nav className="mt-1.5 flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon    = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-3 rounded-xl
                border px-3 py-2.5
                transition-all duration-150
                ${isActive
                  ? `${item.activeBg} ${item.activeBorder} ${item.activeText}`
                  : `border-transparent text-zinc-500 ${item.hoverBg} ${item.hoverText}`
                }
              `}
            >
              {/* Left glow bar (active only) */}
              {isActive && (
                <span
                  className={`
                    absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2
                    rounded-full ${item.activeDot}
                    shadow-[0_0_8px_2px] shadow-current
                  `}
                />
              )}

              {/* Icon */}
              <Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.75}
                className={`
                  shrink-0 transition-colors duration-150
                  ${isActive ? item.activeIcon : "text-zinc-600 group-hover:text-zinc-400"}
                `}
              />

              {/* Label */}
              <span className="text-[13px] font-medium leading-none">
                {item.label}
              </span>

              {/* Chevron hint on hover (inactive only) */}
              {!isActive && (
                <ChevronRight
                  size={11}
                  className="
                    ml-auto text-zinc-800
                    opacity-0 transition-opacity duration-150
                    group-hover:opacity-100
                  "
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom zone ───────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2 border-t border-zinc-800/60 p-3">

        {/* Settings link */}
        <Link
          href="/settings"
          className="
            group flex items-center gap-3 rounded-xl border border-transparent
            px-3 py-2.5 text-zinc-500
            transition-all duration-150
            hover:border-zinc-800/60 hover:bg-zinc-900/60 hover:text-zinc-300
          "
        >
          <Settings
            size={15}
            strokeWidth={1.75}
            className="shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400"
          />
          <span className="text-[13px] font-medium">Settings</span>
        </Link>

        {/* Pro Trial badge */}
        <div
          className="
            relative overflow-hidden rounded-xl
            border border-amber-500/20
            bg-gradient-to-br from-amber-500/[0.07] via-amber-600/[0.04] to-transparent
            p-3.5
          "
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/15 blur-2xl" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15">
                <Sparkles size={10} className="text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-amber-400">Pro Trial</span>
            </div>

            {/* Progress bar: 14/30 days used */}
            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                style={{ width: "47%" }}   /* 14/30 ≈ 47 % */
              />
            </div>

            <p className="mb-2.5 text-[10px] font-light leading-relaxed text-zinc-500">
              <span className="font-semibold text-amber-400/80">14 days</span> left on your free trial.
            </p>

            <Link
              href="/upgrade"
              className="
                flex w-full items-center justify-center gap-1.5
                rounded-lg bg-amber-500/15
                border border-amber-500/25
                px-3 py-1.5
                text-[11px] font-semibold text-amber-400
                transition-all duration-150
                hover:bg-amber-500/25 hover:border-amber-500/40
              "
            >
              <Lock size={9} />
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}