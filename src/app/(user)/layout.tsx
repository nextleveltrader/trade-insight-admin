// src/app/(user)/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TradeInsight Daily — User Dashboard Layout Wrapper  v8
//
// v8 changes vs v7:
//
//   [NEW] MOBILE TOP HEADER
//     • Import + render <MobileHeader /> — fixed h-14 bar, block md:hidden.
//     • <main> gains `pt-14 md:pt-0` to push page content below the header.
//
//       Why pt-14 and not pt-[56px]?
//         h-14 = 4rem = 56px in Tailwind's default scale. Using `pt-14`
//         keeps the value in the design token system rather than an
//         arbitrary pixel value, and stays consistent if the base font-size
//         changes. The result is identical: 56px clearance on mobile.
//
//       Why md:pt-0?
//         On md+ the desktop sidebar takes over; there is no fixed top bar,
//         so padding-top must reset to zero to avoid a spurious gap.
//
//   [UPDATED] TOP ACCENT LINE SCOPE
//     • The layout's decorative gradient top accent line is now `md:block hidden`
//       (desktop-only). On mobile MobileHeader renders its own matching accent
//       line, so the layout version would double-render at z-30 and bleed
//       through the glassmorphism header. Removing it on mobile is the clean fix.
//
//   [v7 KEPT] Sidebar width math fix: md:w-[calc(100%-220px)] + md:ml-[220px].
//   [v6 KEPT] max-w-[1800px] expansion and xl:px-8 padding.
//   [v5 KEPT] All overflow-x-hidden guards on shell div and <main>.
//   Fonts, animations, mobile pb-[72px], page-enter fade — no regressions.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { UserSidebar }  from "@/components/user/UserSidebar";
import { MobileNav }    from "@/components/user/MobileNav";
import { MobileHeader } from "@/components/user/MobileHeader";   // ← v8

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

        {/* ── [v8] Mobile Top Header — fixed, block md:hidden ─────────────── */}
        {/*
         * Rendered first in the DOM so it paints on top of everything else
         * at z-50. The desktop sidebar is z-40; MobileHeader is z-50.
         * On md+ the component returns nothing (block md:hidden internally),
         * so there is zero performance cost on desktop.
         */}
        <MobileHeader />

        {/* ── Desktop Sidebar — hidden md:flex, z-40 ───────────────────────── */}
        <UserSidebar />

        {/* ── Mobile Bottom Nav — fixed bottom, md:hidden ───────────────────── */}
        <MobileNav />

        {/* ── Main Content Area ─────────────────────────────────────────────── */}
        {/*
         * SPACING BUDGET on mobile:
         *   pt-14  → 56px clearance for the fixed MobileHeader (v8)
         *   pb-[72px] → 72px clearance for the fixed MobileNav (unchanged)
         *   Inner wrapper py-6 → 24px top/bottom inside padding
         *
         * The content therefore starts at: 56px (header) + 24px (inner pt) = 80px
         * from the top of the viewport — comfortable, no overlap.
         *
         * SPACING BUDGET on desktop (md+):
         *   pt-0   → no fixed header; sidebar is a side panel, not top bar
         *   pb-0   → no bottom nav
         *   Inner wrapper py-8 → 32px top/bottom inside padding
         *
         * [CRIT v7] w-full on mobile; md:w-[calc(100%-220px)] + md:ml-[220px]
         * on desktop. The calc() ensures left-edge (220px) + width (100%-220px)
         * = exactly 100vw — no right-side overflow, no cut-off grid columns.
         *
         * NOTE: overflow-y is intentionally NOT set — native viewport scroll
         * is preserved for iOS momentum-scrolling.
         */}
        <main
          className="
            relative
            w-full overflow-x-hidden
            pt-14 md:pt-0
            pb-[72px] md:pb-0
            md:w-[calc(100%-220px)] md:ml-[220px]
            min-h-screen
          "
        >
          {/*
           * [v8] Desktop-only top accent line.
           * Removed from mobile because MobileHeader renders its own matching
           * accent line internally. Keeping both would double the gradient and
           * bleed visually through the glassmorphism backdrop.
           *
           * md:left-[220px] keeps it starting at the sidebar's right edge.
           */}
          <div className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent md:block md:left-[220px]" />

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
