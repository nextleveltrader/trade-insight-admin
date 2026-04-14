"use client";

// src/components/user/ProfileWidget.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Live Session Profile Widget
//
// Replaces the hardcoded "Pro Trial" amber card in UserSidebar with a
// component that reads the actual Auth.js session via useSession().
//
// RENDERS (in order):
//   1. User Identity Card   — avatar (image or initials), name, email, settings link
//   2. Status Card          — one of three states:
//        a) Pro Member       — sky accent, Crown icon, "Full access · No expiry"
//        b) Trial Active     — amber accent, real daysLeft + progress bar, Upgrade CTA
//        c) Trial Expired    — rose accent, "Trial has ended", Upgrade CTA
//   3. Sign Out button      — calls signOut({ callbackUrl: "/login" })
//
// LOADING STATE:
//   Two skeleton rectangles that pulse while the session is being fetched.
//   This avoids a layout shift on initial mount.
//
// TRIAL MATH:
//   daysLeft = Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86_400_000))
//   This matches the authoritative formula in src/actions/auth-actions.ts
//   → checkTrialStatus().
//
//   trialProgress = ((14 - daysLeft) / 14) * 100  clamped to [0, 100].
//   The bar fills left-to-right as time is consumed, giving the user a
//   natural sense of urgency as the bar approaches full/100%.
//
// URGENCY TIERS:
//   daysLeft ≤ 3 → rose colour scheme (urgent)
//   daysLeft ≤ 7 → amber colour scheme (warning — same as default for this
//                  component, but more saturated text)
//   daysLeft  > 7 → standard amber
//
// DESIGN CONSTRAINTS:
//   • Glassmorphism: matches UserSidebar's bg-zinc-950/80 shell.
//   • All spacing/radius tokens match the sidebar's existing bottom zone.
//   • No new external dependencies beyond next-auth/react.
// ─────────────────────────────────────────────────────────────────────────────

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles,
  Lock,
  LogOut,
  Crown,
  Clock,
  Settings,
  ShieldCheck,
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Returns up-to-2-character uppercase initials from a display name. */
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Days remaining in the trial, floored at 0.
 * Uses the same ceiling formula as checkTrialStatus() in auth-actions.ts.
 */
function getDaysLeft(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86_400_000));
}

/**
 * Percentage of the 14-day trial that has been consumed.
 * 0% on day 1, 100% when expired.
 */
function getTrialProgress(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 100;
  const daysLeft = getDaysLeft(trialEndsAt);
  return Math.min(100, Math.max(0, ((14 - daysLeft) / 14) * 100));
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function WidgetSkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      {/* Identity card placeholder */}
      <div className="h-[52px] rounded-xl bg-zinc-900/60" />
      {/* Status card placeholder */}
      <div className="h-[100px] rounded-xl bg-zinc-900/60" />
      {/* Sign-out placeholder */}
      <div className="h-[40px] rounded-xl bg-zinc-900/60" />
    </div>
  );
}

// ─── PROFILE WIDGET ───────────────────────────────────────────────────────────

export function ProfileWidget() {
  const { data: session, status } = useSession();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return <WidgetSkeleton />;
  }

  // ── Derive state ───────────────────────────────────────────────────────────
  const user         = session?.user;
  const isPro        = user?.isPro      ?? false;
  const daysLeft     = getDaysLeft(user?.trialEndsAt);
  const isTrialActive  = !isPro && daysLeft > 0;
  const isTrialExpired = !isPro && daysLeft === 0;
  const trialProgress  = getTrialProgress(user?.trialEndsAt);
  const initials       = getInitials(user?.name);

  // Urgency tier colours (applied to the active-trial card)
  const isUrgent        = daysLeft <= 3;
  const urgencyText     = isUrgent ? "text-rose-400"        : "text-amber-400";
  const urgencySubText  = isUrgent ? "text-rose-400/70"     : "text-amber-400/80";
  const urgencyBg       = isUrgent
    ? "from-rose-500/[0.07] via-rose-600/[0.04]"
    : "from-amber-500/[0.07] via-amber-600/[0.04]";
  const urgencyBorder   = isUrgent ? "border-rose-500/20"   : "border-amber-500/20";
  const urgencyGlow     = isUrgent ? "bg-rose-500/15"       : "bg-amber-500/15";
  const urgencyIconBg   = isUrgent ? "bg-rose-500/15"       : "bg-amber-500/15";
  const urgencyBarGrad  = isUrgent
    ? "from-rose-500 to-rose-400"
    : "from-amber-500 to-amber-400";
  const urgencyCtaBg    = isUrgent
    ? "bg-rose-500/15 border-rose-500/25 text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/40"
    : "bg-amber-500/15 border-amber-500/25 text-amber-400 hover:bg-amber-500/25 hover:border-amber-500/40";

  return (
    <div className="space-y-2">

      {/* ── 1. User Identity Card ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">

        {/* Avatar — real image (Google OAuth) or initials fallback */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-500/20 ring-1 ring-sky-500/30 text-sky-300 text-[11px] font-bold">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User avatar"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="select-none">{initials}</span>
          )}

          {/* Crown badge overlay for Pro users */}
          {isPro && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 ring-1 ring-zinc-950">
              <Crown size={7} strokeWidth={2.5} className="text-zinc-950" />
            </span>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-none text-white">
            {user?.name ?? "User"}
          </p>
          <p className="mt-0.5 truncate text-[10px] leading-none text-zinc-600">
            {user?.email ?? ""}
          </p>
        </div>

        {/* Settings shortcut */}
        <Link
          href="/settings"
          aria-label="Account settings"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-700 transition-colors duration-150 hover:text-zinc-400"
        >
          <Settings size={12} strokeWidth={1.75} />
        </Link>
      </div>

      {/* ── 2. Status Card ────────────────────────────────────────────────── */}

      {isPro ? (
        // ── 2a. Pro Member ─────────────────────────────────────────────────
        <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.07] via-sky-600/[0.04] to-transparent p-3.5">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-500/15 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/15">
                <Crown size={11} strokeWidth={1.75} className="text-sky-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold leading-none text-sky-400">
                  Pro Member
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-light leading-none text-zinc-600">
                  <ShieldCheck size={8} strokeWidth={1.5} className="text-sky-500/50" />
                  Full access · No expiry
                </p>
              </div>
            </div>
          </div>
        </div>

      ) : isTrialActive ? (
        // ── 2b. Trial Active ───────────────────────────────────────────────
        <div
          className={`
            relative overflow-hidden rounded-xl border ${urgencyBorder}
            bg-gradient-to-br ${urgencyBg} to-transparent p-3.5
          `}
        >
          {/* Ambient glow */}
          <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full ${urgencyGlow} blur-2xl`} />

          <div className="relative">
            {/* Header row */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className={`flex h-5 w-5 items-center justify-center rounded-md ${urgencyIconBg}`}>
                <Sparkles size={10} strokeWidth={1.75} className={urgencyText} />
              </div>
              <span className={`text-[11px] font-bold ${urgencyText}`}>
                Pro Trial
              </span>
              {/* Days remaining counter — right-aligned */}
              <span className={`ml-auto text-[11px] font-bold tabular-nums ${urgencyText}`}>
                {daysLeft}d left
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${urgencyBarGrad} transition-all duration-700`}
                style={{ width: `${trialProgress}%` }}
                role="progressbar"
                aria-valuenow={trialProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Trial time consumed"
              />
            </div>

            {/* Subtext */}
            <p className="mb-2.5 text-[10px] font-light leading-relaxed text-zinc-500">
              <span className={`font-semibold ${urgencySubText}`}>
                {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </span>{" "}
              remaining on your free trial.
            </p>

            {/* Upgrade CTA */}
            <Link
              href="/upgrade"
              className={`
                flex w-full items-center justify-center gap-1.5
                rounded-lg border px-3 py-1.5
                text-[11px] font-semibold
                transition-all duration-150
                ${urgencyCtaBg}
              `}
            >
              <Lock size={9} strokeWidth={2} />
              Upgrade to Pro
            </Link>
          </div>
        </div>

      ) : (
        // ── 2c. Trial Expired ──────────────────────────────────────────────
        <div className="relative overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.07] via-rose-600/[0.04] to-transparent p-3.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-rose-500/15 blur-2xl" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/15">
                <Clock size={10} strokeWidth={1.75} className="text-rose-400" />
              </div>
              <span className="text-[11px] font-bold text-rose-400">
                Trial Expired
              </span>
            </div>

            <p className="mb-2.5 text-[10px] font-light leading-relaxed text-zinc-500">
              Your free trial has ended. Upgrade to restore full access.
            </p>

            <Link
              href="/upgrade"
              className="
                flex w-full items-center justify-center gap-1.5
                rounded-lg border border-rose-500/25 bg-rose-500/15
                px-3 py-1.5
                text-[11px] font-semibold text-rose-400
                transition-all duration-150
                hover:border-rose-500/40 hover:bg-rose-500/25
              "
            >
              <Lock size={9} strokeWidth={2} />
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}

      {/* ── 3. Sign Out ───────────────────────────────────────────────────── */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="
          group flex w-full items-center gap-2.5 rounded-xl
          border border-transparent
          px-3 py-2.5 text-zinc-600
          transition-all duration-150
          hover:border-zinc-800/60 hover:bg-zinc-900/60 hover:text-rose-400
        "
      >
        <LogOut
          size={13}
          strokeWidth={1.75}
          className="shrink-0 transition-colors duration-150 group-hover:text-rose-400"
        />
        <span className="text-[12px] font-medium">Sign Out</span>
      </button>
    </div>
  );
}