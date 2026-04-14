// src/actions/save-insight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Bookmark / Save toggle for insights.
//
// Auth is now wired to the real Auth.js session via auth() from @/auth.
// Unauthenticated calls throw an "UNAUTHORIZED" error which React's
// useTransition will surface as a rejection, automatically rolling back
// any useOptimistic state in the caller.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { auth }        from "@/auth";
import { getDb }       from "@/db";
import { savedPosts }  from "@/db/schema";
import { and, eq }     from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── INTERNAL HELPER ──────────────────────────────────────────────────────────
// Resolves the current user ID from the Auth.js JWT session.
// Throws if the session is absent or lacks a user ID — callers don't need to
// handle this explicitly because React rolls back optimistic state on throw.

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId  = session?.user?.id;

  if (!userId) {
    throw new Error("UNAUTHORIZED: You must be logged in to save insights.");
  }

  return userId;
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
// Returns the NEW saved state so callers can use it for optimistic updates
// without a follow-up fetch.

export async function toggleSaveInsight(
  postId: number,
): Promise<{ saved: boolean }> {
  const userId    = await requireUserId();
  const db        = getDb();
  const postIdStr = String(postId);

  // Check whether the row already exists.
  const [existing] = await db
    .select({ id: savedPosts.id })
    .from(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postIdStr),
      ),
    )
    .limit(1);

  if (existing) {
    // ── Un-bookmark ──────────────────────────────────────────────────────────
    await db
      .delete(savedPosts)
      .where(eq(savedPosts.id, existing.id));

    revalidatePath("/saved");
    revalidatePath(`/insights/${postId}`);
    return { saved: false };
  }

  // ── Bookmark ───────────────────────────────────────────────────────────────
  await db.insert(savedPosts).values({
    userId,
    postId: postIdStr,
  });

  revalidatePath("/saved");
  revalidatePath(`/insights/${postId}`);
  return { saved: true };
}

// ─── POINT QUERY ─────────────────────────────────────────────────────────────
// Used by the detail page server wrapper to hydrate initial bookmark state.
// Returns false (not saved) if the user is unauthenticated.

export async function getIsSaved(postId: number): Promise<boolean> {
  const session = await auth();
  const userId  = session?.user?.id;
  if (!userId) return false;

  const db        = getDb();
  const postIdStr = String(postId);

  const [existing] = await db
    .select({ id: savedPosts.id })
    .from(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postIdStr),
      ),
    )
    .limit(1);

  return !!existing;
}

// ─── BULK QUERY ───────────────────────────────────────────────────────────────
// Used by the Saved Insights page and the Feed page to get every bookmarked
// post ID for the current user.
// Returns an empty array if the user is unauthenticated.

export async function getSavedPostIds(): Promise<number[]> {
  const session = await auth();
  const userId  = session?.user?.id;
  if (!userId) return [];

  const db = getDb();

  const rows = await db
    .select({ postId: savedPosts.postId })
    .from(savedPosts)
    .where(eq(savedPosts.userId, userId))
    .all();

  return rows.map((r) => Number(r.postId));
}