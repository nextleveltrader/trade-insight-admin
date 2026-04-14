"use client";

// src/components/providers/SessionProvider.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Thin "use client" boundary that wraps the app in Auth.js's SessionProvider.
//
// WHY a separate wrapper?
//   The root layout (src/app/layout.tsx) is a Server Component. Auth.js's
//   <SessionProvider> requires "use client" context, so it cannot be imported
//   directly inside a Server Component. The standard pattern is to create a
//   minimal client wrapper here and import it in the server layout.
//
// USAGE in layout.tsx:
//   import { Providers } from "@/components/providers/SessionProvider";
//   ...
//   <Providers>{children}</Providers>
// ─────────────────────────────────────────────────────────────────────────────

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}