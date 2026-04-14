// src/app/actions/save-insight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Bookmark / Save toggle for insights.
//
// Uses a hardcoded MOCK_USER_ID until Auth.js session is wired.
// Swap the constant for:
//   import { auth } from '@/auth';
//   const session = await auth();
//   const userId = session?.user?.id ?? null;
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { getDb }      from "@/db";
import { savedPosts } from "@/db/schema";
import { and, eq }    from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────
// Replace with real session lookup once Auth.js is wired.
const MOCK_USER_ID = "mock-user-123";

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
//
// Returns the NEW saved state so callers can use it for optimistic updates
// without a follow-up fetch.

export async function toggleSaveInsight(
  postId: number,
): Promise<{ saved: boolean }> {
  const db         = getDb();
  const postIdStr  = String(postId);

  // Check whether the row already exists.
  const [existing] = await db
    .select({ id: savedPosts.id })
    .from(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, MOCK_USER_ID),
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
    userId: MOCK_USER_ID,
    postId: postIdStr,
  });

  revalidatePath("/saved");
  revalidatePath(`/insights/${postId}`);
  return { saved: true };
}

// ─── POINT QUERY ─────────────────────────────────────────────────────────────
// Used by the detail page server wrapper to hydrate initial bookmark state.

export async function getIsSaved(postId: number): Promise<boolean> {
  const db        = getDb();
  const postIdStr = String(postId);

  const [existing] = await db
    .select({ id: savedPosts.id })
    .from(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, MOCK_USER_ID),
        eq(savedPosts.postId, postIdStr),
      ),
    )
    .limit(1);

  return !!existing;
}

// ─── BULK QUERY ───────────────────────────────────────────────────────────────
// Used by the Saved Insights page to get every bookmarked post ID.

export async function getSavedPostIds(): Promise<number[]> {
  const db = getDb();

  const rows = await db
    .select({ postId: savedPosts.postId })
    .from(savedPosts)
    .where(eq(savedPosts.userId, MOCK_USER_ID))
    .all();

  return rows.map((r) => Number(r.postId));
}