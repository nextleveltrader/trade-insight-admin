'use client';

/**
 * src/app/posts/PostsManager.tsx  —  Client Component
 *
 * Additions over v1:
 *   • "Create New Post" button opens a full-screen editor overlay
 *   • CreatePostOverlay has a two-panel layout: writing area + SEO sidebar
 *   • TagInput component with chip-style tag management
 *   • Slug auto-generation from title (with manual override)
 *   • Meta-description character counter (target 120–160)
 *   • All new fields flow through createManualPost server action
 */

import {
  useState, useTransition, useMemo, useRef,
  useEffect, useCallback, type KeyboardEvent,
} from 'react';
import {
  Search, Trash2, Globe, FileText, Archive, AlertCircle,
  Loader2, X, TrendingUp, Clock, CheckCircle, BookOpen,
  Filter, ChevronRight, BarChart2, Pencil, Plus, Tag,
  Link2, ScanText, Key, FolderOpen, ChevronDown, Send,
} from 'lucide-react';

import type { PostWithAsset, PostStatus, CreatePostInput } from '@/actions/posts.actions';
import type { Asset } from '@/db/schema';
import { updatePostStatus, deletePost, createManualPost } from '@/actions/posts.actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateLong(ts: number) {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string) {
  return `${Math.ceil(wordCount(text) / 200)} min read`;
}

/** Converts a title string into a URL-safe slug. */
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: 'text-amber-300',   bg: 'bg-amber-400/10',   border: 'border-amber-400/25'   },
  published: { label: 'Published', color: 'text-emerald-300', bg: 'bg-emerald-400/10', border: 'border-emerald-400/25' },
  archived:  { label: 'Archived',  color: 'text-zinc-400',    bg: 'bg-zinc-700/30',    border: 'border-zinc-600/30'    },
};

type FilterTab = 'all' | PostStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'draft',     label: 'Draft'     },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived'  },
];

// ─── Reusable small components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PostStatus] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
      {status === 'published' && <CheckCircle size={9} />}
      {status === 'draft'     && <Pencil      size={9} />}
      {status === 'archived'  && <Archive     size={9} />}
      {meta.label}
    </span>
  );
}

function FieldLabel({ icon: Icon, label, hint }: {
  icon:   React.ElementType;
  label:  string;
  hint?:  string;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
        <Icon size={11} className="text-zinc-600" />
        {label}
      </label>
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-start gap-3 bg-zinc-900 border border-red-500/30 rounded-xl px-4 py-3 shadow-2xl max-w-sm">
      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-zinc-300 flex-1">{message}</p>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors ml-2">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const candidates = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const unique = candidates.filter((t) => !tags.includes(t));
    if (unique.length) onChange([...tags, ...unique]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-wrap gap-1.5 min-h-[38px] w-full bg-zinc-800/60 border border-zinc-700 focus-within:border-zinc-500 rounded-lg px-2.5 py-2 cursor-text transition-colors"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-zinc-700 text-zinc-200 text-[11px] font-medium px-2 py-0.5 rounded-md"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags… (Enter or comma to confirm)' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
      />
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ post, onConfirm, onCancel, isPending }: {
  post:      PostWithAsset;
  onConfirm: () => void;
  onCancel:  () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
          <button onClick={onCancel} disabled={isPending}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium transition-colors disabled:opacity-60">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Post Overlay ──────────────────────────────────────────────────────

type FormData = {
  title:           string;
  content:         string;
  category:        string;
  tags:            string[];
  slug:            string;
  metaDescription: string;
  metaKeywords:    string;
  assetId:         number | '';
};

const EMPTY_FORM: FormData = {
  title:           '',
  content:         '',
  category:        '',
  tags:            [],
  slug:            '',
  metaDescription: '',
  metaKeywords:    '',
  assetId:         '',
};

function CreatePostOverlay({
  assets,
  isPending,
  onSave,
  onClose,
}: {
  assets:    Pick<Asset, 'id' | 'name'>[];
  isPending: boolean;
  onSave:    (input: CreatePostInput, status: PostStatus) => void;
  onClose:   () => void;
}) {
  const [form,            setForm]            = useState<FormData>(EMPTY_FORM);
  const [slugAutoSync,    setSlugAutoSync]    = useState(true); // false once user edits slug manually
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on mount
  useEffect(() => { titleRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-sync slug from title unless user has manually edited it
      if (key === 'title' && slugAutoSync) {
        next.slug = toSlug(value as string);
      }
      return next;
    });
  }

  function handleSlugChange(value: string) {
    setSlugAutoSync(false);      // user is taking manual control
    setForm((prev) => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
  }

  function validate(): boolean {
    if (!form.title.trim())   { setValidationError('Title is required.'); return false; }
    if (!form.content.trim()) { setValidationError('Content is required.'); return false; }
    setValidationError(null);
    return true;
  }

function handleSubmit(status: PostStatus) {
    if (!validate()) return;
    onSave(
      {
        title:           form.title.trim(),
        content:         form.content.trim(),
        status,
        assetId:         form.assetId !== '' ? Number(form.assetId) : null,
        category:        form.category.trim()        || null,
        tags:            form.tags.join(',')         || null,
        slug:            form.slug.trim()            || null,
        metaDescription: form.metaDescription.trim() || null,
        metaKeywords:    form.metaKeywords.trim()    || null,
        
        // ─── Type Error ফিক্স করার জন্য নতুন ফিল্ডগুলো ───
        direction:       null,
        biasType:        null,
        summary:         null,
        body:            form.content.trim(), 
        isProOnly:       0,
        confidence:      0,
        publishedAt:     null,
      },
      status,
    );
  }

  const metaLen      = form.metaDescription.length;
  const metaColor    = metaLen === 0 ? 'text-zinc-600'
    : metaLen <= 119  ? 'text-amber-400'
    : metaLen <= 160  ? 'text-emerald-400'
    : 'text-red-400';
  const metaBarWidth = Math.min((metaLen / 160) * 100, 100);
  const metaBarColor = metaLen === 0 ? 'bg-zinc-700'
    : metaLen <= 119  ? 'bg-amber-400'
    : metaLen <= 160  ? 'bg-emerald-400'
    : 'bg-red-400';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Pencil size={13} className="text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">New Post</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-500">Press Esc to close without saving</span>
        </div>

        <div className="flex items-center gap-2">
          {validationError && (
            <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
              <AlertCircle size={12} />
              {validationError}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body: writing area + sidebar ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: Title + Content */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
          {/* Title */}
          <div className="px-10 pt-8 pb-4 border-b border-zinc-800/60 flex-shrink-0">
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Post title…"
              className="w-full bg-transparent text-2xl font-bold text-zinc-100 placeholder-zinc-700 outline-none tracking-tight"
            />
            {form.slug && (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono">
                /blog/<span className="text-zinc-400">{form.slug}</span>
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col px-10 py-6 min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <FieldLabel icon={FileText} label="Content" />
              <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                <span>{wordCount(form.content).toLocaleString()} words</span>
                {form.content && <span>{readingTime(form.content)}</span>}
              </div>
            </div>
            <textarea
              value={form.content}
              onChange={(e) => setField('content', e.target.value)}
              placeholder={"Start writing your post here…\n\nUse # for headings, ## for subheadings.\nUse - or * for bullet points."}
              className="flex-1 w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-600 rounded-xl px-5 py-4 text-sm text-zinc-300 placeholder-zinc-700 outline-none resize-none font-mono leading-7 transition-colors"
            />
          </div>
        </div>

        {/* Right: Metadata sidebar */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* ── Taxonomy ─────────────────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-4">
                Taxonomy
              </p>
              <div className="space-y-4">

                {/* Category */}
                <div>
                  <FieldLabel icon={FolderOpen} label="Category" />
                  <input
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    placeholder="e.g. Technical Analysis"
                    className="w-full bg-zinc-800/60 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                {/* Tags */}
                <div>
                  <FieldLabel icon={Tag} label="Tags" hint="Enter or , to add" />
                  <TagInput tags={form.tags} onChange={(tags) => setField('tags', tags)} />
                </div>

                {/* Asset */}
                <div>
                  <FieldLabel icon={TrendingUp} label="Asset" hint="Optional" />
                  <div className="relative">
                    <select
                      value={form.assetId}
                      onChange={(e) => setField('assetId', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full appearance-none bg-zinc-800/60 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none transition-colors pr-8"
                    >
                      <option value="">— No asset —</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-zinc-800" />

            {/* ── SEO ──────────────────────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-4">
                SEO
              </p>
              <div className="space-y-4">

                {/* Slug */}
                <div>
                  <FieldLabel icon={Link2} label="URL Slug" />
                  <div className="flex items-center bg-zinc-800/60 border border-zinc-700 focus-within:border-zinc-500 rounded-lg overflow-hidden transition-colors">
                    <span className="pl-3 pr-1 text-[11px] text-zinc-600 font-mono whitespace-nowrap select-none">/blog/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="auto-generated-from-title"
                      className="flex-1 bg-transparent px-1 py-2 text-sm text-zinc-300 font-mono placeholder-zinc-700 outline-none"
                    />
                  </div>
                  {!slugAutoSync && (
                    <button
                      onClick={() => { setSlugAutoSync(true); setForm((p) => ({ ...p, slug: toSlug(p.title) })); }}
                      className="mt-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      ↺ Re-sync from title
                    </button>
                  )}
                </div>

                {/* Meta description */}
                <div>
                  <FieldLabel
                    icon={ScanText}
                    label="Meta Description"
                    hint={`${metaLen}/160`}
                  />
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) => setField('metaDescription', e.target.value)}
                    placeholder="Concise summary for search engines (120–160 characters ideal)…"
                    rows={3}
                    className="w-full bg-zinc-800/60 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none transition-colors"
                  />
                  {/* Progress bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${metaBarColor}`}
                        style={{ width: `${metaBarWidth}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium tabular-nums ${metaColor}`}>
                      {metaLen === 0 ? 'Empty' : metaLen <= 119 ? 'Too short' : metaLen <= 160 ? 'Good' : 'Too long'}
                    </span>
                  </div>
                </div>

                {/* Meta keywords */}
                <div>
                  <FieldLabel icon={Key} label="Meta Keywords" hint="Comma-separated" />
                  <input
                    value={form.metaKeywords}
                    onChange={(e) => setField('metaKeywords', e.target.value)}
                    placeholder="forex, gold, XAUUSD, technical analysis"
                    className="w-full bg-zinc-800/60 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Footer action bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 h-16 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
        <p className="text-xs text-zinc-600">
          {form.content ? `${wordCount(form.content).toLocaleString()} words · ${readingTime(form.content)}` : 'Start writing to see stats'}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('draft')}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-200 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit('published')}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post List Item ───────────────────────────────────────────────────────────

function PostListItem({ post, isSelected, onClick }: {
  post:       PostWithAsset;
  isSelected: boolean;
  onClick:    () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 group ${
        isSelected
          ? 'bg-zinc-800 border-zinc-600'
          : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700'
      }`}
    >
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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {post.assetName && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-md border border-blue-400/15">
              <TrendingUp size={9} />{post.assetName}
            </span>
          )}
          {post.category && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-md border border-zinc-700">
              {post.category}
            </span>
          )}
          <span className="text-[10px] text-zinc-600">{formatDate(post.createdAt)}</span>
        </div>
        <StatusBadge status={post.status} />
      </div>
    </button>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyList({ filter, search }: { filter: FilterTab; search: string }) {
  const filtered = filter !== 'all' || !!search.trim();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        {filtered ? <Filter size={20} className="text-zinc-700" /> : <FileText size={20} className="text-zinc-700" />}
      </div>
      <p className="text-zinc-400 text-sm font-medium mb-1">
        {filtered ? 'No matching posts' : 'No posts yet'}
      </p>
      <p className="text-zinc-700 text-xs max-w-[200px] leading-relaxed">
        {filtered ? 'Try adjusting your search or filter.' : 'Create your first post using the button above.'}
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

// ─── Content Renderer (lightweight markdown) ──────────────────────────────────

function ContentRenderer({ content }: { content: string }) {
  const lines    = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let buf: string[] = [];

  function flush() {
    const text = buf.join(' ').trim();
    if (text) elements.push(<p key={key++} className="text-zinc-300 leading-7 text-sm">{text}</p>);
    buf = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if      (line.startsWith('### ')) { flush(); elements.push(<h3 key={key++} className="text-base font-semibold text-zinc-100 mt-6 mb-2">{line.slice(4)}</h3>); }
    else if (line.startsWith('## '))  { flush(); elements.push(<h2 key={key++} className="text-lg font-semibold text-zinc-100 mt-8 mb-3 pb-2 border-b border-zinc-800">{line.slice(3)}</h2>); }
    else if (line.startsWith('# '))   { flush(); elements.push(<h1 key={key++} className="text-xl font-bold text-zinc-50 mt-8 mb-4">{line.slice(2)}</h1>); }
    else if (line.match(/^[-*] /))    { flush(); elements.push(<li key={key++} className="text-zinc-300 text-sm leading-6 ml-5 list-disc">{line.slice(2)}</li>); }
    else if (line.trim() === '')      { flush(); }
    else                              { buf.push(line); }
  }
  flush();

  return <div className="space-y-3">{elements}</div>;
}

// ─── Post Preview (right column) ─────────────────────────────────────────────

function PostPreview({ post, isPending, onUpdateStatus, onDelete }: {
  post:           PostWithAsset;
  isPending:      boolean;
  onUpdateStatus: (id: number, status: PostStatus) => void;
  onDelete:       (id: number) => void;
}) {
  const isPublished = post.status === 'published';
  const isArchived  = post.status === 'archived';
  const tagList     = post.tags?.split(',').map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          {post.assetName && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/15">
              <TrendingUp size={10} />{post.assetName}
            </span>
          )}
          {post.category && (
            <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
              {post.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isArchived && (
            <button disabled={isPending} onClick={() => onUpdateStatus(post.id, isPublished ? 'draft' : 'published')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:pointer-events-none ${
                isPublished
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
              }`}>
              {isPending ? <Loader2 size={11} className="animate-spin" /> : isPublished ? <Pencil size={11} /> : <Globe size={11} />}
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
          )}
          <button disabled={isPending} onClick={() => onUpdateStatus(post.id, isArchived ? 'draft' : 'archived')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:pointer-events-none ${
              isArchived
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            }`}>
            {isArchived ? <><FileText size={11} />Restore</> : <><Archive size={11} />Archive</>}
          </button>
          <button disabled={isPending} onClick={() => onDelete(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400 transition-all disabled:opacity-50 disabled:pointer-events-none">
            <Trash2 size={11} />Delete
          </button>
        </div>
      </div>

      {/* Article */}
      <div className="flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold text-zinc-50 leading-tight tracking-tight mb-4">{post.title}</h1>

        {/* Meta strip */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Clock size={11} />{formatDateLong(post.createdAt)}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500"><BookOpen size={11} />{readingTime(post.content)}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500"><BarChart2 size={11} />{wordCount(post.content).toLocaleString()} words</span>
          {post.slug && (
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-600 font-mono"><Link2 size={11} />/blog/{post.slug}</span>
          )}
        </div>

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tagList.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                <Tag size={9} />{tag}
              </span>
            ))}
          </div>
        )}

        {/* SEO summary if filled */}
        {(post.metaDescription || post.metaKeywords) && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">SEO Preview</p>
            {post.metaDescription && (
              <p className="text-xs text-zinc-400 leading-relaxed">{post.metaDescription}</p>
            )}
            {post.metaKeywords && (
              <p className="text-[10px] text-zinc-600 font-mono">{post.metaKeywords}</p>
            )}
          </div>
        )}

        <div className="border-t border-zinc-800 mb-6" />
        <ContentRenderer content={post.content} />
        <div className="h-16" />
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ posts }: { posts: PostWithAsset[] }) {
  const total     = posts.length;
  const published = posts.filter((p) => p.status === 'published').length;
  const drafts    = posts.filter((p) => p.status === 'draft').length;
  const archived  = posts.filter((p) => p.status === 'archived').length;

  return (
    <div className="flex items-center gap-4">
      {[
        { label: 'Total',     value: total,     color: 'text-zinc-300'    },
        { label: 'Published', value: published,  color: 'text-emerald-400' },
        { label: 'Draft',     value: drafts,     color: 'text-amber-400'   },
        { label: 'Archived',  value: archived,   color: 'text-zinc-500'    },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PostsManager ─────────────────────────────────────────────────────────────

export default function PostsManager({
  initialPosts,
  assets,
}: {
  initialPosts: PostWithAsset[];
  assets:       Pick<Asset, 'id' | 'name'>[];
}) {
  const [postList,     setPostList]     = useState<PostWithAsset[]>(initialPosts);
  const [selectedId,   setSelectedId]   = useState<number | null>(initialPosts[0]?.id ?? null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [deleteTarget, setDeleteTarget] = useState<PostWithAsset | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [isPending,    startTransition] = useTransition();

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return postList.filter((p) => {
      const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
      const matchesSearch = !q
        || p.title.toLowerCase().includes(q)
        || p.content.toLowerCase().includes(q)
        || (p.assetName  ?? '').toLowerCase().includes(q)
        || (p.category   ?? '').toLowerCase().includes(q)
        || (p.tags       ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [postList, searchQuery, activeFilter]);

  const selectedPost = postList.find((p) => p.id === selectedId) ?? null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = useCallback((input: CreatePostInput) => {
    startTransition(async () => {
      const result = await createManualPost(input);
      if (result.error) { setErrorMsg(result.error); return; }
      setPostList((prev) => [result.data as PostWithAsset, ...prev]);
      setSelectedId((result.data as PostWithAsset).id);
      setShowCreate(false);
    });
  }, []);

  function handleUpdateStatus(id: number, status: PostStatus) {
    const prev = postList.find((p) => p.id === id);
    if (!prev) return;
    setPostList((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
    startTransition(async () => {
      const result = await updatePostStatus(id, status);
      if (result.error) {
        setPostList((list) => list.map((p) => (p.id === id ? prev : p)));
        setErrorMsg(result.error);
        return;
      }
      const updated = result.data as PostWithAsset;
      setPostList((list) => list.map((p) => (p.id === id ? updated : p)));
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id     = deleteTarget.id;
    const backup = [...postList];
    setPostList((list) => list.filter((p) => p.id !== id));
    if (selectedId === id) {
      const idx  = backup.findIndex((p) => p.id === id);
      const next = backup[idx + 1] ?? backup[idx - 1];
      setSelectedId(next?.id ?? null);
    }
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deletePost(id);
      if (result.error) { setPostList(backup); setErrorMsg(result.error); }
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

      {showCreate && (
        <CreatePostOverlay
          assets={assets}
          isPending={isPending}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Blog Posts</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Review, publish, and manage AI-generated and manual market analysis posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
            {isPending
              ? <Loader2 size={11} className="text-emerald-400 animate-spin" />
              : <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            }
            <StatsBar posts={postList} />
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[360px_1fr] gap-4 min-h-0">

        {/* Left: Post list */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col min-h-0">

          {/* Search + Filter + New button */}
          <div className="p-4 border-b border-zinc-800 space-y-3 flex-shrink-0">

            {/* New post button */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-sm font-semibold transition-all"
            >
              <Plus size={15} />
              Create New Post
            </button>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts…"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-lg pl-8 pr-8 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
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

        {/* Right: Preview */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-7 flex flex-col min-h-0 overflow-hidden">
          {!selectedPost ? (
            <EmptyPreview />
          ) : (
            <PostPreview
              post={selectedPost}
              isPending={isPending}
              onUpdateStatus={handleUpdateStatus}
              onDelete={(id) => {
                const p = postList.find((p) => p.id === id);
                if (p) setDeleteTarget(p);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}