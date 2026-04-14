"use client";

// src/components/user/MobileNav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Premium Mobile Bottom Navigation  v2
//
// v2 changes vs v1:
//
//   [UPDATED] Profile tab — now reads the Auth.js session via useSession().
//     • Shows the user's real initials (or a User icon when loading/unauthenticated)
//       instead of the static UserCircle2 icon. This gives the tab a personal
//       feel and visually confirms the user is logged in.
//     • The amber Pro badge dot is now conditional:
//         - Hidden if the user is a Pro member (no upgrade nudge needed).
//         - Shown as a rose dot if the trial is expired (urgent upgrade nudge).
//         - Shown as the original amber dot if the trial is active (soft nudge).
//     • Tapping Profile navigates to /profile (Phase 4 page). Until that page
//       exists the route will 404, which is acceptable — the navigation
//       structure is correct and the page will be built in Sprint 4.
//
//   [KEPT v1] All other tabs (Feed, ICT, Calendar, Saved), glassmorphism
//             shell, pb-safe iOS safe-area handling, active state glow dots,
//             label fade animation.
//
// NOTE: We deliberately do NOT call signOut() from the nav tab. Sign-out is
// available in MobileHeader's UserMenu dropdown (and in UserSidebar's
// ProfileWidget on desktop). The Profile tab remains a navigation link.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BrainCircuit,
  Calendar,
  Bookmark,
  User,
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDaysLeft(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86_400_000));
}

// ─── STATIC TAB DEFINITIONS ──────────────────────────────────────────────────
// Profile tab is rendered separately to inject session-aware content.

const STATIC_TABS = [
  {
    label:       "Feed",
    href:        "/feed",
    icon:        LayoutDashboard,
    activeColor: "text-sky-400",
    glowColor:   "bg-sky-400",
    shadowColor: "shadow-sky-500/60",
  },
  {
    label:       "ICT",
    href:        "/ict",
    icon:        BrainCircuit,
    activeColor: "text-violet-400",
    glowColor:   "bg-violet-400",
    shadowColor: "shadow-violet-500/60",
  },
  {
    label:       "Calendar",
    href:        "/calendar",
    icon:        Calendar,
    activeColor: "text-emerald-400",
    glowColor:   "bg-emerald-400",
    shadowColor: "shadow-emerald-500/60",
  },
  {
    label:       "Saved",
    href:        "/saved",
    icon:        Bookmark,
    activeColor: "text-amber-400",
    glowColor:   "bg-amber-400",
    shadowColor: "shadow-amber-500/60",
  },
] as const;

const PROFILE_TAB = {
  label:       "Profile",
  href:        "/profile",
  activeColor: "text-sky-400",
  glowColor:   "bg-sky-400",
  shadowColor: "shadow-sky-500/60",
} as const;

// ─── SESSION-AWARE PROFILE TAB ICON ──────────────────────────────────────────

function ProfileTabIcon({
  isActive,
  initials,
  isLoading,
}: {
  isActive:  boolean;
  initials:  string;
  isLoading: boolean;
}) {
  const baseClass = "flex h-10 w-10 items-center justify-center rounded-xl";

  if (isLoading || !initials) {
    // Fallback to User icon while session loads or if name is unavailable
    return (
      <div
        className={baseClass}
        style={isActive ? { background: "rgba(255,255,255,0.04)" } : undefined}
      >
        <User
          size={20}
          strokeWidth={isActive ? 2 : 1.75}
          className={isActive ? PROFILE_TAB.activeColor : "text-zinc-600"}
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} ${
        isActive
          ? `ring-1 ring-sky-500/40 bg-sky-500/15 text-sky-300`
          : "bg-zinc-900/80 ring-1 ring-zinc-800/60 text-zinc-500"
      }`}
    >
      <span
        className={`
          text-[10px] font-bold leading-none select-none
          ${isActive ? "text-sky-300" : "text-zinc-500"}
        `}
      >
        {initials}
      </span>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user      = session?.user;
  const isPro     = user?.isPro ?? false;
  const daysLeft  = getDaysLeft(user?.trialEndsAt);
  const isExpired = !isPro && daysLeft === 0;
  const initials  = getInitials(user?.name);

  // Badge dot logic for the Profile tab (only when not active)
  // Rose = trial expired (urgent), Amber = trial active (soft nudge), none = Pro
  const badgeDotClass = isPro
    ? ""
    : isExpired
    ? "bg-rose-500 border-zinc-950"
    : "bg-amber-400 border-zinc-950";

  const profileIsActive =
    pathname === PROFILE_TAB.href || pathname.startsWith(PROFILE_TAB.href + "/");

  return (
    <>
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

          {/* ── Static tabs ─────────────────────────────────────────────── */}
          {STATIC_TABS.map((tab) => {
            const Icon     = tab.icon;
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-w-[56px] flex-col items-center pb-1"
              >
                {/* Icon container */}
                {isActive ? (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${tab.activeColor}`}
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Icon size={20} strokeWidth={2} className={tab.activeColor} />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <Icon size={20} strokeWidth={1.75} className="text-zinc-600" />
                  </div>
                )}

                {/* Label */}
                <span
                  className={`
                    mt-0.5 text-[10px] font-medium leading-none
                    transition-colors duration-150
                    ${isActive ? tab.activeColor : "text-zinc-700"}
                  `}
                >
                  {tab.label}
                </span>

                {/* Glowing indicator dot */}
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

          {/* ── Profile tab (session-aware) ──────────────────────────────── */}
          <Link
            href={PROFILE_TAB.href}
            className="relative flex min-w-[56px] flex-col items-center pb-1"
          >
            {/* Badge dot (only when not active and not Pro) */}
            {!profileIsActive && !isPro && (
              <span
                className={`
                  absolute right-3 top-0
                  h-2 w-2 rounded-full border
                  ${badgeDotClass}
                `}
                aria-hidden="true"
              />
            )}

            {/* Session-aware avatar icon */}
            <ProfileTabIcon
              isActive={profileIsActive}
              initials={initials}
              isLoading={status === "loading"}
            />

            {/* Label */}
            <span
              className={`
                mt-0.5 text-[10px] font-medium leading-none
                transition-colors duration-150
                ${profileIsActive ? PROFILE_TAB.activeColor : "text-zinc-700"}
              `}
            >
              {PROFILE_TAB.label}
            </span>

            {/* Glowing indicator dot */}
            <span
              className={`
                mt-1.5 h-0.5 rounded-full
                transition-all duration-200
                ${profileIsActive
                  ? `w-4 ${PROFILE_TAB.glowColor} shadow-sm ${PROFILE_TAB.shadowColor}`
                  : "w-0 bg-transparent"
                }
              `}
            />
          </Link>

        </div>
      </nav>
    </>
  );
}