export const runtime = 'edge';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug } from '@/actions/blog.actions';

// ─── Dynamic Metadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  // Next.js 15+: params is now a Promise — must be awaited before access.
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | Trade Insight',
    };
  }

  const descriptionFallback = post.content
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 160);

  return {
    title: `${post.title} | Trade Insight`,
    description: post.metaDescription ?? descriptionFallback,
    keywords: post.metaKeywords ?? undefined,
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? descriptionFallback,
      type: 'article',
      publishedTime: new Date(post.createdAt).toISOString(),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Renders plain-text content while preserving authorial line breaks.
 * Each blank-line-separated block becomes a paragraph; single newlines
 * become <br /> elements — matching the behaviour writers expect.
 */
function PostBody({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/);

  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => (
        <p key={i} className="leading-8 text-zinc-300">
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  // Next.js 15+: params is now a Promise — must be awaited before access.
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-900 px-4 py-16 sm:px-6 lg:px-8">
      {/* ── Sticky "Back" button ── */}
      <div className="fixed left-6 top-6 z-40 sm:left-8 sm:top-8">
        <Link
          href="/blog"
          className="group inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-300 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-emerald-500/50 hover:bg-zinc-700/80 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Back to Blog
        </Link>
      </div>

      {/* ── Article ── */}
      <article className="mx-auto max-w-2xl pt-12">
        {/* Header */}
        <header className="mb-10">
          {/* Category badge */}
          {post.category && (
            <span className="mb-5 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              {post.category}
            </span>
          )}

          {/* Title */}
          <h1 className="mt-4 bg-gradient-to-br from-zinc-50 to-zinc-300 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Metadata bar */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <time dateTime={new Date(post.createdAt).toISOString()}>
              {formatDate(post.createdAt)}
            </time>

            {post.tags && (
              <>
                <span className="text-zinc-700">·</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.split(',').map((tag) => {
                    const t = tag.trim();
                    return t ? (
                      <span
                        key={t}
                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        #{t}
                      </span>
                    ) : null;
                  })}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="mt-8 h-px w-full bg-gradient-to-r from-zinc-700 via-emerald-700/40 to-zinc-700" />
        </header>

        {/* Body */}
        <section className="text-base">
          <PostBody content={post.content} />
        </section>

        {/* Footer */}
        <footer className="mt-16 flex items-center justify-between border-t border-zinc-700/60 pt-8">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors duration-200 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            All posts
          </Link>

          <span className="text-xs text-zinc-600">
            Published {formatDate(post.createdAt)}
          </span>
        </footer>
      </article>
    </div>
  );
}