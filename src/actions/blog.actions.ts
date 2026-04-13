'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Initialises a Drizzle client bound to the D1 binding from the current
 * Cloudflare request context.  Must be called inside a request handler or
 * Server Action (not at module-evaluation time).
 */
function getDatabase() {
  return getDb();
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch every published post, newest first.
 *
 * Note: The `category` column on the `posts` table is a plain-text denormalised
 * field (it is NOT a foreign-key to the `categories` table, which belongs to the
 * assets sub-system).  We surface it directly — no JOIN required.
 */
export async function getPublishedPosts(): Promise<PublishedPost[]> {
  const db = getDatabase();

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.createdAt));

  return rows;
}

/**
 * Fetch a single published post by its URL slug.
 * Returns `null` when no matching post is found.
 */
export async function getPostBySlug(slug: string): Promise<PublishedPost | null> {
  if (!slug || typeof slug !== 'string') return null;

  const db = getDatabase();

  const [row] = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        eq(posts.status, 'published'),
      ),
    )
    .limit(1);

  return row ?? null;
}