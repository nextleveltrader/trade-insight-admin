'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';

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
 * Fetch a single published post by its URL slug **or** its numeric ID.
 *
 * The listing page links to `/blog/${post.slug ?? post.id}`, so the dynamic
 * segment can be either a human-readable slug ("xauusd-weekly-outlook") or a
 * bare integer ("12").  This function handles both:
 *
 *  - Numeric string  → WHERE (id = $n   OR slug = $slugOrId) AND status = 'published'
 *  - Non-numeric     → WHERE  slug = $slugOrId               AND status = 'published'
 *
 * Using OR when the input is numeric means a row is matched whether the slug
 * column has since been populated or not, while still preventing a full-table
 * scan when a real slug is provided.
 *
 * Returns `null` when no matching published post is found.
 */
export async function getPostBySlug(slugOrId: string): Promise<PublishedPost | null> {
  if (!slugOrId || typeof slugOrId !== 'string') return null;

  const db = getDatabase();

  const isNumeric = /^\d+$/.test(slugOrId);

  const lookupCondition = isNumeric
    ? or(
        eq(posts.id,   parseInt(slugOrId, 10)),
        eq(posts.slug, slugOrId),
      )
    : eq(posts.slug, slugOrId);

  const [row] = await db
    .select()
    .from(posts)
    .where(
      and(
        lookupCondition,
        eq(posts.status, 'published'),
      ),
    )
    .limit(1);

  return row ?? null;
}