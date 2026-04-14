// src/app/(user)/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — User Dashboard Layout Wrapper  v6
//
// v6 changes vs v5:
//   [GRID] ULTRA-WIDE MAX-WIDTH EXPANSION
//     • Inner wrapper: max-w-[1200px] → max-w-[1800px]
//       Lets xl:grid-cols-4 and 2xl:grid-cols-5 actually breathe at wide
//       viewports instead of being artificially capped at 1200 px.
//     • px padding on the inner wrapper widened: sm:px-6 → sm:px-8 so
//       cards don't hug the edges on large monitors.
//
//   [OVERFLOW] All v5 overflow-x-hidden guards are preserved unchanged.
//   Everything else (sidebar offset, mobile pb, fonts, animations) is
//   identical to v5 — no regressions.
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
         * [CRIT v5] overflow-x-hidden + w-full — SECONDARY guard.
         * ml-[220px] shifts the main area right of the sidebar on md+.
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
            md:ml-[220px]
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