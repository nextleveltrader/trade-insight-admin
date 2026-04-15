// src/app/(user)/insights/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component wrapper — Sprint 2 update.
//
// Changes vs Sprint 1:
//   • Calls getInsightById(id) to fetch the real post (with body HTML) from
//     Turso.  Returns null → client renders <NotFound />.
//   • Passes the full UIInsightDetail object to InsightDetailClient so the
//     client component needs zero local mock data.
//   • All three data fetches (session, bookmark state, post) run in
//     Promise.all — a single round of concurrent I/O.
//   • generateMetadata() is added so <title> and <meta description> reflect
//     the real post content for SEO / social sharing.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { auth }              from "@/auth";
import { getIsSaved }        from "@/actions/save-insight";
import { getInsightById }    from "@/actions/get-content";
import InsightDetailClient   from "./InsightDetailClient";
import { UIInsightDetail }   from "@/types/content";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── DYNAMIC METADATA ─────────────────────────────────────────────────────────
// Runs on the server before streaming; uses the real post data for OG tags.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id }    = await params;
  const insightId = Number(id);
  const post      = await getInsightById(insightId);

  if (!post) {
    return {
      title:       "Insight Not Found — Trade Insight Daily",
      description: "This analysis could not be found.",
    };
  }

  return {
    title:       `${post.asset} ${post.direction} — ${post.biasType} | Trade Insight Daily`,
    description: post.summary || `${post.direction} bias for ${post.asset}. Published ${post.publishedAt}.`,
    openGraph: {
      title:       `${post.asset} — ${post.biasType}`,
      description: post.summary,
      type:        "article",
    },
  };
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function InsightDetailPage({ params }: PageProps) {
  const { id }    = await params;
  const insightId = Number(id);

  // All three fetches are independent — run them in parallel.
  const [session, post, initialIsSaved] = await Promise.all([
    auth(),
    getInsightById(insightId),
    getIsSaved(insightId),
  ]);

  // Derive access flags from the real session.
  const isLoggedIn  = !!session?.user?.id;
  const isPro       = session?.user?.isPro       ?? false;
  const trialEndsAt = session?.user?.trialEndsAt ?? null;
  const hasProAccess =
    isPro || (trialEndsAt !== null && Date.now() < trialEndsAt);

  return (
    <InsightDetailClient
      post={post}                  // null → NotFound rendered by client
      insightId={insightId}
      initialIsSaved={initialIsSaved}
      isLoggedIn={isLoggedIn}
      hasProAccess={hasProAccess}
    />
  );
}