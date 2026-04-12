/**
 * src/app/posts/page.tsx  —  Server Component
 *
 * Fetches all posts (with asset names) on every request and passes them
 * to the interactive PostsManager Client Component.
 */

import { getAllPosts } from '@/actions/posts.actions';
import PostsManager   from './PostsManager';

export const runtime = 'edge'; // required for Cloudflare Pages + D1

export default async function PostsPage() {
  const initialPosts = await getAllPosts();
  return <PostsManager initialPosts={initialPosts} />;
}