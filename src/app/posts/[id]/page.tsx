/**
 * src/app/posts/[id]/page.tsx
 *
 * Admin edit page for a single blog post.
 *
 * This is a React Server Component. It:
 *  1. Awaits the `params` Promise (Next.js 15 requirement).
 *  2. Fetches the post via a Server Action (runs on the Edge / Cloudflare D1).
 *  3. Passes the post data down to <PostEditorClient>, which handles all
 *     client-side interactions (rich editor, save, delete).
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostById } from '@/actions/blog_actions';
import PostEditorClient from '@/components/PostEditorClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  // In Next.js 15, `params` is a Promise — must be awaited.
  params: Promise<{ id: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) return {};

  const post = await getPostById(postId);
  return {
    title: post ? `Edit — ${post.title}` : 'Post Not Found',
    robots: { index: false }, // Never index admin pages
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditPostPage({ params }: PageProps) {
  // ── 1. Await params (Next.js 15 requirement) ───────────────────────────────
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) notFound();

  // ── 2. Fetch post from D1 ─────────────────────────────────────────────────
  const post = await getPostById(postId);
  if (!post) notFound();

  // ── 3. Format helpers ─────────────────────────────────────────────────────
  const createdDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // ── 4. Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 min-w-0">
            <Link
              href="/posts"
              className="shrink-0 flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              All Posts
            </Link>
            <span className="text-zinc-700 shrink-0">/</span>
            <span className="text-zinc-300 text-sm font-medium truncate">
              {post.title}
            </span>
          </nav>

          {/* Status badge */}
          <span
            className={[
              'shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1',
              post.status === 'published'
                ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
                : post.status === 'archived'
                ? 'bg-zinc-700/60 text-zinc-400 ring-zinc-600/40'
                : 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
            ].join(' ')}
          >
            {post.status}
          </span>
        </div>
      </header>

      {/* ── Page Body ──────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Page heading */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              Edit Post
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              ID #{post.id} · Created {createdDate}
              {post.slug && (
                <>
                  {' '}·{' '}
                  <span className="font-mono text-zinc-600">/blog/{post.slug}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick preview link (only for published posts with a slug) */}
          {post.status === 'published' && post.slug && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
            >
              View live post
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <path d="M15 3h6v6M10 14L21 3" />
              </svg>
            </Link>
          )}
        </div>

        {/* Editor form — all client-side interactivity lives here */}
        <PostEditorClient post={post} />
      </main>
    </div>
  );
}