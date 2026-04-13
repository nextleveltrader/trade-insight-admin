'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { deletePost } from '@/actions/blog.actions';

type Post = {
  id: string | number;
  title: string;
  status: 'draft' | 'published';
  createdAt: Date | string;
  slug?: string;
};

type Props = {
  posts: Post[];
};

export default function PostsTable({ posts }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left">
            <th className="px-5 py-3.5 font-medium text-zinc-400">Title</th>
            <th className="px-5 py-3.5 font-medium text-zinc-400">Status</th>
            <th className="hidden px-5 py-3.5 font-medium text-zinc-400 sm:table-cell">
              Date
            </th>
            <th className="px-5 py-3.5 text-right font-medium text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${post.title}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      await deletePost(String(post.id));
      router.refresh();
    });
  }

  return (
    <tr
      className={`group transition-colors hover:bg-zinc-800/40 ${
        isPending ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      {/* Title */}
      <td className="max-w-xs px-5 py-3.5">
        <span className="block truncate font-medium text-zinc-100">
          {post.title}
        </span>
        {post.slug && (
          <span className="block truncate text-xs text-zinc-500">
            /{post.slug}
          </span>
        )}
      </td>

      {/* Status badge */}
      <td className="px-5 py-3.5">
        <StatusBadge status={post.status} />
      </td>

      {/* Date */}
      <td className="hidden px-5 py-3.5 text-zinc-400 sm:table-cell">
        {formattedDate}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-700 hover:bg-emerald-900/30 hover:text-emerald-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM3.5 6.75c0-.69.56-1.25 1.25-1.25H6a.75.75 0 0 0 0-1.5H4.75A2.75 2.75 0 0 0 2 6.75v5.5A2.75 2.75 0 0 0 4.75 15h5.5A2.75 2.75 0 0 0 13 12.25V11a.75.75 0 0 0-1.5 0v1.25c0 .69-.56 1.25-1.25 1.25h-5.5c-.69 0-1.25-.56-1.25-1.25v-5.5Z" />
            </svg>
            Edit
          </Link>

          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-800 hover:bg-red-900/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-700/40">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-zinc-700">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      Draft
    </span>
  );
}