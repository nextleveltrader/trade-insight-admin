"use client";

// src/components/user/MobileHeader.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — Mobile Top Header  v1
//
// Visible only on mobile (block md:hidden).
// Fixed at the top with glassmorphism shell matching UserSidebar exactly:
//   bg-zinc-950/80 + backdrop-blur-xl + border-b border-zinc-800/60
//
// Layout (h-14, flex items-center justify-between px-4):
//
//   LEFT  — Brand logo (Activity icon + "TradeInsight Daily" wordmark).
//            Pixel-identical to the sidebar logo row (same size, same gap,
//            same colour split) so the brand feels continuous across breakpoints.
//
//   CENTRE — Live market pulse dot (hidden on xs via min-w-0 flex-1 justify-center).
//            Keeps the header from looking empty when the screen is ≥380px.
//
//   RIGHT  — Two icon-buttons, separated by a 1px zinc-800 divider:
//              1. Language Switcher (Languages icon) — opens a compact dropdown
//                 listing 12 languages. UI-only; wire to i18n in production.
//              2. Theme Toggle (Sun ↔ Moon) — local UI state only.
//                 Replace useState with next-themes or similar in production.
//
// Dropdown behaviour:
//   • Rendered inside a `relative` wrapper so it positions relative to its
//     trigger button, not the fixed header edge.
//   • z-[60] — clears the header (z-50) and the MobileNav.
//   • useEffect + ref for outside-click-to-close (industry-standard pattern).
//   • The dropdown scrolls internally (max-h-[280px] overflow-y-auto) so it
//     never overflows the viewport on short screens.
//
// Integration: see layout.tsx — the header's h-14 (56px) height is offset by
// `pt-14 md:pt-0` on <main> so content is never hidden behind it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Languages,
  Sun,
  Moon,
  ChevronDown,
  TrendingUp,
  Check,
} from "lucide-react";

// ─── LANGUAGE DATA ────────────────────────────────────────────────────────────
// Matches the 12-language set in the Insight Reading Page exactly.

const LANGUAGES = [
  { code: "en", label: "English",    native: "English"  },
  { code: "bn", label: "Bengali",    native: "বাংলা"     },
  { code: "es", label: "Spanish",    native: "Español"  },
  { code: "ar", label: "Arabic",     native: "العربية"  },
  { code: "fr", label: "French",     native: "Français" },
  { code: "de", label: "German",     native: "Deutsch"  },
  { code: "hi", label: "Hindi",      native: "हिन्दी"    },
  { code: "id", label: "Indonesian", native: "Indonesia"},
  { code: "ja", label: "Japanese",   native: "日本語"    },
  { code: "pt", label: "Portuguese", native: "Português"},
  { code: "tr", label: "Turkish",    native: "Türkçe"   },
  { code: "ur", label: "Urdu",       native: "اردو"     },
] as const;

type Language = (typeof LANGUAGES)[number];

// ─── LANGUAGE DROPDOWN ────────────────────────────────────────────────────────

function LanguageDropdown() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<Language>(LANGUAGES[0]);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  // Close on any click outside this component
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
    }
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>

      {/* ── Trigger ──────────────────────────────────────────────────────── */}
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

      {/* ── Dropdown panel ───────────────────────────────────────────────── */}
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
          {/* Header strip */}
          <div className="flex items-center gap-2 border-b border-zinc-800/60 px-3.5 py-2.5">
            <Languages size={11} className="text-sky-400" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
              AI Translate
            </span>
            <span className="ml-auto rounded border border-zinc-800 bg-zinc-900 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-zinc-700">
              Beta
            </span>
          </div>

          {/* Scrollable language list */}
          <div className="max-h-[260px] overflow-y-auto overscroll-contain py-1 [&::-webkit-scrollbar]:hidden">
            {LANGUAGES.map((lang) => {
              const isActive = selected.code === lang.code;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelected(lang);
                    setOpen(false);
                  }}
                  className={`
                    flex w-full items-center gap-3 px-3.5 py-2
                    text-left transition-colors duration-100
                    ${isActive
                      ? "bg-sky-500/[0.09] text-sky-400"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }
                  `}
                >
                  {/* Check mark – only visible on selected row */}
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {isActive && (
                      <Check size={11} className="text-sky-400" strokeWidth={2.5} />
                    )}
                  </span>

                  {/* Language name */}
                  <span className="flex-1 text-[12px] font-medium leading-none">
                    {lang.label}
                  </span>

                  {/* Native script */}
                  <span
                    className={`
                      text-[10.5px] leading-none
                      ${isActive ? "text-sky-500/60" : "text-zinc-600"}
                      ${["ar", "ur"].includes(lang.code) ? "font-light" : ""}
                    `}
                  >
                    {lang.native}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
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

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
// UI state only. In production, wire to next-themes:
//   const { theme, setTheme } = useTheme();
//   const isDark = theme === "dark";
//   const toggle = () => setTheme(isDark ? "light" : "dark");

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true); // default: dark

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="
        flex h-8 w-8 items-center justify-center rounded-lg
        border border-transparent text-zinc-400
        transition-all duration-150
        hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200
        active:scale-95
      "
    >
      {/* Crossfade between Sun and Moon */}
      <span className="relative flex h-[15px] w-[15px] items-center justify-center">
        <Moon
          size={15}
          strokeWidth={1.75}
          className={`
            absolute transition-all duration-200
            ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}
          `}
        />
        <Sun
          size={15}
          strokeWidth={1.75}
          className={`
            absolute transition-all duration-200
            ${!isDark ? "opacity-100 rotate-0 scale-100 text-amber-400" : "opacity-0 rotate-90 scale-75"}
          `}
        />
      </span>
    </button>
  );
}

// ─── MOBILE HEADER ────────────────────────────────────────────────────────────

export function MobileHeader() {
  return (
    /*
     * block md:hidden — only rendered on mobile.
     * fixed top-0 z-50 — sits above all page content.
     * h-14 — 56px; matches UserSidebar's logo row height (also h-14).
     * The layout's `pt-14 md:pt-0` on <main> offsets this exactly.
     */
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
      {/* Top accent gradient line — mirrors sidebar's own top line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/35 to-transparent" />

      {/* ── LEFT: Brand logo ──────────────────────────────────────────────── */}
      {/*
       * Pixel-identical to UserSidebar's logo row.
       * Same Activity icon size, same gap, same colour weights —
       * so the brand reads consistently when the sidebar is hidden.
       */}
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

      {/* ── CENTRE: Live market pulse (flex-1, only appears on ≥380px) ──── */}
      {/*
       * Uses flex-1 + flex justify-center so it fills the space between
       * logo and action buttons without needing absolute positioning.
       * `min-w-0` prevents it from pushing siblings out of frame on tiny
       * screens — it will simply shrink to zero if there's no room.
       */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="hidden min-[380px]:flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1">
          {/* Animated pulse dot */}
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
        <div className="mx-1 h-4 w-px bg-zinc-800" />

        {/* Theme Toggle */}
        <ThemeToggle />

      </div>
    </header>
  );
}