'use server';

import { db } from '@/lib/db';
import { posts } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ── Types ──────────────────────────────────────────────────────────────────

export type Post = typeof posts.$inferSelect;

export type PostFormData = {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
};

// ── Read ───────────────────────────────────────────────────────────────────

/**
 * Fetch every post (drafts + published), newest first.
 * Used by the admin /posts listing page.
 */
export async function getAllPosts(): Promise<Post[]> {
  return db.select().from(posts).orderBy(desc(posts.createdAt));
}

/**
 * Fetch a single post by ID. Returns undefined when not found.
 */
export async function getPostById(id: string): Promise<Post | undefined> {
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return result[0];
}

/**
 * Fetch only published posts, newest first.
 * Safe to call from public-facing pages.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  return db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.createdAt));
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function createPost(
  data: PostFormData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const result = await db
      .insert(posts)
      .values({
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
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

// ── Update ─────────────────────────────────────────────────────────────────

export async function updatePost(
  id: string,
  data: Partial<PostFormData>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id));

    revalidatePath('/posts');
    revalidatePath(`/posts/${id}`);
    revalidatePath('/blog');

    return { success: true };
  } catch (err) {
    console.error('[updatePost]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update post.',
    };
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deletePost(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db.delete(posts).where(eq(posts.id, id));

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

// ── Slug helpers ────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from an arbitrary string.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}