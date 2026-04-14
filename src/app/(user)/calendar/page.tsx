// src/app/(user)/calendar/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component shell.
//
// Derives `hasProAccess` from the real Auth.js session and passes it to the
// Client Component that owns all interactive state (tabs, accordion, etc.).
//
// Access rule (mirrors PROJECT_STATE.md §1):
//   isPro = true                       → full access
//   isPro = false && trialEndsAt > now → full access (active trial)
//   otherwise                          → restricted (middleware redirected
//                                         to /pricing; this is a safety net)
// ─────────────────────────────────────────────────────────────────────────────

import { auth }                from "@/auth";
import EconomicCalendarPage    from "./CalendarPageClient";

export default async function CalendarPage() {
  const session     = await auth();
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;

  const hasProAccess =
    isPro ||
    (trialEndsAt !== null && Date.now() < trialEndsAt);

  return <EconomicCalendarPage hasProAccess={hasProAccess} />;
}