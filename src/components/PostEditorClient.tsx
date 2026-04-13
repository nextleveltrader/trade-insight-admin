'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DBPost } from '@/db/schema';
import { updatePost, deletePost } from '@/actions/blog_actions';

// TipTap uses browser APIs — must be dynamically imported with ssr: false
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] rounded-xl border border-zinc-700/60 bg-zinc-900 flex items-center justify-center">
      <span className="text-zinc-500 text-sm animate-pulse">Loading editor…</span>
    </div>
  ),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2',
        'text-zinc-100 text-sm placeholder:text-zinc-600',
        'focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20',
        'transition-all duration-150',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2',
        'text-zinc-100 text-sm placeholder:text-zinc-600 resize-none',
        'focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20',
        'transition-all duration-150',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PostEditorClientProps {
  post: DBPost;
}

export default function PostEditorClient({ post }: PostEditorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state — initialised from the fetched post
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug ?? '');
  const [content, setContent] = useState(post.content);
  const [status, setStatus] = useState<'draft' | 'published'>(
    post.status as 'draft' | 'published',
  );
  const [category, setCategory] = useState(post.category ?? '');
  const [tags, setTags] = useState(post.tags ?? '');
  const [metaDescription, setMetaDescription] = useState(post.metaDescription ?? '');
  const [metaKeywords, setMetaKeywords] = useState(post.metaKeywords ?? '');

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-generate slug from title only when slug was previously empty
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!post.slug && !slug) setSlug(generateSlug(val));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    startTransition(async () => {
      try {
        await updatePost(post.id, {
          title,
          content,
          status,
          category: category.trim() || null,
          tags: tags.trim() || null,
          slug: slug.trim() || null,
          metaDescription: metaDescription.trim() || null,
          metaKeywords: metaKeywords.trim() || null,
        });
        showToast('Post saved successfully.');
        router.refresh();
      } catch {
        showToast('Failed to save post.', false);
      }
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThis action is permanent and cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deletePost(post.id);
        router.push('/posts');
      } catch {
        showToast('Failed to delete post.', false);
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">
      {/* ══ Toast ═══════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          className={[
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl',
            'text-sm font-medium shadow-2xl border transition-all duration-300',
            toast.ok
              ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950 border-red-500/40 text-red-300',
          ].join(' ')}
        >
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      {/* ══ Title ════════════════════════════════════════════════════════════ */}
      <div>
        <Label>Post Title</Label>
        <Input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter post title…"
          className="text-base font-semibold"
        />
      </div>

      {/* ══ Slug + Status ════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Slug */}
        <div className="md:col-span-2">
          <Label>URL Slug</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-sm shrink-0">/blog/</span>
            <Input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="url-friendly-slug"
            />
            <button
              type="button"
              onClick={() => setSlug(generateSlug(title))}
              title="Re-generate slug from title"
              className="shrink-0 h-9 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white text-xs transition-colors"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Status toggle */}
        <div>
          <Label>Status</Label>
          <button
            type="button"
            onClick={() =>
              setStatus((s) => (s === 'published' ? 'draft' : 'published'))
            }
            className={[
              'flex items-center gap-3 h-9 px-3 rounded-lg border transition-all duration-200 w-full',
              status === 'published'
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-zinc-800/60 border-zinc-700/50',
            ].join(' ')}
          >
            {/* Toggle pill */}
            <span
              className={[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0',
                status === 'published' ? 'bg-emerald-500' : 'bg-zinc-600',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                  status === 'published' ? 'translate-x-[18px]' : 'translate-x-0.5',
                ].join(' ')}
              />
            </span>
            <span
              className={`text-sm font-medium ${
                status === 'published' ? 'text-emerald-400' : 'text-zinc-400'
              }`}
            >
              {status === 'published' ? 'Published' : 'Draft'}
            </span>
          </button>
        </div>
      </div>

      {/* ══ Rich Text Editor ═════════════════════════════════════════════════ */}
      <div>
        <Label>Content</Label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing your post…"
          minHeight="520px"
        />
      </div>

      {/* ══ Category & Tags ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Technical Analysis"
          />
        </div>
        <div>
          <Label>Tags</Label>
          <Input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="forex, gold, xauusd  (comma-separated)"
          />
        </div>
      </div>

      {/* ══ SEO Panel ════════════════════════════════════════════════════════ */}
      <div className="space-y-4 p-5 rounded-xl border border-zinc-700/40 bg-zinc-800/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-emerald-400 text-sm">◆</span>
          <h3 className="text-sm font-semibold text-zinc-200">SEO Settings</h3>
        </div>

        <div>
          <Label>
            Meta Description{' '}
            <span className="text-zinc-600 normal-case tracking-normal font-normal">
              (≤ 160 chars)
            </span>
          </Label>
          <Textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={160}
            rows={2}
            placeholder="Brief description for search results…"
          />
          <p className="text-right text-xs text-zinc-600 mt-1">
            {metaDescription.length} / 160
          </p>
        </div>

        <div>
          <Label>Meta Keywords</Label>
          <Input
            type="text"
            value={metaKeywords}
            onChange={(e) => setMetaKeywords(e.target.value)}
            placeholder="keyword1, keyword2, keyword3"
          />
        </div>
      </div>

      {/* ══ Action Bar ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
            'border border-red-500/30 text-red-400',
            'hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300',
            'transition-all disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete Post
        </button>

        {/* Save */}
        <div className="flex items-center gap-3">
          {isPending && (
            <span className="text-zinc-500 text-sm animate-pulse">Saving…</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={[
              'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold',
              'bg-emerald-500 hover:bg-emerald-400 text-zinc-900',
              'shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30',
              'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            {status === 'published' ? 'Publish Changes' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}