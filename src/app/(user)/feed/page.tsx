// src/app/(user)/feed/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component shell.
//
// Responsibilities:
//   1. Read the Auth.js JWT session via auth().
//   2. Derive `hasAccess` — true for Pro users AND active trial users.
//   3. Fetch the user's saved post IDs from D1 so cards hydrate with the
//      correct bookmark state on first paint (no useEffect waterfall).
//   4. Pass both values as props to the Client Component that owns all
//      interactive state (filters, optimistic bookmarks, etc.).
//
// Access logic (mirrors PROJECT_STATE.md §1):
//   isPro = true                       → full access (paid subscriber)
//   isPro = false && trialEndsAt > now → full access (active trial)
//   isPro = false && trialEndsAt ≤ now → restricted (middleware redirects
//                                         to /pricing before reaching here,
//                                         but we gate defensively anyway)
// ─────────────────────────────────────────────────────────────────────────────

import { auth }           from "@/auth";
import { getSavedPostIds } from "@/actions/save-insight";
import MarketFeedPage     from "./FeedPageClient";

export default async function FeedPage() {
  const session     = await auth();
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;

  const hasAccess =
    isPro ||
    (trialEndsAt !== null && Date.now() < trialEndsAt);

  // Fetch saved IDs server-side so InsightCards can receive `initialIsSaved`
  // without a client-side useEffect round-trip.
  const savedIds = await getSavedPostIds();

  return (
    <MarketFeedPage
      hasAccess={hasAccess}
      initialSavedIds={savedIds}
    />
  );
}