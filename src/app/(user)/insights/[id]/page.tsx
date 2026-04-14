// src/app/(user)/insights/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component wrapper.
//
// Responsibilities:
//   1. Resolve the insight ID from params (Next.js 15 async params).
//   2. Fetch the initial bookmark state from D1 — runs on the server before
//      any HTML is sent to the client, so the bookmark icon hydrates in the
//      correct filled/unfilled state with zero flicker.
//   3. Hand both values down to the Client Component as plain props.
// ─────────────────────────────────────────────────────────────────────────────

import { getIsSaved } from "@/actions/save-insight";
import InsightDetailClient from "./InsightDetailClient";

interface PageProps {
  // Next.js 15 App Router passes params as a Promise.
  params: Promise<{ id: string }>;
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { id }       = await params;
  const insightId    = Number(id);
  const initialIsSaved = await getIsSaved(insightId);

  return (
    <InsightDetailClient
      insightId={insightId}
      initialIsSaved={initialIsSaved}
    />
  );
}