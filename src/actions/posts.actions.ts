'use server';

/**
 * src/actions/posts.actions.ts
 *
 * Sprint 2 update — added the seven new posts columns to every db.select()
 * projection so the returned shape matches the inferred DBPost type.
 *
 * Root cause of the Vercel build error:
 *   PostWithAsset = DBPost & { assetName }
 *   DBPost        = typeof posts.$inferSelect   ← grows with every schema change
 *   Every explicit db.select({...}) must list ALL DBPost columns or TypeScript
 *   correctly rejects the narrower shape as unassignable to PostWithAsset.
 *
 * Fix strategy:
 *   Extract a single POST_SELECT constant that maps every posts column.
 *   All three select calls reference it — future schema additions only need
 *   one change here, not three.
 */

import { revalidatePath }    from 'next/cache';
import { eq, desc }          from 'drizzle-orm';
import { checkAuth }         from '@/actions/auth.actions';
import { getDb }             from '@/db';
import { posts, assets }     from '@/db/schema';
import type { DBPost, Asset } from '@/db/schema';

// ─── Result wrapper ───────────────────────────────────────────────────────────

type ActionResult<T> =
  | { data: T;    error: null }
  | { data: null; error: string };

function ok<T>(data: T): ActionResult<T>      { return { data, error: null }; }
function err(msg: string): ActionResult<never> {
  console.error('[posts.actions]', msg);
  return { data: null, error: msg };
}

// ─── Joined type ──────────────────────────────────────────────────────────────

export type PostWithAsset = DBPost & {
  assetName: string | null;
};

export type PostStatus = 'draft' | 'published' | 'archived';

// ─── Shared column projection ─────────────────────────────────────────────────
//
// Every db.select() that returns PostWithAsset must include ALL columns from
// `posts` — otherwise TypeScript rejects the narrower shape as unassignable
// to DBPost (which is typeof posts.$inferSelect, i.e. every column).
//
// Centralising the projection here means a future schema change only needs
// one update instead of three.

const POST_SELECT = {
  // ── Core ────────────────────────────────────────────────────────────────────
  id:              posts.id,
  title:           posts.title,
  content:         posts.content,
  status:          posts.status,
  assetId:         posts.assetId,

  // ── SEO / taxonomy ──────────────────────────────────────────────────────────
  category:        posts.category,
  tags:            posts.tags,
  slug:            posts.slug,
  metaDescription: posts.metaDescription,
  metaKeywords:    posts.metaKeywords,

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt:       posts.createdAt,
  publishedAt:     posts.publishedAt,    // ← Sprint 2

  // ── Sprint 2 content-pipeline columns ───────────────────────────────────────
  direction:       posts.direction,
  biasType:        posts.biasType,
  summary:         posts.summary,
  body:            posts.body,
  isProOnly:       posts.isProOnly,
  confidence:      posts.confidence,

  // ── Joined asset column (not part of DBPost — appended separately below) ────
  assetName:       assets.name,
} as const;

// ─── Page data (posts + asset selector list) ──────────────────────────────────

export type PostsPageData = {
  posts:  PostWithAsset[];
  assets: Pick<Asset, 'id' | 'name'>[];
};

/**
 * Single call from the Server Component — returns all posts (joined with asset
 * name, newest first) and the full asset list for the "Create Post" form
 * selector.  Requires admin authentication.
 */
export async function getPostsPageData(): Promise<PostsPageData> {
  await checkAuth();

  try {
    const db = getDb();

    const [postRows, assetRows] = await Promise.all([
      db
        .select(POST_SELECT)
        .from(posts)
        .leftJoin(assets, eq(posts.assetId, assets.id))
        .orderBy(desc(posts.createdAt)),

      db
        .select({ id: assets.id, name: assets.name })
        .from(assets),
    ]);

    return {
      posts:  postRows.map((r) => ({ ...r, assetName: r.assetName ?? null })),
      assets: assetRows,
    };
  } catch (error) {
    console.error('Error in getPostsPageData:', error);
    throw error;
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreatePostInput = {
  title:           string;
  content:         string;
  status:          PostStatus;
  assetId:         number | null;
  category:        string | null;
  tags:            string | null;
  slug:            string | null;
  metaDescription: string | null;
  metaKeywords:    string | null;
  // ── Sprint 2 fields (all optional — admin form may not expose them yet) ──
  direction:       string | null;
  biasType:        string | null;
  summary:         string | null;
  body:            string | null;
  isProOnly:       number;          // 0 | 1
  confidence:      number;          // 0–100
  publishedAt:     string | null;   // ISO-8601 or null
};

export async function createManualPost(
  input: CreatePostInput,
): Promise<ActionResult<PostWithAsset>> {
  await checkAuth();
  if (!input.title.trim())   return err('Title is required.');
  if (!input.content.trim()) return err('Content is required.');

  try {
    const db = getDb();

    const [row] = await db
      .insert(posts)
      .values({
        title:           input.title.trim(),
        content:         input.content.trim(),
        status:          input.status,
        assetId:         input.assetId,
        category:        input.category        || null,
        tags:            input.tags            || null,
        slug:            input.slug            || null,
        metaDescription: input.metaDescription || null,
        metaKeywords:    input.metaKeywords    || null,
        // ── Sprint 2 ──────────────────────────────────────────────────────────
        direction:       input.direction       || null,
        biasType:        input.biasType        || null,
        summary:         input.summary         || null,
        body:            input.body            || null,
        isProOnly:       input.isProOnly       ?? 0,
        confidence:      input.confidence      ?? 0,
        publishedAt:     input.publishedAt     || null,
      })
      .returning();

    // Re-fetch with the joined asset name using the shared projection.
    const [withAsset] = await db
      .select(POST_SELECT)
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(eq(posts.id, row.id));

    revalidatePath('/posts');
    return ok({ ...withAsset, assetName: withAsset.assetName ?? null });
  } catch (e) {
    return err(`Failed to create post: ${String(e)}`);
  }
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function updatePostStatus(
  id:     number,
  status: PostStatus,
): Promise<ActionResult<PostWithAsset>> {
  await checkAuth();
  if (!id)     return err('Post ID is required.');
  if (!status) return err('Status is required.');

  try {
    const db = getDb();

    // When publishing, stamp publishedAt if it isn't already set.
    const extra =
      status === 'published'
        ? { publishedAt: new Date().toISOString() }
        : {};

    await db
      .update(posts)
      .set({ status, ...extra })
      .where(eq(posts.id, id));

    const [withAsset] = await db
      .select(POST_SELECT)
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
  await checkAuth();
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