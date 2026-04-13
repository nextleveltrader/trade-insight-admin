'use server';

import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { DBPost } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublishedPost = {
  id: number;
  title: string;
  content: string;
  status: string;
  assetId: number | null;
  createdAt: number;
  category: string | null;
  tags: string | null;
  slug: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
};

export type UpdatePostData = {
  title?: string;
  content?: string;
  status?: string;
  category?: string | null;
  tags?: string | null;
  slug?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a Drizzle client bound to the Cloudflare D1 binding.
 * getDb() internally calls getRequestContext().env — must be invoked inside a
 * Server Action or Route Handler, never at module-evaluation time.
 */
function getDatabase() {
  return getDb();
}

// ─── Read Actions ─────────────────────────────────────────────────────────────

/**
 * Fetch every published post, newest first.
 */
export async function getPublishedPosts(): Promise<PublishedPost[]> {
  const db = getDatabase();

  return db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.createdAt));
}

/**
 * Fetch a single published post by its URL slug **or** numeric ID.
 *
 * - Numeric string  → WHERE (id = $n OR slug = $slugOrId) AND status = 'published'
 * - Non-numeric     → WHERE  slug = $slugOrId              AND status = 'published'
 */
export async function getPostBySlug(slugOrId: string): Promise<PublishedPost | null> {
  if (!slugOrId || typeof slugOrId !== 'string') return null;

  const db = getDatabase();
  const isNumeric = /^\d+$/.test(slugOrId);

  const lookupCondition = isNumeric
    ? or(
        eq(posts.id, parseInt(slugOrId, 10)),
        eq(posts.slug, slugOrId),
      )
    : eq(posts.slug, slugOrId);

  const [row] = await db
    .select()
    .from(posts)
    .where(and(lookupCondition, eq(posts.status, 'published')))
    .limit(1);

  return row ?? null;
}

/**
 * Fetch any post (any status) by its numeric ID.
 * Used by the admin edit page to load drafts and archived posts too.
 */
export async function getPostById(id: number): Promise<DBPost | null> {
  const db = getDatabase();

  const [row] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  return row ?? null;
}

// ─── Write Actions ────────────────────────────────────────────────────────────

/**
 * Update an existing post.
 *
 * Next.js 15 note: this function is called from a Client Component via
 * `startTransition(async () => { await updatePost(...) })`.
 * No `params` awaiting is needed here because there are no route params — the
 * `id` is passed explicitly as an argument.
 */
export async function updatePost(id: number, data: UpdatePostData): Promise<void> {
  const db = getDatabase();

  await db
    .update(posts)
    .set(data)
    .where(eq(posts.id, id));

  // Revalidate the admin listing, the edit page, and the public blog route.
  revalidatePath('/posts');
  revalidatePath(`/posts/${id}`);
  if (data.slug) revalidatePath(`/blog/${data.slug}`);
}

/**
 * Permanently delete a post.
 *
 * Reads the slug first so we can also revalidate the public blog route after
 * deletion (the row will no longer exist once deleted).
 */
export async function deletePost(id: number): Promise<void> {
  const db = getDatabase();

  // Capture slug before deleting so we can purge the public cache entry.
  const [meta] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  await db.delete(posts).where(eq(posts.id, id));

  revalidatePath('/posts');
  if (meta?.slug) revalidatePath(`/blog/${meta.slug}`);
}