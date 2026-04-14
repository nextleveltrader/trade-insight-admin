// src/app/(user)/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — User Dashboard Layout Wrapper  v7
//
// v7 changes vs v6:
//   [CRIT] SIDEBAR WIDTH MATH FIX — right-side cutoff on desktop
//     • <main>: replaced `w-full md:ml-[220px]` with
//       `w-full md:w-[calc(100%-220px)] md:ml-[220px]`.
//
//       Root cause: `w-full` resolves to 100vw on the block axis. Adding
//       `md:ml-[220px]` on top pushes the right edge to 100vw + 220px,
//       exceeding the viewport and cutting off the rightmost grid columns.
//
//       Fix: at md+ the explicit width is clamped to exactly
//       `100% − 220px`, so left-edge + width = 100vw precisely.
//       On mobile (< md) `w-full` remains correct because there is no
//       sidebar offset.
//
//   [v6 KEPT] Ultra-wide max-w-[1800px] expansion and xl:px-8 padding.
//   [v5 KEPT] All overflow-x-hidden guards on shell div and <main>.
//   Fonts, animations, sidebar offset, mobile pb — no regressions.
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
       * [CRIT v5] overflow-x-hidden + w-full on the outermost shell.
       * PRIMARY guard: no child element can ever create a horizontal
       * scrollbar or the white-gap artefact on the right edge of the screen.
       */}
      <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">

        {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
        <UserSidebar />

        {/* ── Mobile Bottom Nav ─────────────────────────────────────────── */}
        <MobileNav />

        {/* ── Main Content Area ─────────────────────────────────────────── */}
        {/*
         * [CRIT v7] w-full on mobile; md:w-[calc(100%-220px)] + md:ml-[220px]
         * on desktop. The calc() ensures left-edge (220px) + width (100%-220px)
         * = exactly 100vw — no right-side overflow, no cut-off grid columns.
         * pb-[72px] keeps content above the mobile bottom nav on small screens.
         * min-h-screen fills the background on short pages.
         *
         * NOTE: overflow-y is intentionally NOT set — native viewport scroll
         * is preserved for iOS momentum-scrolling.
         */}
        <main
          className="
            relative
            w-full overflow-x-hidden
            md:w-[calc(100%-220px)] md:ml-[220px]
            pb-[72px] md:pb-0
            min-h-screen
          "
        >
          {/* Top accent line */}
          <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent md:left-[220px]" />

          {/*
           * [v6] Inner wrapper:
           *   • max-w bumped from 1200px → 1800px so xl:grid-cols-4 and
           *     2xl:grid-cols-5 have room to breathe.
           *   • px-4 on mobile, px-6 on sm, px-8 on xl+ for comfortable
           *     card-to-edge spacing at large viewport sizes.
           *   • page-enter fade animation preserved from v5.
           */}
          <div className="page-enter mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}