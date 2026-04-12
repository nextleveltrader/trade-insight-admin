"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronRight,
  Zap,
  Clock,
  Send,
  FileText,
  MessageSquare,
  Layers,
  Bot,
  GripVertical,
  Globe,
  TrendingUp,
  Sparkles,
  X,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: number; name: string };
type Asset = { id: number; name: string; categoryId: number };
type OutputDest = "next_step" | "telegram" | "blog_draft";
type AIModel = "claude" | "perplexity" | "gemini" | "chatgpt";
type ExecType = "manual" | "scheduled";

type PromptStep = {
  id: number;
  order: number;
  model: AIModel;
  outputTo: OutputDest;
  content: string;
  execType: ExecType;
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CATEGORIES: Category[] = [
  { id: 1, name: "Forex" },
  { id: 2, name: "Crypto" },
  { id: 3, name: "Commodities" },
];

const SEED_ASSETS: Asset[] = [
  { id: 1, name: "XAUUSD", categoryId: 1 },
  { id: 2, name: "EURUSD", categoryId: 1 },
  { id: 3, name: "BTCUSD", categoryId: 2 },
  { id: 4, name: "ETHUSD", categoryId: 2 },
  { id: 5, name: "WTI Oil", categoryId: 3 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_MODELS: { value: AIModel; label: string; color: string }[] = [
  { value: "claude", label: "Claude", color: "#D4956A" },
  { value: "perplexity", label: "Perplexity", color: "#20B8CD" },
  { value: "gemini", label: "Gemini", color: "#4285F4" },
  { value: "chatgpt", label: "ChatGPT", color: "#10A37F" },
];

const OUTPUT_DESTS: { value: OutputDest; label: string; icon: typeof Send }[] =
  [
    { value: "next_step", label: "Next Step", icon: ChevronRight },
    { value: "telegram", label: "Telegram", icon: Send },
    { value: "blog_draft", label: "Blog Draft", icon: FileText },
  ];

let _nextCatId = 10;
let _nextAssetId = 20;
let _nextPromptId = 100;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-amber-400" />
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400">
          {subtitle}
        </span>
      </div>
      <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
        {title}
      </h2>
    </div>
  );
}

// ─── Category Column ──────────────────────────────────────────────────────────

function CategoryColumn({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
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
                  ? "bg-amber-400/10 border border-amber-400/30"
                  : "hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    active ? "bg-amber-400" : "bg-slate-600"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    active ? "text-amber-300" : "text-slate-300"
                  }`}
                >
                  {cat.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(cat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        {adding ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Category name…"
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium py-1.5 rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-700 hover:border-amber-500/40 text-slate-500 hover:text-amber-400 text-xs transition-all"
          >
            <Plus size={12} />
            New Category
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Asset Column ─────────────────────────────────────────────────────────────

function AssetColumn({
  assets,
  selectedId,
  selectedCategory,
  onSelect,
  onAdd,
  onDelete,
}: {
  assets: Asset[];
  selectedId: number | null;
  selectedCategory: Category | undefined;
  onSelect: (id: number) => void;
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col h-full">
      <SectionHeader
        icon={TrendingUp}
        title={selectedCategory ? `${selectedCategory.name} Assets` : "Assets"}
        subtitle="Instruments"
      />

      {!selectedCategory ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <Layers size={18} className="text-slate-600" />
          </div>
          <p className="text-slate-600 text-xs leading-relaxed">
            Select a category
            <br />
            to manage assets
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-1 overflow-y-auto pr-1">
            {assets.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-6">
                No assets yet
              </p>
            )}
            {assets.map((asset) => {
              const active = asset.id === selectedId;
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelect(asset.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    active
                      ? "bg-sky-400/10 border border-sky-400/25"
                      : "hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe
                      size={13}
                      className={active ? "text-sky-400" : "text-slate-600"}
                    />
                    <span
                      className={`text-sm font-mono font-medium tracking-wide ${
                        active ? "text-sky-300" : "text-slate-300"
                      }`}
                    >
                      {asset.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(asset.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            {adding ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="e.g. XAUUSD"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500/60 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="flex-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium py-1.5 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-700 hover:border-sky-500/40 text-slate-500 hover:text-sky-400 text-xs transition-all"
              >
                <Plus size={12} />
                New Asset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────

function PromptCard({
  step,
  onUpdate,
  onDelete,
  isLast,
}: {
  step: PromptStep;
  onUpdate: (id: number, patch: Partial<PromptStep>) => void;
  onDelete: (id: number) => void;
  isLast: boolean;
}) {
  const modelMeta = AI_MODELS.find((m) => m.value === step.model)!;
  const outputMeta = OUTPUT_DESTS.find((o) => o.value === step.outputTo)!;
  const OutputIcon = outputMeta.icon;

  return (
    <div className="relative">
      {/* Step connector line */}
      {!isLast && (
        <div className="absolute left-[22px] top-full w-px h-4 bg-gradient-to-b from-slate-700 to-transparent z-10" />
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
        {/* Card Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical size={14} className="text-slate-700 cursor-grab" />
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 border border-slate-700">
              <span className="text-[10px] font-bold text-slate-300">
                {step.order}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Step {step.order}
            </span>
          </div>

          {/* Exec toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800 rounded-lg">
            {(["manual", "scheduled"] as ExecType[]).map((t) => (
              <button
                key={t}
                onClick={() => onUpdate(step.id, { execType: t })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  step.execType === t
                    ? t === "manual"
                      ? "bg-violet-500/30 text-violet-300"
                      : "bg-emerald-500/30 text-emerald-300"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {t === "manual" ? (
                  <Zap size={10} />
                ) : (
                  <Clock size={10} />
                )}
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => onDelete(step.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-all"
          >
            <X size={13} />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-4">
          {/* Model + Output row */}
          <div className="grid grid-cols-2 gap-3">
            {/* AI Model selector */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                AI Model
              </label>
              <div className="grid grid-cols-2 gap-1">
                {AI_MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => onUpdate(step.id, { model: m.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      step.model === m.value
                        ? "border-opacity-50 text-white"
                        : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                    }`}
                    style={
                      step.model === m.value
                        ? {
                            backgroundColor: m.color + "22",
                            borderColor: m.color + "55",
                            color: m.color,
                          }
                        : {}
                    }
                  >
                    <Bot size={11} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Output destination */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Output To
              </label>
              <div className="space-y-1">
                {OUTPUT_DESTS.map((o) => {
                  const Icon = o.icon;
                  const active = step.outputTo === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => onUpdate(step.id, { outputTo: o.value })}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
                          : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                      }`}
                    >
                      <Icon size={11} />
                      {o.label}
                      {active && (
                        <CheckCircle2 size={11} className="ml-auto text-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prompt textarea */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Prompt Instructions
            </label>
            <textarea
              value={step.content}
              onChange={(e) => onUpdate(step.id, { content: e.target.value })}
              placeholder={`You are a professional financial analyst. Analyze the latest market data for the selected asset and provide a concise technical outlook…`}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder-slate-700 outline-none resize-none transition-colors font-mono leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Chain Column ──────────────────────────────────────────────────────

function PromptChainColumn({
  selectedAsset,
  steps,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
}: {
  selectedAsset: Asset | undefined;
  steps: PromptStep[];
  onAddStep: () => void;
  onUpdateStep: (id: number, patch: Partial<PromptStep>) => void;
  onDeleteStep: (id: number) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400">
              Automation Pipeline
            </span>
          </div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            {selectedAsset ? (
              <>
                Prompt Chain —{" "}
                <span className="font-mono text-amber-300">
                  {selectedAsset.name}
                </span>
              </>
            ) : (
              "Prompt Chain Builder"
            )}
          </h2>
        </div>

        {selectedAsset && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] text-slate-400 font-medium">
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold transition-all">
              <Zap size={11} />
              Run All
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {!selectedAsset ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <MessageSquare size={24} className="text-slate-700" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">
            No asset selected
          </p>
          <p className="text-slate-700 text-xs max-w-[220px] leading-relaxed">
            Select a category and asset from the left panels to build a prompt
            chain
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {steps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center mb-3">
                <Plus size={18} className="text-slate-600" />
              </div>
              <p className="text-slate-600 text-xs">No steps yet — add one below</p>
            </div>
          )}

          {steps.map((step, idx) => (
            <PromptCard
              key={step.id}
              step={step}
              onUpdate={onUpdateStep}
              onDelete={onDeleteStep}
              isLast={idx === steps.length - 1}
            />
          ))}

          {/* Add step button */}
          <button
            onClick={onAddStep}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/40 text-slate-600 hover:text-amber-400 text-xs font-medium transition-all hover:bg-amber-400/5"
          >
            <Plus size={13} />
            Add Step {steps.length + 1}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [assets, setAssets] = useState<Asset[]>(SEED_ASSETS);
  const [prompts, setPrompts] = useState<Record<number, PromptStep[]>>({});

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const visibleAssets = assets.filter(
    (a) => a.categoryId === selectedCategoryId
  );
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const currentSteps: PromptStep[] = selectedAssetId
    ? prompts[selectedAssetId] ?? []
    : [];

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSelectCategory(id: number) {
    setSelectedCategoryId(id);
    setSelectedAssetId(null);
  }

  function handleAddCategory(name: string) {
    const cat: Category = { id: _nextCatId++, name };
    setCategories((prev) => [...prev, cat]);
  }

  function handleDeleteCategory(id: number) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setAssets((prev) => prev.filter((a) => a.categoryId !== id));
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
      setSelectedAssetId(null);
    }
  }

  function handleAddAsset(name: string) {
    if (!selectedCategoryId) return;
    const asset: Asset = {
      id: _nextAssetId++,
      name,
      categoryId: selectedCategoryId,
    };
    setAssets((prev) => [...prev, asset]);
  }

  function handleDeleteAsset(id: number) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setPrompts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (selectedAssetId === id) setSelectedAssetId(null);
  }

  function handleAddStep() {
    if (!selectedAssetId) return;
    const existing = prompts[selectedAssetId] ?? [];
    const newStep: PromptStep = {
      id: _nextPromptId++,
      order: existing.length + 1,
      model: "claude",
      outputTo: existing.length === 0 ? "next_step" : "telegram",
      content: "",
      execType: "manual",
    };
    setPrompts((prev) => ({
      ...prev,
      [selectedAssetId]: [...existing, newStep],
    }));
  }

  function handleUpdateStep(id: number, patch: Partial<PromptStep>) {
    if (!selectedAssetId) return;
    setPrompts((prev) => ({
      ...prev,
      [selectedAssetId]: (prev[selectedAssetId] ?? []).map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    }));
  }

  function handleDeleteStep(id: number) {
    if (!selectedAssetId) return;
    setPrompts((prev) => {
      const filtered = (prev[selectedAssetId] ?? []).filter((s) => s.id !== id);
      const reordered = filtered.map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, [selectedAssetId]: reordered };
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Page title bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Assets &amp; Prompt Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure market categories, instruments, and AI automation pipelines
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">
            {categories.length} categories · {assets.length} assets
          </span>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 grid grid-cols-[200px_200px_1fr] gap-4 min-h-0">
        {/* Col 1 — Categories */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-0">
          <CategoryColumn
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleSelectCategory}
            onAdd={handleAddCategory}
            onDelete={handleDeleteCategory}
          />
        </div>

        {/* Col 2 — Assets */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-0">
          <AssetColumn
            assets={visibleAssets}
            selectedId={selectedAssetId}
            selectedCategory={selectedCategory}
            onSelect={setSelectedAssetId}
            onAdd={handleAddAsset}
            onDelete={handleDeleteAsset}
          />
        </div>

        {/* Col 3 — Prompt Chain */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-0 overflow-hidden">
          <PromptChainColumn
            selectedAsset={selectedAsset}
            steps={currentSteps}
            onAddStep={handleAddStep}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      </div>
    </div>
  );
}