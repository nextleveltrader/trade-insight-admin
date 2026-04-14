// src/app/(user)/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — User Dashboard Layout Wrapper
//
// Renders:
//   • UserSidebar  (fixed, 220 px)  — hidden on mobile (< md)
//   • MobileNav    (fixed bottom)   — hidden on md+
//   • <main>       — scrollable content area with correct offsets
//
// Offset logic:
//   Desktop : ml-[220px]  (sidebar width)
//   Mobile  : pb-[72px]   (bottom-nav height + safe-area buffer)
//
// The Outfit font is imported via a <style> tag consistent with the landing
// page approach; in production swap for next/font/google in layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { UserSidebar } from "@/components/user/UserSidebar";
import { MobileNav }   from "@/components/user/MobileNav";

export const metadata: Metadata = {
  title:       "Dashboard — Trade Insight Daily",
  description: "Your personal institutional market analysis hub.",
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

function DashboardStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Outfit font — swap for next/font/google in production */
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          html { font-family: 'Outfit', sans-serif; }

          /* ── Subtle scrollbar styling (Webkit) ───────────────────────── */
          ::-webkit-scrollbar       { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb {
            background: rgba(63, 63, 70, 0.7);  /* zinc-700 */
            border-radius: 99px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(82, 82, 91, 0.9);  /* zinc-600 */
          }

          /* ── Page-transition fade ────────────────────────────────────── */
          @keyframes pageFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          .page-enter {
            animation: pageFadeIn 0.22s ease-out forwards;
          }

          /* ── Sidebar active-item left-bar glow ───────────────────────── */
          /* shadow-current doesn't work on arbitrary colours in Tailwind,  */
          /* so we set the box-shadow via CSS for the active indicator bar. */
          [data-active-bar] {
            box-shadow: 0 0 8px 2px currentColor;
          }
        `,
      }}
    />
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardStyles />

      {/*
       * Root shell — full-height, zinc-950 background.
       * Matches the landing page colour so the two pages share
       * the same visual DNA.
       */}
      <div className="min-h-screen bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">

        {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
        {/*
         * Rendered server-side compatible wrapper.
         * UserSidebar itself is 'use client' for usePathname.
         */}
        <UserSidebar />

        {/* ── Mobile Bottom Nav ─────────────────────────────────────────── */}
        <MobileNav />

        {/* ── Main Content Area ─────────────────────────────────────────── */}
        {/*
         * ml-[220px] : offset from the fixed sidebar on md+ screens
         * pb-[72px]  : breathing room above the mobile bottom nav
         * min-h-screen ensures the bg fills even on short pages
         *
         * overflow-y-auto is NOT set here — the native viewport scroll
         * is preserved so the browser's own momentum-scrolling on iOS works.
         */}
        <main
          className="
            relative
            md:ml-[220px]
            pb-[72px] md:pb-0
            min-h-screen
          "
        >
          {/*
           * Top accent line — matches the sidebar's top line so they
           * feel like one continuous surface at the top of the viewport.
           */}
          <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent md:left-[220px]" />

          {/*
           * Inner wrapper applies the page-enter animation.
           * Max-width + horizontal padding keep content readable at
           * any viewport width without overflowing into the sidebar.
           */}
          <div className="page-enter mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}