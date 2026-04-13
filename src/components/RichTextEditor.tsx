'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';

// ─── Custom FontSize Extension ────────────────────────────────────────────────
// No external package needed — implemented inline on top of TextStyle.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions: () => ({ types: ['textStyle'] }),

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
            renderHTML: ({ fontSize }) =>
              fontSize ? { style: `font-size: ${fontSize}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    } as any;
  },
});

// ─── Toolbar Primitives ───────────────────────────────────────────────────────

interface BtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

function Btn({ onClick, active, disabled, title, children, wide }: BtnProps) {
  return (
    <button
      type="button"
      // Use onMouseDown + preventDefault so the editor never loses focus.
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center justify-center rounded text-xs font-medium',
        'select-none whitespace-nowrap transition-all duration-100',
        wide ? 'px-2 py-1' : 'min-w-[26px] h-7 px-1',
        active
          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-900/50'
          : 'text-zinc-300 hover:bg-zinc-700/70 hover:text-white',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-zinc-600/50 shrink-0 mx-0.5" aria-hidden />;
}

function SelectCtrl({
  title,
  value,
  onChange,
  children,
  className = '',
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()} // prevent editor blur
      className={[
        'bg-zinc-800 border border-zinc-600/50 text-zinc-200 text-xs rounded px-1.5 h-7',
        'focus:outline-none focus:border-emerald-500/50 hover:border-zinc-500',
        'cursor-pointer transition-colors shrink-0',
        className,
      ].join(' ')}
    >
      {children}
    </select>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'Default Font', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Palatino', value: '"Palatino Linotype", serif' },
];

const FONT_SIZES = [
  '10px', '11px', '12px', '13px', '14px', '15px', '16px',
  '18px', '20px', '22px', '24px', '28px', '32px', '36px',
  '42px', '48px', '56px', '64px', '72px',
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start writing…',
  minHeight = '480px',
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);

  // Hidden color inputs — we programmatically click them from toolbar buttons.
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);

  // ── Editor setup ──────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false, // Avoid SSR/hydration mismatch
    extensions: [
    
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph', 'blockquote'] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-emerald-400 underline underline-offset-2' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg my-2' },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: { class: 'w-full aspect-video rounded-xl my-4' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: [
          'prose prose-invert prose-emerald max-w-none',
          'prose-headings:text-zinc-100 prose-p:text-zinc-200',
          'prose-a:text-emerald-400 prose-strong:text-white',
          'prose-blockquote:border-emerald-500 prose-blockquote:text-zinc-300',
          'prose-code:text-emerald-300 prose-pre:bg-zinc-800',
          'focus:outline-none px-5 py-4',
        ].join(' '),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange?.(html);
    },
  });

  // Sync external `content` prop (e.g. when parent fetches data after mount).
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
      setRawHtml(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // ── HTML Mode toggle ──────────────────────────────────────────────────────
  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!isHtmlMode) {
      setRawHtml(editor.getHTML());
      setIsHtmlMode(true);
    } else {
      editor.commands.setContent(rawHtml, { emitUpdate: false });
      onChange?.(rawHtml);
      setIsHtmlMode(false);
    }
  }, [editor, isHtmlMode, rawHtml, onChange]);

  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawHtml(val);
    onChange?.(val);
  };

  // ── Media helpers ─────────────────────────────────────────────────────────
  const insertLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Enter URL:', prev || 'https://');
    if (url === null) return; // cancelled
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertImage = () => {
    if (!editor) return;
    const src = window.prompt('Enter image URL:');
    if (!src) return;
    const alt = window.prompt('Alt text (optional):') ?? '';
    editor.chain().focus().setImage({ src, alt }).run();
  };

  const insertYoutube = () => {
    if (!editor) return;
    const src = window.prompt('Enter YouTube video URL:');
    if (!src) return;
    editor.commands.setYoutubeVideo({ src });
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // ── Active font detection ─────────────────────────────────────────────────
  const activeFontFamily =
    FONT_FAMILIES.find((f) =>
      f.value ? editor?.isActive('textStyle', { fontFamily: f.value }) : false,
    )?.value ?? '';

  if (!editor) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col rounded-xl border border-zinc-700/60 bg-zinc-900 overflow-hidden shadow-2xl shadow-black/50">
      {/* ══ TOOLBAR ═══════════════════════════════════════════════════════════ */}
      <div
        className={[
          'flex items-center gap-0.5 px-2 py-1.5',
          'bg-zinc-800/90 border-b border-zinc-700/60',
          'overflow-x-auto',
          // Custom thin scrollbar (Tailwind's scrollbar plugin or manual)
          '[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-zinc-600',
          '[&::-webkit-scrollbar-track]:bg-transparent',
        ].join(' ')}
      >
        {/* ── Group 1: History ── */}
        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </Btn>

        <Sep />

        {/* ── Group 2: Basic Formatting ── */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <u>U</u>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <s>S</s>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript" wide>
          x²
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript" wide>
          x₂
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear All Formatting"
          wide
        >
          T✕
        </Btn>

        <Sep />

        {/* ── Group 3: Typography ── */}
        <SelectCtrl
          title="Font Family"
          value={activeFontFamily}
          onChange={(v) =>
            v
              ? editor.chain().focus().setFontFamily(v).run()
              : editor.chain().focus().unsetFontFamily().run()
          }
          className="w-36"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </SelectCtrl>

        <SelectCtrl
          title="Font Size"
          value=""
          onChange={(v) =>
            v
              ? editor.chain().focus().setFontSize(v).run()
              : editor.chain().focus().unsetFontSize().run()
          }
          className="w-20"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectCtrl>

        {/* Text Color */}
        <div className="relative shrink-0" title="Text Color">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              textColorRef.current?.click();
            }}
            className="inline-flex flex-col items-center justify-center gap-0.5 h-7 px-1.5 rounded text-zinc-200 hover:bg-zinc-700/70 hover:text-white transition-all cursor-pointer"
            title="Text Color"
          >
            <span className="text-xs font-bold leading-none">A</span>
            <span
              className="w-4 h-1 rounded-sm"
              style={{
                backgroundColor:
                  editor.getAttributes('textStyle').color ?? '#f4f4f5',
              }}
            />
          </button>
          <input
            ref={textColorRef}
            type="color"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            defaultValue="#ffffff"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </div>

        {/* Highlight Color */}
        <div className="relative shrink-0" title="Highlight / Background Color">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              highlightColorRef.current?.click();
            }}
            className="inline-flex flex-col items-center justify-center gap-0.5 h-7 px-1.5 rounded text-zinc-200 hover:bg-zinc-700/70 hover:text-white transition-all cursor-pointer"
            title="Highlight Color"
          >
            <span className="text-xs font-bold leading-none">H</span>
            <span className="w-4 h-1 rounded-sm bg-yellow-400" />
          </button>
          <input
            ref={highlightColorRef}
            type="color"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            defaultValue="#fef08a"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: e.target.value })
                .run()
            }
          />
        </div>

        <Sep />

        {/* ── Group 4: Headings & Blocks ── */}
        {([1, 2, 3, 4, 5, 6] as const).map((level) => (
          <Btn
            key={level}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            active={editor.isActive('heading', { level })}
            title={`Heading ${level}`}
            wide
          >
            H{level}
          </Btn>
        ))}
        <Btn
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph') && !editor.isActive('heading')}
          title="Paragraph"
        >
          ¶
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          ❝
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule / Divider"
          wide
        >
          ─ HR
        </Btn>

        <Sep />

        {/* ── Group 5: Lists ── */}
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
          wide
        >
          • List
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
          wide
        >
          1. List
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          title="Task / Checkbox List"
          wide
        >
          ☑ Task
        </Btn>

        <Sep />

        {/* ── Group 6: Text Alignment ── */}
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          {/* Left-align icon */}
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5" rx="0.75" />
            <rect x="0" y="3" width="9" height="1.5" rx="0.75" />
            <rect x="0" y="6" width="12" height="1.5" rx="0.75" />
            <rect x="0" y="9" width="7" height="1.5" rx="0.75" />
          </svg>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5" rx="0.75" />
            <rect x="1.5" y="3" width="9" height="1.5" rx="0.75" />
            <rect x="0" y="6" width="12" height="1.5" rx="0.75" />
            <rect x="2.5" y="9" width="7" height="1.5" rx="0.75" />
          </svg>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5" rx="0.75" />
            <rect x="3" y="3" width="9" height="1.5" rx="0.75" />
            <rect x="0" y="6" width="12" height="1.5" rx="0.75" />
            <rect x="5" y="9" width="7" height="1.5" rx="0.75" />
          </svg>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5" rx="0.75" />
            <rect x="0" y="3" width="12" height="1.5" rx="0.75" />
            <rect x="0" y="6" width="12" height="1.5" rx="0.75" />
            <rect x="0" y="9" width="12" height="1.5" rx="0.75" />
          </svg>
        </Btn>

        <Sep />

        {/* ── Group 7: Media & Embeds ── */}
        <Btn
          onClick={insertLink}
          active={editor.isActive('link')}
          title="Insert / Edit Link"
          wide
        >
          🔗 Link
        </Btn>
        <Btn onClick={insertImage} title="Insert Image (URL)" wide>
          🖼 Image
        </Btn>
        <Btn onClick={insertYoutube} title="Insert YouTube Video" wide>
          ▶ YouTube
        </Btn>
        <Btn onClick={insertTable} title="Insert 3×3 Table" wide>
          ⊞ Table
        </Btn>

        <Sep />

        {/* ── Code View toggle (pinned right) ── */}
        <button
          type="button"
          onClick={toggleHtmlMode}
          title={
            isHtmlMode
              ? 'Return to Visual Editor'
              : 'Switch to HTML Source Code Mode'
          }
          className={[
            'ml-auto shrink-0 px-3 py-1 rounded-md text-xs font-mono font-semibold',
            'transition-all duration-150 whitespace-nowrap',
            isHtmlMode
              ? 'bg-emerald-500 text-zinc-900 shadow-md shadow-emerald-500/30'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white',
          ].join(' ')}
        >
          {isHtmlMode ? '← Visual' : '</> HTML'}
        </button>
      </div>

      {/* ══ EDITOR BODY ═══════════════════════════════════════════════════════ */}
      {isHtmlMode ? (
        /* ── Raw HTML textarea ── */
        <textarea
          value={rawHtml}
          onChange={handleRawHtmlChange}
          spellCheck={false}
          placeholder={'<!-- Paste TradingView embeds, iframes, or any raw HTML here -->\n<!-- Toggle back to Visual when done -->'}
          className={[
            'w-full bg-zinc-950 text-emerald-300 font-mono text-sm leading-relaxed',
            'p-5 resize-none focus:outline-none',
            'placeholder:text-zinc-600',
          ].join(' ')}
          style={{ minHeight }}
        />
      ) : (
        /* ── TipTap WYSIWYG ── */
        <div
          className="bg-zinc-900 cursor-text"
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {/* ══ STATUS BAR ════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/50 border-t border-zinc-700/40">
        <span className="text-zinc-600 text-xs">
          {isHtmlMode ? 'HTML Source Mode — edits applied on Visual toggle' : 'Visual Mode'}
        </span>
        {!isHtmlMode && (
          <span className="text-zinc-600 text-xs">
            {editor.storage.characterCount?.words?.() ?? 0} words
          </span>
        )}
      </div>

      {/* Hidden native color inputs */}
      <input ref={textColorRef} type="color" className="sr-only" aria-hidden />
      <input ref={highlightColorRef} type="color" className="sr-only" aria-hidden />
    </div>
  );
}