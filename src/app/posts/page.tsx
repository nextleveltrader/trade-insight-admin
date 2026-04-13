/**
 * src/app/posts/page.tsx  —  Server Component
 *
 * Fetches all posts (with asset names) on every request and passes them
 * to the interactive PostsManager Client Component.
 */

import { checkAuth } from '@/actions/auth.actions';
import { getPostsPageData } from '@/actions/posts.actions';
import PostsManager   from './PostsManager';

export const runtime = 'edge'; // required for Cloudflare Pages + D1

export default async function PostsPage() {
  try {
    await checkAuth();
    const data = await getPostsPageData();
    return <PostsManager initialPosts={data.posts} assets={data.assets} />;
  } catch (error) {
    console.error('[PostsPage] Error:', error);
    throw error; // Let Next.js error boundary handle it
  }
}