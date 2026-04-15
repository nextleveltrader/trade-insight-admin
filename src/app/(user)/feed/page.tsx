// src/app/(user)/feed/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component shell — Sprint 2 update.
//
// Changes vs Sprint 1:
//   • Calls getLatestInsights() to fetch real published posts from Turso.
//   • getSavedPostIds() and getLatestInsights() run in parallel via Promise.all
//     so they don't block each other (saves ≈ 1 RTT on every page load).
//   • Passes `insights` array to FeedPageClient instead of an empty default.
//   • Access derivation is unchanged from Sprint 1.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }              from "@/auth";
import { getSavedPostIds }   from "@/actions/save-insight";
import { getLatestInsights } from "@/actions/get-content";
import MarketFeedPage        from "./FeedPageClient";

export default async function FeedPage() {
  const session = await auth();
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;

  const hasAccess =
    isPro || (trialEndsAt !== null && Date.now() < trialEndsAt);

  // Fetch posts and saved IDs concurrently — independent data sources.
  const [insights, savedIds] = await Promise.all([
    getLatestInsights(),
    getSavedPostIds(),
  ]);

  return (
    <MarketFeedPage
      hasAccess={hasAccess}
      insights={insights}
      initialSavedIds={savedIds}
    />
  );
}