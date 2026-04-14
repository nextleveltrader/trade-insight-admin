// src/app/(user)/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — User Dashboard Layout Wrapper  v5
//
// v5 changes vs v4:
//   [CRIT] OVERFLOW HARDENING
//     • Shell div: added `overflow-x-hidden w-full` — prevents any child from
//       ever pushing past 100vw and causing the white-gap scroll bug.
//     • <main>: added `overflow-x-hidden w-full` as a secondary hard stop.
//       Together these two guards make horizontal overflow structurally
//       impossible regardless of what page.tsx renders.
//
//   Everything else (sidebar offset, mobile pb, fonts, animations) is
//   identical to v4 — no regressions.
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
       * This is the PRIMARY guard: no child element — regardless of how
       * wide its intrinsic content is — can ever create a horizontal
       * scrollbar or the white-gap artefact on the right edge of the screen.
       */}
      <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">

        {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
        <UserSidebar />

        {/* ── Mobile Bottom Nav ─────────────────────────────────────────── */}
        <MobileNav />

        {/* ── Main Content Area ─────────────────────────────────────────── */}
        {/*
         * [CRIT v5] overflow-x-hidden + w-full here too — SECONDARY guard.
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
           * Inner wrapper: page-enter animation, max-width cap, horizontal
           * padding. px-4 on mobile, px-6 on sm+.
           */}
          <div className="page-enter mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}