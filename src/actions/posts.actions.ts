'use server';

/**
 * src/actions/posts.actions.ts
 *
 * Server Actions for the Blog Posts page.
 * All mutations call revalidatePath('/posts') to keep the server cache
 * consistent, and return the updated record so the client can apply
 * optimistic updates without waiting for a full page re-render.
 */

import { revalidatePath }  from 'next/cache';
import { eq, desc }        from 'drizzle-orm';
import { getDb }           from '@/db';
import { posts, assets }   from '@/db/schema';
import type { DBPost } from '@/db/schema';

// ─── Result wrapper (same pattern as assets.actions.ts) ───────────────────────

type ActionResult<T> =
  | { data: T;    error: null }
  | { data: null; error: string };

function ok<T>(data: T): ActionResult<T>      { return { data, error: null }; }
function err(msg: string): ActionResult<never> {
  console.error('[posts.actions]', msg);
  return { data: null, error: msg };
}

// ─── Joined type returned to the client ──────────────────────────────────────

export type PostWithAsset = DBPost & {
  assetName: string | null; // null when the asset has since been deleted
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Returns all posts joined with their asset name, ordered newest-first.
 * Called once by the Server Component to hydrate PostsManager.
 */
export async function getAllPosts(): Promise<PostWithAsset[]> {
  const db = getDb();

  // Drizzle left join — asset row may be null if asset was deleted
  const rows = await db
    .select({
      id:        posts.id,
      title:     posts.title,
      content:   posts.content,
      status:    posts.status,
      assetId:   posts.assetId,
      createdAt: posts.createdAt,
      assetName: assets.name,
    })
    .from(posts)
    .leftJoin(assets, eq(posts.assetId, assets.id))
    .orderBy(desc(posts.createdAt));

  return rows.map((r) => ({
    id:        r.id,
    title:     r.title,
    content:   r.content,
    status:    r.status,
    assetId:   r.assetId,
    createdAt: r.createdAt,
    assetName: r.assetName ?? null,
  }));
}

// ─── Status update ────────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'published' | 'archived';

/**
 * Updates the status of a single post.
 * Returns the full updated PostWithAsset so the client list stays accurate.
 */
export async function updatePostStatus(
  id: number,
  status: PostStatus,
): Promise<ActionResult<PostWithAsset>> {
  if (!id)     return err('Post ID is required.');
  if (!status) return err('Status is required.');

  try {
    const db = getDb();

    const [updated] = await db
      .update(posts)
      .set({ status })
      .where(eq(posts.id, id))
      .returning();

    if (!updated) return err(`Post ${id} not found.`);

    // Re-fetch with asset name so the client gets a complete PostWithAsset
    const [withAsset] = await db
      .select({
        id:        posts.id,
        title:     posts.title,
        content:   posts.content,
        status:    posts.status,
        assetId:   posts.assetId,
        createdAt: posts.createdAt,
        assetName: assets.name,
      })
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(eq(posts.id, id));

    revalidatePath('/posts');
    return ok({ ...withAsset, assetName: withAsset.assetName ?? null });
  } catch (e) {
    return err(`Failed to update post status: ${String(e)}`);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePost(
  id: number,
): Promise<ActionResult<{ deletedId: number }>> {
  if (!id) return err('Post ID is required.');

  try {
    const db = getDb();
    await db.delete(posts).where(eq(posts.id, id));
    revalidatePath('/posts');
    return ok({ deletedId: id });
  } catch (e) {
    return err(`Failed to delete post: ${String(e)}`);
  }
}