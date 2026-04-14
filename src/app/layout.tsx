// src/app/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Root layout — Server Component.
//
// v2 changes vs v1:
//   [NEW] Wraps children in <Providers> (our "use client" SessionProvider
//         boundary) so that useSession() works in any Client Component
//         throughout the entire app — both the user dashboard and the
//         public/auth routes.
//
//   [KEPT] Inter font, bg-zinc-950, no sidebar here — each route group
//          ((user), (admin), (auth), (public)) owns its own layout.
//
// NOTE: ConditionalLayout.tsx is NOT imported here. That file is orphaned
// and safe to delete (see PROJECT_STATE.md §4 Cleanup Plan).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Trade Insight Daily",
  description: "Market Analysis & AI Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-white`}>
        {/*
         * <Providers> is a "use client" component that mounts Auth.js's
         * SessionProvider. All child components can now call useSession()
         * without any additional setup.
         *
         * The SessionProvider fetches the session once on mount and caches
         * it in React context; it does NOT refetch on every render.
         * It also handles token rotation (updateAge: 24h from auth.ts).
         */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}