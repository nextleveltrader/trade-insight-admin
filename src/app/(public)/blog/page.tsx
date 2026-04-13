import Link from 'next/link';
import { getPublishedPosts, type PublishedPost } from '@/actions/blog.actions';
export const runtime = 'edge'; // required for Cloudflare Pages + D1
// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'Blog | Trade Insight',
  description: 'Market analysis, trade setups, and technical insights from Trade Insight.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getSnippet(content: string, maxLength = 140): string {
  const stripped = content.replace(/\n+/g, ' ').trim();
  return stripped.length <= maxLength
    ? stripped
    : stripped.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 tracking-wide">
      {category}
    </span>
  );
}

function PostCard({ post }: { post: PublishedPost }) {
  const href = `/blog/${post.slug ?? post.id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-800/50 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:bg-zinc-800/80 hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.15)]">
      {/* Top accent bar */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Category + Date row */}
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={post.category} />
          <time
            dateTime={new Date(post.createdAt).toISOString()}
            className="ml-auto shrink-0 text-xs text-zinc-500"
          >
            {formatDate(post.createdAt)}
          </time>
        </div>

        {/* Title */}
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-100 transition-colors duration-200 group-hover:text-emerald-300">
          {post.title}
        </h2>

        {/* Snippet */}
        <p className="flex-1 text-sm leading-relaxed text-zinc-400">
          {getSnippet(post.content)}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-2">
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors duration-200 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Read more
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-7 w-7 text-zinc-500"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>
      <p className="text-zinc-400">No posts published yet. Check back soon.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="min-h-screen bg-zinc-900 px-4 py-16 sm:px-6 lg:px-8">
      {/* ── Page header ── */}
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Insights
        </span>
        <h1 className="bg-gradient-to-br from-zinc-100 to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          Trade Insight Blog
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Market analysis, technical breakdowns, and trading ideas — published when the charts are talking.
        </p>
      </div>

      {/* ── Divider ── */}
      <div className="mx-auto mb-12 max-w-5xl border-t border-zinc-700/60" />

      {/* ── Grid ── */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </main>
  );
}