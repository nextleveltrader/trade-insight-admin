'use server';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublishedPost = {
  id: number;
  title: string;
  content: string;
  status: 'draft' | 'published';
  assetId: number | null;
  createdAt: number;
  category: string | null;
  tags: string | null;
  slug: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
};

export type PostFormData = {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDatabase() {
  return getDb();
}

// ─── Public Blog Actions ──────────────────────────────────────────────────────

export async function getPublishedPosts(): Promise<PublishedPost[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.createdAt));
    
  // ⚡️ FIX: Casting the result to PublishedPost[]
  return rows as PublishedPost[];
}

export async function getPostBySlug(slugOrId: string): Promise<PublishedPost | null> {
  if (!slugOrId || typeof slugOrId !== 'string') return null;

  const db = getDatabase();
  const isNumeric = /^\d+$/.test(slugOrId);

  const lookupCondition = isNumeric
    ? or(eq(posts.id, parseInt(slugOrId, 10)), eq(posts.slug, slugOrId))
    : eq(posts.slug, slugOrId);

  const [row] = await db
    .select()
    .from(posts)
    .where(and(lookupCondition, eq(posts.status, 'published')))
    .limit(1);

  // ⚡️ FIX: Casting the result
  return (row as PublishedPost) ?? null;
}

// ─── Admin CMS Actions (CRUD) ─────────────────────────────────────────────────

export async function getAllPosts(): Promise<PublishedPost[]> {
  const db = getDatabase();
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  
  // ⚡️ FIX: Casting the result
  return rows as PublishedPost[];
}

export async function getPostById(id: string | number): Promise<PublishedPost | undefined> {
  const db = getDatabase();
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, numericId))
    .limit(1);
    
  // ⚡️ FIX: Casting the result
  return (post as PublishedPost) || undefined;
}

export async function createPost(
  data: PostFormData
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    const db = getDatabase();
    const result = await db
      .insert(posts)
      .values({
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status,
        createdAt: Date.now(), 
      })
      .returning({ id: posts.id });

    revalidatePath('/posts');
    revalidatePath('/blog');

    return { success: true, id: result[0].id };
  } catch (err) {
    console.error('[createPost]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create post.',
    };
  }
}

export async function updatePost(
  id: string | number,
  data: Partial<PostFormData>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const db = getDatabase();
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    await db
      .update(posts)
      .set(data)
      .where(eq(posts.id, numericId));

    revalidatePath('/posts');
    revalidatePath(`/posts/${numericId}`);
    revalidatePath('/blog');
    if (data.slug) {
      revalidatePath(`/blog/${data.slug}`);
    }

    return { success: true };
  } catch (err) {
    console.error('[updatePost]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update post.',
    };
  }
}

export async function deletePost(
  id: string | number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const db = getDatabase();
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    await db.delete(posts).where(eq(posts.id, numericId));

    revalidatePath('/posts');
    revalidatePath('/blog');

    return { success: true };
  } catch (err) {
    console.error('[deletePost]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete post.',
    };
  }
}

// ─── Slug helpers ────────────────────────────────────────────────────────────

export async function generateSlug(title: string): Promise<string> {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}