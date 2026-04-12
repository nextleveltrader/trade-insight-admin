'use client';

/**
 * src/app/posts/PostsManager.tsx  —  Client Component
 *
 * Two-column layout:
 *   Left  — Searchable, filterable post list
 *   Right — Full reading view with Publish / Archive / Delete actions
 *
 * All mutations are optimistically applied and rolled back on error.
 */

import { useState, useTransition, useMemo } from 'react';
import {
  Search, Trash2, Globe, FileText, Archive,
  AlertCircle, Loader2, X, TrendingUp, Clock,
  CheckCircle, BookOpen, Filter, ChevronRight,
  BarChart2, Pencil,
} from 'lucide-react';

import type { PostWithAsset, PostStatus } from '@/actions/posts.actions';
import { updatePostStatus, deletePost }   from '@/actions/posts.actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'month' in Intl.DateTimeFormat.prototype ? 'numeric' : undefined,
    month: 'short',
    day:   'numeric',
  });
}

function formatDateLong(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year:   'numeric',
    month:  'long',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string): string {
  const mins = Math.ceil(wordCount(text) / 200);
  return `${mins} min read`;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: 'text-amber-300',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25'  },
  published: { label: 'Published', color: 'text-emerald-300',bg: 'bg-emerald-400/10',border: 'border-emerald-400/25'},
  archived:  { label: 'Archived',  color: 'text-zinc-400',   bg: 'bg-zinc-700/30',   border: 'border-zinc-600/30'   },
};

type FilterTab = 'all' | PostStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'draft',     label: 'Draft'     },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived'  },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PostStatus] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
      {status === 'published' && <CheckCircle  size={9} />}
      {status === 'draft'     && <Pencil       size={9} />}
      {status === 'archived'  && <Archive      size={9} />}
      {meta.label}
    </span>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-zinc-900 border border-red-500/30 rounded-xl px-4 py-3 shadow-2xl max-w-sm">
      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-zinc-300 flex-1">{message}</p>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors ml-2">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  post,
  onConfirm,
  onCancel,
  isPending,
}: {
  post:      PostWithAsset;
  onConfirm: () => void;
  onCancel:  () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Delete Post</h3>
            <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <span className="text-zinc-200 font-medium">&quot;{post.title}&quot;</span>?
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post List Item ───────────────────────────────────────────────────────────

function PostListItem({
  post,
  isSelected,
  onClick,
}: {
  post:       PostWithAsset;
  isSelected: boolean;
  onClick:    () => void;
}) {
  // const meta = STATUS_META[post.status as PostStatus] ?? STATUS_META.draft;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 group ${
        isSelected
          ? 'bg-zinc-800 border-zinc-600'
          : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700'
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium leading-snug line-clamp-2 flex-1 transition-colors ${
          isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-200'
        }`}>
          {post.title}
        </p>
        <ChevronRight size={13} className={`flex-shrink-0 mt-0.5 transition-all ${
          isSelected ? 'text-zinc-400 translate-x-0.5' : 'text-zinc-700 group-hover:text-zinc-500'
        }`} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {post.assetName && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-blue-400 bg-blue-400/8 px-1.5 py-0.5 rounded-md border border-blue-400/15">
              <TrendingUp size={9} />
              {post.assetName}
            </span>
          )}
          <span className="text-[10px] text-zinc-600">
            {formatDate(post.createdAt)}
          </span>
        </div>
        <StatusBadge status={post.status} />
      </div>
    </button>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyList({ filter, search }: { filter: FilterTab; search: string }) {
  const isFiltered = filter !== 'all' || search.trim().length > 0;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        {isFiltered
          ? <Filter size={20} className="text-zinc-700" />
          : <FileText size={20} className="text-zinc-700" />
        }
      </div>
      <p className="text-zinc-400 text-sm font-medium mb-1">
        {isFiltered ? 'No matching posts' : 'No posts yet'}
      </p>
      <p className="text-zinc-700 text-xs max-w-[200px] leading-relaxed">
        {isFiltered
          ? 'Try adjusting your search or filter.'
          : 'Posts generated by your AI pipeline will appear here.'
        }
      </p>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
        <BookOpen size={28} className="text-zinc-700" />
      </div>
      <p className="text-zinc-400 text-sm font-semibold mb-2">No post selected</p>
      <p className="text-zinc-700 text-xs max-w-[240px] leading-relaxed">
        Click any post from the list on the left to preview its full content here.
      </p>
    </div>
  );
}

// ─── Reading View ─────────────────────────────────────────────────────────────

/**
 * Renders raw text with basic structure:
 * Lines starting with # become headings, blank lines become paragraph breaks.
 * No external markdown library needed.
 */
function ContentRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(' ').trim();
    if (text) {
      elements.push(
        <p key={key++} className="text-zinc-300 leading-7 text-sm">
          {text}
        </p>
      );
    }
    paragraphBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('### ')) {
      flushParagraph();
      elements.push(<h3 key={key++} className="text-base font-semibold text-zinc-100 mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushParagraph();
      elements.push(<h2 key={key++} className="text-lg font-semibold text-zinc-100 mt-8 mb-3 pb-2 border-b border-zinc-800">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      flushParagraph();
      elements.push(<h1 key={key++} className="text-xl font-bold text-zinc-50 mt-8 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      elements.push(
        <li key={key++} className="text-zinc-300 text-sm leading-6 ml-4 list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      // Bold (**text**) inline replacement
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();

  return <div className="space-y-3">{elements}</div>;
}

function PostPreview({
  post,
  isPending,
  onUpdateStatus,
  onDelete,
}: {
  post:           PostWithAsset;
  isPending:      boolean;
  onUpdateStatus: (id: number, status: PostStatus) => void;
  onDelete:       (id: number) => void;
}) {
  const isPublished = post.status === 'published';
  const isArchived  = post.status === 'archived';
  const wc          = wordCount(post.content);

  return (
    <div className="flex flex-col h-full">
      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <StatusBadge status={post.status} />
          {post.assetName && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-blue-400 bg-blue-400/8 px-2 py-1 rounded-lg border border-blue-400/15">
              <TrendingUp size={10} />
              {post.assetName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Publish / Unpublish */}
          {!isArchived && (
            <button
              disabled={isPending}
              onClick={() => onUpdateStatus(post.id, isPublished ? 'draft' : 'published')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:pointer-events-none ${
                isPublished
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                  : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              {isPending
                ? <Loader2 size={11} className="animate-spin" />
                : isPublished ? <Pencil size={11} /> : <Globe size={11} />
              }
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
          )}

          {/* Archive / Restore */}
          <button
            disabled={isPending}
            onClick={() => onUpdateStatus(post.id, isArchived ? 'draft' : 'archived')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:pointer-events-none ${
              isArchived
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            }`}
          >
            {isArchived ? <><FileText size={11} />Restore</> : <><Archive size={11} />Archive</>}
          </button>

          {/* Delete */}
          <button
            disabled={isPending}
            onClick={() => onDelete(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={11} />
            Delete
          </button>
        </div>
      </div>

      {/* ── Article ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <h1 className="text-2xl font-bold text-zinc-50 leading-tight tracking-tight mb-4">
          {post.title}
        </h1>

        {/* Article meta */}
        <div className="flex items-center gap-4 mb-7 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Clock size={11} />
            {formatDateLong(post.createdAt)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <BookOpen size={11} />
            {readingTime(post.content)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <BarChart2 size={11} />
            {wc.toLocaleString()} words
          </div>
        </div>

        {/* Content */}
        <ContentRenderer content={post.content} />

        {/* Bottom padding so last line doesn't hug the edge */}
        <div className="h-16" />
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ posts }: { posts: PostWithAsset[] }) {
  const total     = posts.length;
  const published = posts.filter((p) => p.status === 'published').length;
  const drafts    = posts.filter((p) => p.status === 'draft').length;
  const archived  = posts.filter((p) => p.status === 'archived').length;

  return (
    <div className="flex items-center gap-4">
      {[
        { label: 'Total',     value: total,     color: 'text-zinc-300'   },
        { label: 'Published', value: published,  color: 'text-emerald-400'},
        { label: 'Draft',     value: drafts,     color: 'text-amber-400'  },
        { label: 'Archived',  value: archived,   color: 'text-zinc-500'   },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PostsManager (root client component) ────────────────────────────────────

export default function PostsManager({ initialPosts }: { initialPosts: PostWithAsset[] }) {
  const [postList,       setPostList]       = useState<PostWithAsset[]>(initialPosts);
  const [selectedId,     setSelectedId]     = useState<number | null>(
    initialPosts.length > 0 ? initialPosts[0].id : null
  );
  const [searchQuery,    setSearchQuery]    = useState('');
  const [activeFilter,   setActiveFilter]   = useState<FilterTab>('all');
  const [deleteTarget,   setDeleteTarget]   = useState<PostWithAsset | null>(null);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);
  const [isPending,      startTransition]   = useTransition();

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return postList.filter((p) => {
      const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
      const matchesSearch = !q || p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.assetName ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [postList, searchQuery, activeFilter]);

  const selectedPost = postList.find((p) => p.id === selectedId) ?? null;

  // If selected post was filtered out, keep it visible in preview but dimmed
  // const selectedVisible = selectedPost && filteredPosts.some((p) => p.id === selectedId);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleUpdateStatus(id: number, status: PostStatus) {
    const prev = postList.find((p) => p.id === id);
    if (!prev) return;

    // Optimistic update
    setPostList((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));

    startTransition(async () => {
      const result = await updatePostStatus(id, status);
      if (result.error) {
        // Roll back
        setPostList((list) => list.map((p) => (p.id === id ? prev : p)));
        setErrorMsg(result.error);
        return;
      }
      // Sync with server row (authoritative)
      setPostList((list) => list.map((p) => (p.id === id ? result.data as PostWithAsset : p)));
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    // Optimistic: remove from list
    const backup = [...postList];
    setPostList((list) => list.filter((p) => p.id !== id));
    if (selectedId === id) {
      // Select the next closest post
      const idx  = backup.findIndex((p) => p.id === id);
      const next = backup[idx + 1] ?? backup[idx - 1];
      setSelectedId(next?.id ?? null);
    }
    setDeleteTarget(null);

    startTransition(async () => {
      const result = await deletePost(id);
      if (result.error) {
        setPostList(backup);
        setErrorMsg(result.error);
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {errorMsg && <ErrorBanner message={errorMsg} onClose={() => setErrorMsg(null)} />}
      {deleteTarget && (
        <ConfirmDeleteModal
          post={deleteTarget}
          isPending={isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Blog Posts</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Review, publish, and manage AI-generated market analysis posts
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
          {isPending
            ? <Loader2 size={11} className="text-emerald-400 animate-spin" />
            : <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          }
          <StatsBar posts={postList} />
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[360px_1fr] gap-4 min-h-0">

        {/* ── Left column: Post list ─────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col min-h-0">

          {/* Search + Filter header */}
          <div className="p-4 border-b border-zinc-800 space-y-3 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts…"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-lg border border-zinc-700/50">
              {FILTER_TABS.map((tab) => {
                const count = tab.value === 'all'
                  ? postList.length
                  : postList.filter((p) => p.status === tab.value).length;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                      activeFilter === tab.value
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                      activeFilter === tab.value ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredPosts.length === 0 ? (
              <EmptyList filter={activeFilter} search={searchQuery} />
            ) : (
              filteredPosts.map((post) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  isSelected={post.id === selectedId}
                  onClick={() => setSelectedId(post.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right column: Preview ──────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-7 flex flex-col min-h-0 overflow-hidden">
          {!selectedPost ? (
            <EmptyPreview />
          ) : (
            <PostPreview
              post={selectedPost}
              isPending={isPending}
              onUpdateStatus={handleUpdateStatus}
              onDelete={(id) => {
                const post = postList.find((p) => p.id === id);
                if (post) setDeleteTarget(post);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}