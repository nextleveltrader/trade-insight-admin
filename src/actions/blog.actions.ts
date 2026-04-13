'use server';

import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Post = typeof posts.$inferSelect;

export type PublishedPost = Omit<Post, 'status'> & {
  status: 'draft' | 'published';
};

export type PostFormData = {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  category?: string;
  tags?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

// ─── Public Blog Actions ──────────────────────────────────────────────────────

export async function getPublishedPosts() {
  const db = getDb();
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.createdAt));

  return rows as unknown as PublishedPost[];
}

export async function getPostBySlug(slugOrId: string) {
  if (!slugOrId || typeof slugOrId !== 'string') return null;

  const db = getDb();
  const isNumeric = /^\d+$/.test(slugOrId);

  const lookupCondition = isNumeric
    ? or(eq(posts.id, parseInt(slugOrId, 10)), eq(posts.slug, slugOrId))
    : eq(posts.slug, slugOrId);

  const [row] = await db
    .select()
    .from(posts)
    .where(and(lookupCondition, eq(posts.status, 'published')))
    .limit(1);

  return (row as unknown as PublishedPost) ?? null;
}

// ─── Admin CMS Actions ────────────────────────────────────────────────────────

export async function getAllPosts() {
  const db = getDb();
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));

  return rows as unknown as PublishedPost[];
}

export async function getPostById(id: string | number) {
  const db = getDb();
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, numericId))
    .limit(1);

  return (post as unknown as PublishedPost) || undefined;
}

export async function createPost(
  data: PostFormData
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    const db = getDb();
    const result = await db
      .insert(posts)
      .values({
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status,
        createdAt: new Date(),
      } as any)
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
    const db = getDb();
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    await db
      .update(posts)
      .set(data as any)
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
    const db = getDb();
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

// ─── Slug helper ──────────────────────────────────────────────────────────────

export async function generateSlug(title: string): Promise<string> {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}