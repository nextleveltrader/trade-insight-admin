'use client';

/**
 * src/app/assets/AssetsManager.tsx  —  Client Component
 *
 * Changes in this revision:
 *   • Two separate useTransition hooks:
 *       isPending / startTransition  → CRUD operations (add/delete/update)
 *       isRunning / startEngine      → AI chain execution
 *   • EngineResultToast — appears top-right after chain completes, auto-
 *     dismisses after 10 s or on manual close.
 *   • "Pipeline Running" overlay on the chain column while isRunning is true.
 *   • Run All button wired to runPromptChain(assetId).
 */

import { useState, useTransition, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, ChevronRight, Zap, Clock, Send, FileText,
  MessageSquare, Layers, Bot, GripVertical, Globe, TrendingUp,
  Sparkles, X, CheckCircle2, ArrowRightCircle, Copy, ClipboardCheck,
  AlertCircle, Loader2, Activity, CircleCheck, CircleX, ExternalLink,
} from 'lucide-react';

import type { InitialData }           from '@/actions/assets.actions';
import type { ChainRunResult }        from '@/actions/engine.actions';
import type { Category, Asset, DBPrompt } from '@/db/schema';
import {
  addCategory,      deleteCategory,
  addAsset,         deleteAsset,
  upsertPromptStep, deletePromptStep,
} from '@/actions/assets.actions';
import { runPromptChain } from '@/actions/engine.actions';

// ─── Client-side types ────────────────────────────────────────────────────────

type OutputDest = 'next_step' | 'telegram' | 'blog_draft';
type AIModel    = 'claude' | 'perplexity' | 'gemini' | 'chatgpt';
type ExecType   = 'manual' | 'scheduled';

type PromptStep = {
  id:              number;
  order:           number;
  model:           AIModel;
  outputTo:        OutputDest;
  targetStepOrder: number | undefined;
  content:         string;
  execType:        ExecType;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_MODELS: { value: AIModel; label: string; color: string; bg: string }[] = [
  { value: 'claude',     label: 'Claude',     color: '#6EE7B7', bg: '#6EE7B722' },
  { value: 'perplexity', label: 'Perplexity', color: '#60A5FA', bg: '#60A5FA22' },
  { value: 'gemini',     label: 'Gemini',     color: '#A78BFA', bg: '#A78BFA22' },
  { value: 'chatgpt',    label: 'ChatGPT',    color: '#34D399', bg: '#34D39922' },
];

const OUTPUT_DESTS: { value: OutputDest; label: string; icon: React.ElementType }[] = [
  { value: 'next_step',  label: 'Next Step',  icon: ChevronRight },
  { value: 'telegram',   label: 'Telegram',   icon: Send },
  { value: 'blog_draft', label: 'Blog Draft', icon: FileText },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbPromptToStep(p: DBPrompt): PromptStep {
  return {
    id:              p.id,
    order:           p.order,
    model:           p.model as AIModel,
    outputTo:        p.outputTo as OutputDest,
    targetStepOrder: p.targetStepOrder ?? undefined,
    content:         p.content,
    execType:        (p.execType ?? 'manual') as ExecType,
  };
}

function buildPromptMap(flatPrompts: DBPrompt[]): Record<number, PromptStep[]> {
  return flatPrompts.reduce<Record<number, PromptStep[]>>((acc, p) => {
    if (!p.assetId) return acc;
    if (!acc[p.assetId]) acc[p.assetId] = [];
    acc[p.assetId].push(dbPromptToStep(p));
    return acc;
  }, {});
}

function defaultTarget(currentOrder: number, steps: PromptStep[]): number | undefined {
  return steps.find((s) => s.order === currentOrder + 1)?.order;
}

// ─── Engine Result Toast ──────────────────────────────────────────────────────

function EngineResultToast({
  result,
  assetName,
  onClose,
}: {
  result:    { success: true };
  assetName: string;
  onClose:   () => void;
}) {
  // Auto-dismiss after 10 s
  useEffect(() => {
    const t = setTimeout(onClose, 10_000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden bg-zinc-900 border-emerald-500/30">
      {/* Coloured top strip */}
      <div className="h-0.5 w-full bg-emerald-500" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CircleCheck size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Chain Complete
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">{assetName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5">
            <X size={14} />
          </button>
        </div>

        {/* Success message */}
        <p className="text-xs text-zinc-400 mb-3">
          The AI prompt chain has completed successfully.
        </p>
      </div>

      {/* Auto-dismiss countdown bar */}
      <div className="h-0.5 bg-emerald-500/20">
        <div
          className="h-full bg-emerald-500/60 animate-[shrink_10s_linear_forwards]"
          style={{ transformOrigin: 'left', animation: 'shrink 10s linear forwards' }}
        />
      </div>

      <style>{`
        @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
    </div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-zinc-900 border border-red-500/30 rounded-xl px-4 py-3 shadow-2xl max-w-sm">
      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-zinc-300 flex-1">{message}</p>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-emerald-400" />
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500">
          {subtitle}
        </span>
      </div>
      <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</h2>
    </div>
  );
}

// ─── Category Column ──────────────────────────────────────────────────────────

function CategoryColumn({ categories, selectedId, isPending, onSelect, onAdd, onDelete }: {
  categories: Category[];
  selectedId: number | null;
  isPending:  boolean;
  onSelect:   (id: number) => void;
  onAdd:      (name: string) => void;
  onDelete:   (id: number) => void;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding]   = useState(false);

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="flex flex-col h-full">
      <SectionHeader icon={Layers} title="Categories" subtitle="Market Groups" />

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const active = cat.id === selectedId;
          return (
            <div
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                active
                  ? 'bg-emerald-500/10 border border-emerald-500/25'
                  : 'hover:bg-zinc-800/70 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                  active ? 'bg-emerald-400' : 'bg-zinc-700'
                }`} />
                <span className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-zinc-300'}`}>
                  {cat.name}
                </span>
              </div>
              <button
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all disabled:pointer-events-none"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        {adding ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Category name…"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500/60 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
                Add
              </button>
              <button onClick={() => setAdding(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium py-1.5 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-emerald-500/40 text-zinc-600 hover:text-emerald-400 text-xs transition-all disabled:opacity-40 disabled:pointer-events-none">
            <Plus size={12} />New Category
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Asset Column ─────────────────────────────────────────────────────────────

function AssetColumn({ assets, selectedId, selectedCategory, isPending, onSelect, onAdd, onDelete }: {
  assets:           Asset[];
  selectedId:       number | null;
  selectedCategory: Category | undefined;
  isPending:        boolean;
  onSelect:         (id: number) => void;
  onAdd:            (name: string) => void;
  onDelete:         (id: number) => void;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding]   = useState(false);

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="flex flex-col h-full">
      <SectionHeader
        icon={TrendingUp}
        title={selectedCategory ? `${selectedCategory.name} Assets` : 'Assets'}
        subtitle="Instruments"
      />

      {!selectedCategory ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
            <Layers size={18} className="text-zinc-700" />
          </div>
          <p className="text-zinc-600 text-xs leading-relaxed">Select a category<br />to manage assets</p>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-1 overflow-y-auto pr-1">
            {assets.length === 0 && (
              <p className="text-zinc-700 text-xs text-center py-6">No assets yet</p>
            )}
            {assets.map((asset) => {
              const active = asset.id === selectedId;
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelect(asset.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    active
                      ? 'bg-blue-500/10 border border-blue-500/25'
                      : 'hover:bg-zinc-800/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={13} className={active ? 'text-blue-400' : 'text-zinc-600'} />
                    <span className={`text-sm font-mono font-medium tracking-wide ${active ? 'text-blue-300' : 'text-zinc-300'}`}>
                      {asset.name}
                    </span>
                  </div>
                  <button
                    disabled={isPending}
                    onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all disabled:pointer-events-none"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800">
            {adding ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setAdding(false);
                  }}
                  placeholder="e.g. XAUUSD"
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-blue-500/60 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : null}Add
                  </button>
                  <button onClick={() => setAdding(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium py-1.5 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-blue-500/40 text-zinc-600 hover:text-blue-400 text-xs transition-all disabled:opacity-40 disabled:pointer-events-none">
                <Plus size={12} />New Asset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Placeholder Badge ────────────────────────────────────────────────────────

function PlaceholderBadge({ variable, sourceOrder, targetOrder }: {
  variable: string; sourceOrder: number; targetOrder: number;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(variable).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
      <div className="mt-0.5 w-0.5 self-stretch rounded-full bg-emerald-500/40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-500 mb-1.5 leading-relaxed">
          Insert this variable inside{' '}
          <span className="text-blue-400 font-medium">Step {targetOrder}</span>
          {"'s"} prompt where you want Step {sourceOrder}{"'s"} output to appear:
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 min-w-0">
            <span className="text-zinc-600 font-mono text-[11px] select-none">{'{'}</span>
            <span className="text-[11px] font-mono text-emerald-300 tracking-tight truncate">
              {variable.replace(/^\{\{|\}\}$/g, '')}
            </span>
            <span className="text-zinc-600 font-mono text-[11px] select-none">{'}'}</span>
          </div>
          <button onClick={handleCopy} title="Copy variable"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border transition-all duration-150 flex-shrink-0 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}>
            {copied ? <><ClipboardCheck size={11} />Copied!</> : <><Copy size={11} />Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────

function PromptCard({ step, allSteps, isPending, isRunning, onUpdate, onDelete, isLast }: {
  step:      PromptStep;
  allSteps:  PromptStep[];
  isPending: boolean;
  isRunning: boolean;
  onUpdate:  (id: number, patch: Partial<PromptStep>) => void;
  onDelete:  (id: number) => void;
  isLast:    boolean;
}) {
  const targetableSteps = allSteps.filter((s) => s.order !== step.order);
  const placeholderVar  = `{{step_${step.order}_output}}`;
  const frozen          = isPending || isRunning;

  function handleOutputChange(dest: OutputDest) {
    if (dest === 'next_step') {
      onUpdate(step.id, { outputTo: dest, targetStepOrder: defaultTarget(step.order, allSteps) });
    } else {
      onUpdate(step.id, { outputTo: dest, targetStepOrder: undefined });
    }
  }

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-[22px] top-full w-px h-4 bg-gradient-to-b from-zinc-700 to-transparent z-10" />
      )}

      <div className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200 ${
        isRunning
          ? 'border-zinc-700 opacity-50'
          : frozen
          ? 'border-zinc-800 opacity-60'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-black/30">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical size={14} className="text-zinc-700 cursor-grab" />
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700">
              <span className="text-[10px] font-bold text-zinc-300">{step.order}</span>
            </div>
            <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">
              Step {step.order}
            </span>
          </div>

          {/* Manual / Scheduled toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-zinc-800 rounded-lg border border-zinc-700/50">
            {(['manual', 'scheduled'] as ExecType[]).map((t) => (
              <button key={t} disabled={frozen}
                onClick={() => onUpdate(step.id, { execType: t })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  step.execType === t
                    ? t === 'manual'
                      ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30'
                      : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
                }`}>
                {t === 'manual' ? <Zap size={10} /> : <Clock size={10} />}{t}
              </button>
            ))}
          </div>

          <button disabled={frozen} onClick={() => onDelete(step.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-all disabled:pointer-events-none">
            {isPending ? <Loader2 size={13} className="animate-spin text-zinc-600" /> : <X size={13} />}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">

            {/* AI Model */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                AI Model
              </label>
              <div className="grid grid-cols-2 gap-1">
                {AI_MODELS.map((m) => (
                  <button key={m.value} disabled={frozen}
                    onClick={() => onUpdate(step.id, { model: m.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border disabled:pointer-events-none ${
                      step.model !== m.value
                        ? 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                        : ''
                    }`}
                    style={step.model === m.value
                      ? { backgroundColor: m.bg, borderColor: m.color + '55', color: m.color }
                      : {}
                    }>
                    <Bot size={11} />{m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Output destination */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Output To
              </label>
              <div className="space-y-1">
                {OUTPUT_DESTS.map((o) => {
                  const Icon   = o.icon;
                  const active = step.outputTo === o.value;
                  return (
                    <button key={o.value} disabled={frozen}
                      onClick={() => handleOutputChange(o.value)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:pointer-events-none ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                      }`}>
                      <Icon size={11} />{o.label}
                      {active && <CheckCircle2 size={11} className="ml-auto text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target Step + Placeholder */}
          {step.outputTo === 'next_step' && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <ArrowRightCircle size={13} className="text-blue-400" />
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                  Target Step
                </span>
              </div>

              {targetableSteps.length === 0 ? (
                <p className="text-[11px] text-zinc-600 italic">
                  No other steps to route to — add more steps first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {targetableSteps.map((s) => {
                    const isSelected  = step.targetStepOrder === s.order;
                    const targetModel = AI_MODELS.find((m) => m.value === s.model)!;
                    return (
                      <button key={s.id} disabled={frozen}
                        onClick={() => onUpdate(step.id, { targetStepOrder: s.order })}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:pointer-events-none ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                        }`}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: targetModel.color }} />
                        Step {s.order}
                        <span className="text-[9px] opacity-60">({targetModel.label})</span>
                        {isSelected && <CheckCircle2 size={10} className="text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {step.targetStepOrder !== undefined && (
                <>
                  <p className="text-[10px] text-zinc-600 pt-0.5">
                    Output of{' '}
                    <span className="font-mono text-zinc-400">Step {step.order}</span>
                    {' '}→ piped as input to{' '}
                    <span className="font-mono text-blue-400">Step {step.targetStepOrder}</span>
                  </p>
                  <PlaceholderBadge
                    variable={placeholderVar}
                    sourceOrder={step.order}
                    targetOrder={step.targetStepOrder}
                  />
                </>
              )}
            </div>
          )}

          {/* Prompt textarea */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
              Prompt Instructions
            </label>
            <textarea
              value={step.content}
              disabled={frozen}
              onChange={(e) => onUpdate(step.id, { content: e.target.value })}
              placeholder="You are a professional financial analyst. Analyze the latest market data for the selected asset and provide a concise technical outlook…"
              rows={4}
              className="w-full bg-black border border-zinc-800 focus:border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none resize-none transition-colors font-mono leading-relaxed disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Chain Column ──────────────────────────────────────────────────────

function PromptChainColumn({
  selectedAsset, steps, isPending, isRunning,
  onAddStep, onUpdateStep, onDeleteStep, onRunAll,
}: {
  selectedAsset: Asset | undefined;
  steps:         PromptStep[];
  isPending:     boolean;
  isRunning:     boolean;
  onAddStep:     () => void;
  onUpdateStep:  (id: number, patch: Partial<PromptStep>) => void;
  onDeleteStep:  (id: number) => void;
  onRunAll:      () => void;
}) {
  const anyBusy = isPending || isRunning;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className={isRunning ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'} />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500">
              Automation Pipeline
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-wider animate-pulse">
                <Activity size={9} />Live
              </span>
            )}
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            {selectedAsset ? (
              <>Prompt Chain —{' '}
                <span className="font-mono text-blue-300">{selectedAsset.name}</span>
              </>
            ) : 'Prompt Chain Builder'}
          </h2>
        </div>

        {selectedAsset && (
          <div className="flex items-center gap-2">
            {isPending && !isRunning && (
              <Loader2 size={13} className="text-zinc-500 animate-spin" />
            )}
            <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] text-zinc-400 font-medium">
              {steps.length} step{steps.length !== 1 ? 's' : ''}
            </span>

            {/* ── Run All button ── */}
            <button
              onClick={onRunAll}
              disabled={anyBusy || steps.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:pointer-events-none ${
                isRunning
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 cursor-not-allowed'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/25 text-emerald-300'
              }`}
            >
              {isRunning
                ? <><Loader2 size={11} className="animate-spin" />Running…</>
                : <><Zap size={11} />Run All</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── Pipeline running overlay ── */}
      {isRunning && selectedAsset && (
        <div className="mb-4 flex-shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Activity size={14} className="text-emerald-400" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-lg border border-emerald-500/40 animate-ping" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-300">AI Pipeline Running</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Executing {steps.length} step{steps.length !== 1 ? 's' : ''} sequentially…
                this may take a minute.
              </p>
            </div>
          </div>
          {/* Indeterminate progress bar */}
          <div className="mt-3 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/60 rounded-full animate-[progress_2s_ease-in-out_infinite]"
              style={{ animation: 'progress 2s ease-in-out infinite' }}
            />
          </div>
          <style>{`
            @keyframes progress {
              0%   { margin-left: 0%;   width: 0%;   }
              50%  { margin-left: 25%;  width: 50%;  }
              100% { margin-left: 100%; width: 0%;   }
            }
          `}</style>
        </div>
      )}

      {/* Body */}
      {!selectedAsset ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <MessageSquare size={24} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">No asset selected</p>
          <p className="text-zinc-700 text-xs max-w-[220px] leading-relaxed">
            Select a category and asset from the left panels to build a prompt chain
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {steps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center mb-3">
                <Plus size={18} className="text-zinc-700" />
              </div>
              <p className="text-zinc-600 text-xs">No steps yet — add one below</p>
            </div>
          )}

          {steps.map((step, idx) => (
            <PromptCard
              key={step.id}
              step={step}
              allSteps={steps}
              isPending={isPending}
              isRunning={isRunning}
              onUpdate={onUpdateStep}
              onDelete={onDeleteStep}
              isLast={idx === steps.length - 1}
            />
          ))}

          <button
            onClick={onAddStep}
            disabled={anyBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/40 text-zinc-600 hover:text-emerald-400 text-xs font-medium transition-all hover:bg-emerald-400/5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add Step {steps.length + 1}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AssetsManager (root client component) ────────────────────────────────────

export default function AssetsManager({ initialData }: { initialData: InitialData }) {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [assets,     setAssets]     = useState<Asset[]>(initialData.assets);
  const [promptMap,  setPromptMap]  = useState<Record<number, PromptStep[]>>(
    () => buildPromptMap(initialData.prompts)
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAssetId,    setSelectedAssetId]    = useState<number | null>(null);
  const [errorMsg,           setErrorMsg]           = useState<string | null>(null);
  const [engineResult,       setEngineResult]       = useState<{ success: true } | null>(null);

  // ── Two independent transitions ────────────────────────────────────────────
  // isPending  → CRUD (add/delete/update) — keeps UI responsive during saves
  // isRunning  → AI chain execution       — can take 30–120 s; blocks Run All only
  const [isPending, startTransition] = useTransition();
  const [isRunning, startEngine]     = useTransition();

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const visibleAssets    = assets.filter((a) => a.categoryId === selectedCategoryId);
  const selectedAsset    = assets.find((a) => a.id === selectedAssetId);
  const currentSteps     = selectedAssetId ? (promptMap[selectedAssetId] ?? []) : [];

  const showError = useCallback((msg: string) => setErrorMsg(msg), []);

  // ── Category handlers ──────────────────────────────────────────────────────

  function handleSelectCategory(id: number) {
    setSelectedCategoryId(id);
    setSelectedAssetId(null);
  }

  function handleAddCategory(name: string) {
    const tempCat: Category = { id: -Date.now(), name };
    setCategories((prev) => [...prev, tempCat]);
    startTransition(async () => {
      const result = await addCategory(name);
      if (result.error) {
        setCategories((prev) => prev.filter((c) => c.id !== tempCat.id));
        showError(result.error);
        return;
      }
      const created = result.data!;
      setCategories((prev) => prev.map((c) => (c.id === tempCat.id ? created : c)));
    });
  }

  function handleDeleteCategory(id: number) {
    const backup = { categories: [...categories], assets: [...assets] };
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setAssets((prev) => prev.filter((a) => a.categoryId !== id));
    if (selectedCategoryId === id) { setSelectedCategoryId(null); setSelectedAssetId(null); }
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        setCategories(backup.categories);
        setAssets(backup.assets);
        showError(result.error);
      }
    });
  }

  // ── Asset handlers ─────────────────────────────────────────────────────────

  function handleAddAsset(name: string) {
    if (!selectedCategoryId) return;
    const tempAsset: Asset = { id: -Date.now(), name, categoryId: selectedCategoryId };
    setAssets((prev) => [...prev, tempAsset]);
    startTransition(async () => {
      const result = await addAsset(name, selectedCategoryId);
      if (result.error) {
        setAssets((prev) => prev.filter((a) => a.id !== tempAsset.id));
        showError(result.error);
        return;
      }
      const created = result.data!;
      setAssets((prev) => prev.map((a) => (a.id === tempAsset.id ? created : a)));
    });
  }

  function handleDeleteAsset(id: number) {
    const backupAssets = [...assets];
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (selectedAssetId === id) setSelectedAssetId(null);
    startTransition(async () => {
      const result = await deleteAsset(id);
      if (result.error) {
        setAssets(backupAssets);
        showError(result.error);
      }
    });
  }

  // ── Step handlers ──────────────────────────────────────────────────────────

  function handleAddStep() {
    if (!selectedAssetId) return;
    const existing = promptMap[selectedAssetId] ?? [];
    const newOrder = existing.length + 1;
    const tempStep: PromptStep = {
      id: -Date.now(), order: newOrder, model: 'claude',
      outputTo: 'next_step', targetStepOrder: undefined, content: '', execType: 'manual',
    };
    setPromptMap((prev) => ({ ...prev, [selectedAssetId]: [...existing, tempStep] }));
    startTransition(async () => {
      const result = await upsertPromptStep({
        assetId: selectedAssetId, order: newOrder, model: 'claude',
        content: '', outputTo: 'next_step', targetStepOrder: null, execType: 'manual',
      });
      if (result.error) {
        setPromptMap((prev) => ({
          ...prev,
          [selectedAssetId]: (prev[selectedAssetId] ?? []).filter((s) => s.id !== tempStep.id),
        }));
        showError(result.error);
        return;
      }
      const savedStep = dbPromptToStep(result.data!);
      setPromptMap((prev) => ({
        ...prev,
        [selectedAssetId]: (prev[selectedAssetId] ?? []).map((s) =>
          s.id === tempStep.id ? savedStep : s
        ),
      }));
    });
  }

  function handleUpdateStep(id: number, patch: Partial<PromptStep>) {
    if (!selectedAssetId) return;
    setPromptMap((prev) => ({
      ...prev,
      [selectedAssetId]: (prev[selectedAssetId] ?? []).map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    }));
    const current = (promptMap[selectedAssetId] ?? []).find((s) => s.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    startTransition(async () => {
      const result = await upsertPromptStep({
        id,
        assetId:         selectedAssetId,
        order:           merged.order,
        model:           merged.model,
        content:         merged.content,
        outputTo:        merged.outputTo,
        targetStepOrder: merged.targetStepOrder ?? null,
        execType:        merged.execType,
      });
      if (result.error) {
        setPromptMap((prev) => ({
          ...prev,
          [selectedAssetId]: (prev[selectedAssetId] ?? []).map((s) =>
            s.id === id ? current : s
          ),
        }));
        showError(result.error);
      }
    });
  }

  function handleDeleteStep(id: number) {
    if (!selectedAssetId) return;
    const backup = [...(promptMap[selectedAssetId] ?? [])];
    const filtered  = backup.filter((s) => s.id !== id);
    const reordered = filtered.map((s, i) => ({ ...s, order: i + 1 }));
    const validOrders = new Set(reordered.map((s) => s.order));
    const cleaned = reordered.map((s) =>
      s.outputTo === 'next_step' && s.targetStepOrder !== undefined && !validOrders.has(s.targetStepOrder)
        ? { ...s, targetStepOrder: undefined }
        : s
    );
    setPromptMap((prev) => ({ ...prev, [selectedAssetId]: cleaned }));
    startTransition(async () => {
      const result = await deletePromptStep(id, selectedAssetId);
      if (result.error) {
        setPromptMap((prev) => ({ ...prev, [selectedAssetId]: backup }));
        showError(result.error);
        return;
      }
      setPromptMap((prev) => ({
        ...prev,
        [selectedAssetId]: result.data!.map(dbPromptToStep),
      }));
    });
  }

  // ── Engine handler ─────────────────────────────────────────────────────────

  function handleRunAll() {
    if (!selectedAssetId) return;
    setEngineResult(null); // clear any previous result

    startEngine(async () => {
      try {
        const result = await runPromptChain(selectedAssetId);
        if (result.success) {
          setEngineResult(result);
        } else {
          showError(result.error);
        }
      } catch (err) {
        showError('An unexpected error occurred while running the prompt chain.');
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {errorMsg && (
        <ErrorBanner message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {engineResult && (
        <EngineResultToast
          result={engineResult}
          assetName={selectedAsset?.name ?? 'Asset'}
          onClose={() => setEngineResult(null)}
        />
      )}

      {/* Page title bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Assets &amp; Prompt Management
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Configure market categories, instruments, and AI automation pipelines
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
          {isRunning
            ? <Activity size={10} className="text-emerald-400 animate-pulse" />
            : isPending
            ? <Loader2  size={10} className="text-emerald-400 animate-spin" />
            : <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          }
          <span className="text-xs text-zinc-400 font-medium">
            {isRunning
              ? 'Pipeline running…'
              : `${categories.length} categories · ${assets.length} assets`
            }
          </span>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 grid grid-cols-[200px_200px_1fr] gap-4 min-h-0">

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0">
          <CategoryColumn
            categories={categories}
            selectedId={selectedCategoryId}
            isPending={isPending}
            onSelect={handleSelectCategory}
            onAdd={handleAddCategory}
            onDelete={handleDeleteCategory}
          />
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0">
          <AssetColumn
            assets={visibleAssets}
            selectedId={selectedAssetId}
            selectedCategory={selectedCategory}
            isPending={isPending}
            onSelect={setSelectedAssetId}
            onAdd={handleAddAsset}
            onDelete={handleDeleteAsset}
          />
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0 overflow-hidden">
          <PromptChainColumn
            selectedAsset={selectedAsset}
            steps={currentSteps}
            isPending={isPending}
            isRunning={isRunning}
            onAddStep={handleAddStep}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
            onRunAll={handleRunAll}
          />
        </div>
      </div>
    </div>
  );
}