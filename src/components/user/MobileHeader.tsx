"use client";

// src/components/user/MobileHeader.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Mobile Top Header  v2
//
// v2 changes vs v1:
//
//   [REPLACED] The ThemeToggle button on the far right has been joined by a
//              new <UserMenu /> component — a session-aware avatar button with
//              a dropdown that shows the user's name, email, trial/pro status,
//              and a Sign Out action.
//
//   [LAYOUT] Right section now contains:
//              [LanguageSwitcher] [divider] [UserMenu]
//            ThemeToggle is absorbed into the UserMenu dropdown (common pattern
//            for mobile — keeps the fixed header uncluttered). If you prefer
//            to keep the ThemeToggle as a standalone button, re-add it between
//            the divider and the UserMenu.
//
//   [KEPT v1] Brand logo, Markets Open pulse strip, LanguageDropdown,
//             glassmorphism shell, z-50 fixed positioning, accent line.
//
// UserMenu z-index:  z-[60] — clears header (z-50) and MobileNav (z-50).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Activity,
  Languages,
  ChevronDown,
  TrendingUp,
  Check,
  LogOut,
  Settings,
  Crown,
  Sparkles,
  Clock,
  Lock,
  User,
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

function getDaysLeft(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86_400_000));
}

// ─── LANGUAGE DATA ────────────────────────────────────────────────────────────

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
] as const;

type Language = (typeof LANGUAGES)[number];

// ─── LANGUAGE DROPDOWN ────────────────────────────────────────────────────────

function LanguageDropdown() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<Language>(LANGUAGES[0]);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch language"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`
          flex h-8 w-8 items-center justify-center rounded-lg
          border transition-all duration-150
          ${open
            ? "border-sky-500/40 bg-sky-500/12 text-sky-400"
            : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200"
          }
        `}
      >
        <Languages size={15} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="
            absolute right-0 top-full z-[60] mt-2
            w-52 overflow-hidden
            rounded-2xl border border-zinc-800/80
            bg-zinc-950/96 backdrop-blur-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.55)]
          "
        >
          <div className="flex items-center gap-2 border-b border-zinc-800/60 px-3.5 py-2.5">
            <Languages size={11} className="text-sky-400" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
              AI Translate
            </span>
            <span className="ml-auto rounded border border-zinc-800 bg-zinc-900 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-zinc-700">
              Beta
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto overscroll-contain py-1 [&::-webkit-scrollbar]:hidden">
            {LANGUAGES.map((lang) => {
              const isActive = selected.code === lang.code;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { setSelected(lang); setOpen(false); }}
                  className={`
                    flex w-full items-center gap-3 px-3.5 py-2
                    text-left transition-colors duration-100
                    ${isActive
                      ? "bg-sky-500/[0.09] text-sky-400"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }
                  `}
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {isActive && <Check size={11} className="text-sky-400" strokeWidth={2.5} />}
                  </span>
                  <span className="flex-1 text-[12px] font-medium leading-none">
                    {lang.label}
                  </span>
                  <span className={`
                    text-[10.5px] leading-none
                    ${isActive ? "text-sky-500/60" : "text-zinc-600"}
                    ${["ar", "ur"].includes(lang.code) ? "font-light" : ""}
                  `}>
                    {lang.native}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-zinc-800/60 px-3.5 py-2">
            <p className="text-[9.5px] font-light leading-relaxed text-zinc-700">
              AI translation powered by Claude.
              <br />
              Accuracy may vary for technical terms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── USER MENU ────────────────────────────────────────────────────────────────
// Session-aware avatar button with a compact dropdown.
// Shows user info, trial/pro status badge, settings link, and sign-out action.

function UserMenu() {
  const [open, setOpen]   = useState(false);
  const wrapperRef        = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const user      = session?.user;
  const isPro     = user?.isPro ?? false;
  const daysLeft  = getDaysLeft(user?.trialEndsAt);
  const isExpired = !isPro && daysLeft === 0;
  const initials  = getInitials(user?.name);

  // Status badge colour for the avatar ring
  const ringColor = isPro
    ? "ring-amber-400/50"
    : isExpired
    ? "ring-rose-500/50"
    : daysLeft <= 3
    ? "ring-rose-500/50"
    : "ring-sky-500/30";

  return (
    <div className="relative" ref={wrapperRef}>

      {/* ── Avatar trigger ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`
          relative flex h-8 w-8 items-center justify-center overflow-hidden
          rounded-lg ring-1 transition-all duration-150
          ${open ? `bg-sky-500/20 ${ringColor}` : `bg-zinc-900 ${ringColor} hover:bg-zinc-800`}
        `}
      >
        {status === "loading" ? (
          <span className="h-3 w-3 animate-pulse rounded-full bg-zinc-700" />
        ) : user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-sky-300 select-none">
            {initials}
          </span>
        )}

        {/* Pro crown micro-badge */}
        {isPro && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 ring-1 ring-zinc-950">
            <Crown size={6} strokeWidth={2.5} className="text-zinc-950" />
          </span>
        )}

        {/* Expired dot */}
        {isExpired && !isPro && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-1 ring-zinc-950" />
        )}
      </button>

      {/* ── Dropdown panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          role="menu"
          className="
            absolute right-0 top-full z-[60] mt-2
            w-64 overflow-hidden
            rounded-2xl border border-zinc-800/80
            bg-zinc-950/96 backdrop-blur-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.55)]
          "
        >

          {/* Identity header */}
          <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
            {/* Avatar */}
            <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-500/20 ring-1 ${ringColor} text-sky-300 text-xs font-bold`}>
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="select-none">{initials}</span>
              )}
              {isPro && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 ring-1 ring-zinc-950">
                  <Crown size={7} strokeWidth={2.5} className="text-zinc-950" />
                </span>
              )}
            </div>

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white leading-none">
                {user?.name ?? "User"}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-zinc-600 leading-none">
                {user?.email ?? ""}
              </p>
            </div>
          </div>

          {/* Status badge row */}
          <div className="border-b border-zinc-800/60 px-4 py-2.5">
            {isPro ? (
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15">
                  <Crown size={10} strokeWidth={1.75} className="text-amber-400" />
                </div>
                <span className="text-[11px] font-bold text-amber-400">Pro Member</span>
                <span className="ml-auto text-[9.5px] text-zinc-600">Full access</span>
              </div>
            ) : isExpired ? (
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/15">
                  <Clock size={10} strokeWidth={1.75} className="text-rose-400" />
                </div>
                <span className="text-[11px] font-bold text-rose-400">Trial Expired</span>
                <Link
                  href="/upgrade"
                  onClick={() => setOpen(false)}
                  className="ml-auto flex items-center gap-1 text-[9.5px] font-semibold text-amber-400 hover:text-amber-300"
                >
                  <Lock size={8} />
                  Upgrade
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15">
                  <Sparkles size={10} strokeWidth={1.75} className="text-amber-400" />
                </div>
                <span className={`text-[11px] font-bold ${daysLeft <= 3 ? "text-rose-400" : "text-amber-400"}`}>
                  Pro Trial
                </span>
                <span className={`ml-auto text-[10px] font-semibold tabular-nums ${daysLeft <= 3 ? "text-rose-400" : "text-amber-400/80"}`}>
                  {daysLeft}d left
                </span>
              </div>
            )}
          </div>

          {/* Menu actions */}
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-zinc-400 transition-colors duration-100 hover:bg-zinc-800/50 hover:text-zinc-200"
            >
              <Settings size={13} strokeWidth={1.75} className="shrink-0" />
              <span className="text-[12px] font-medium">Account Settings</span>
            </Link>

            {!isPro && (
              <Link
                href="/upgrade"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-amber-400/80 transition-colors duration-100 hover:bg-amber-500/[0.07] hover:text-amber-400"
              >
                <Lock size={13} strokeWidth={1.75} className="shrink-0" />
                <span className="text-[12px] font-medium">Upgrade to Pro</span>
              </Link>
            )}

            <button
              role="menuitem"
              onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-zinc-600 transition-colors duration-100 hover:bg-rose-500/[0.07] hover:text-rose-400"
            >
              <LogOut size={13} strokeWidth={1.75} className="shrink-0" />
              <span className="text-[12px] font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOBILE HEADER ────────────────────────────────────────────────────────────

export function MobileHeader() {
  return (
    <header
      className="
        fixed inset-x-0 top-0 z-50
        block md:hidden
        flex h-14 items-center justify-between
        border-b border-zinc-800/60
        bg-zinc-950/80 backdrop-blur-xl
        px-4
      "
    >
      {/* Top accent gradient line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/35 to-transparent" />

      {/* ── LEFT: Brand logo ──────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="group flex shrink-0 items-center gap-2.5"
      >
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

      {/* ── CENTRE: Live market pulse ──────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="hidden min-[380px]:flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9.5px] font-medium text-emerald-400">
            Markets Open
          </span>
          <TrendingUp size={9} className="text-emerald-600" strokeWidth={1.75} />
        </div>
      </div>

      {/* ── RIGHT: Action buttons ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1">

        {/* Language Switcher */}
        <LanguageDropdown />

        {/* 1px divider */}
        <div className="mx-1 h-4 w-px bg-zinc-800" aria-hidden="true" />

        {/* Session-aware User Menu (replaces static ThemeToggle) */}
        <UserMenu />

      </div>
    </header>
  );
}