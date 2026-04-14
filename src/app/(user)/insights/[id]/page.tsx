// src/app/(user)/insights/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component wrapper.
//
// Responsibilities:
//   1. Resolve the insight ID from params (Next.js 15 async params).
//   2. Read the Auth.js JWT session via auth().
//   3. Derive isLoggedIn and hasProAccess from the real session.
//   4. Fetch the initial bookmark state from Turso — runs on the server
//      before any HTML is sent so the icon hydrates correctly with zero flicker.
//   5. Pass all four values down to the Client Component as plain props.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }        from "@/auth";
import { getIsSaved }  from "@/actions/save-insight";
import InsightDetailClient from "./InsightDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { id }    = await params;
  const insightId = Number(id);

  // ── Session ───────────────────────────────────────────────────────────────
  const session     = await auth();
  const isLoggedIn  = !!session?.user?.id;
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;

  const hasProAccess =
    isPro ||
    (trialEndsAt !== null && Date.now() < trialEndsAt);

  // ── Bookmark state ────────────────────────────────────────────────────────
  const initialIsSaved = await getIsSaved(insightId);

  return (
    <InsightDetailClient
      insightId={insightId}
      initialIsSaved={initialIsSaved}
      isLoggedIn={isLoggedIn}
      hasProAccess={hasProAccess}
    />
  );
}