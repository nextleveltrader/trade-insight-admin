"use client";

// src/components/user/MobileNav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Premium Mobile Bottom Navigation
//
// Design notes:
//   • Fixed bottom bar with glassmorphism — blurs into content below
//   • pb-safe handles iOS home-indicator notch via env(safe-area-inset-bottom)
//   • 5 tabs: Feed · ICT · Calendar · Saved · Profile
//   • Active tab: icon colour + small glowing dot indicator below icon
//     + label fades in only when active (keeps inactive state uncluttered)
//   • Amber "Pro" dot badge on the Profile tab (upgrade nudge)
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BrainCircuit,
  Calendar,
  Bookmark,
  UserCircle2,
} from "lucide-react";

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────

const TABS = [
  {
    label:        "Feed",
    href:         "/feed",
    icon:         LayoutDashboard,
    activeColor:  "text-sky-400",
    glowColor:    "bg-sky-400",
    shadowColor:  "shadow-sky-500/60",
    badgeDot:     false,
  },
  {
    label:        "ICT",
    href:         "/ict",
    icon:         BrainCircuit,
    activeColor:  "text-violet-400",
    glowColor:    "bg-violet-400",
    shadowColor:  "shadow-violet-500/60",
    badgeDot:     false,
  },
  {
    label:        "Calendar",
    href:         "/calendar",
    icon:         Calendar,
    activeColor:  "text-emerald-400",
    glowColor:    "bg-emerald-400",
    shadowColor:  "shadow-emerald-500/60",
    badgeDot:     false,
  },
  {
    label:        "Saved",
    href:         "/saved",
    icon:         Bookmark,
    activeColor:  "text-amber-400",
    glowColor:    "bg-amber-400",
    shadowColor:  "shadow-amber-500/60",
    badgeDot:     false,
  },
  {
    label:        "Profile",
    href:         "/profile",
    icon:         UserCircle2,
    activeColor:  "text-sky-400",
    glowColor:    "bg-sky-400",
    shadowColor:  "shadow-sky-500/60",
    badgeDot:     true,   // amber pro-upgrade nudge
  },
];

// ─── MOBILE NAV COMPONENT ────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/*
       * Inline style for pb-safe — Tailwind's JIT doesn't generate
       * env(safe-area-inset-bottom) by default.
       */}
      <style>{`
        .pb-safe {
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
      `}</style>

      <nav
        className="
          fixed inset-x-0 bottom-0 z-50
          border-t border-zinc-800/70
          bg-zinc-950/85 backdrop-blur-xl
          pb-safe
          md:hidden
        "
      >
        {/* Top micro-accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

        <div className="flex items-end justify-around px-2 pt-2.5">
          {TABS.map((tab) => {
            const Icon     = tab.icon;
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="
                  relative flex flex-col items-center
                  min-w-[56px] pb-1
                "
              >
                {/* Icon container */}
                <div className="relative">
                  {/* Pro badge dot (Profile tab only) */}
                  {tab.badgeDot && !isActive && (
                    <span className="
                      absolute -right-0.5 -top-0.5
                      h-2 w-2 rounded-full
                      border border-zinc-950
                      bg-amber-400
                    " />
                  )}

                  {/* Active: coloured + subtle glow circle bg */}
                  {isActive ? (
                    <div
                      className={`
                        flex h-10 w-10 items-center justify-center
                        rounded-xl
                        ${tab.activeColor}
                        bg-current/[0.08]
                      `}
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={2}
                        className={tab.activeColor}
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center">
                      <Icon
                        size={20}
                        strokeWidth={1.75}
                        className="text-zinc-600"
                      />
                    </div>
                  )}
                </div>

                {/* Label — always visible, just dimmer when inactive */}
                <span
                  className={`
                    mt-0.5 text-[10px] font-medium leading-none
                    transition-colors duration-150
                    ${isActive ? tab.activeColor : "text-zinc-700"}
                  `}
                >
                  {tab.label}
                </span>

                {/* Glowing dot indicator below label */}
                <span
                  className={`
                    mt-1.5 h-0.5 rounded-full
                    transition-all duration-200
                    ${isActive
                      ? `w-4 ${tab.glowColor} shadow-sm ${tab.shadowColor}`
                      : "w-0 bg-transparent"
                    }
                  `}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}