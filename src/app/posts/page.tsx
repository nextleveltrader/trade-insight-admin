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
  await checkAuth();
  const { posts, assets } = await getPostsPageData();

  return <PostsManager initialPosts={posts} assets={assets} />;
}