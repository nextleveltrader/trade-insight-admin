'use server';

/**
 * src/actions/engine.actions.ts
 *
 * Core AI execution engine with a Model Tier system.
 *
 * HOW MODEL SELECTION WORKS
 * ─────────────────────────
 * The `model` field stored in the DB can be either a plain provider name
 * or a "provider:tier" pair. Both forms are fully backward-compatible:
 *
 *   "claude"          → provider: claude,     tier: medium  (default)
 *   "claude:minimum"  → provider: claude,     tier: minimum
 *   "claude:maximum"  → provider: claude,     tier: maximum
 *   "gemini:minimum"  → provider: gemini,     tier: minimum
 *   … and so on.
 *
 * Tiers map to dynamic/latest aliases where providers support them, so the
 * engine always routes to the best currently-available model for that tier
 * without requiring manual version bumps in the codebase.
 *
 * FALLBACK MECHANISM
 * ──────────────────
 * If a provider returns HTTP 404 (model not found / deprecated), the engine
 * automatically retries the same prompt using the "medium" tier for that
 * provider. If medium also fails, or if the original tier was already medium,
 * the error propagates normally. Every fallback is logged to Wrangler.
 */

import { asc, eq }          from 'drizzle-orm';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { revalidatePath }    from 'next/cache';
import { getDb }             from '@/db';
import { prompts, posts, assets } from '@/db/schema';

// ─── Environment ──────────────────────────────────────────────────────────────

type CloudflareEnv = {
  DB:                  D1Database;
  ANTHROPIC_API_KEY:   string;
  OPENAI_API_KEY:      string;
  GEMINI_API_KEY:      string;
  PERPLEXITY_API_KEY:  string;
};

// ─── Provider & Tier types ────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'perplexity';
export type ModelTier  = 'minimum' | 'medium' | 'maximum';

// ─── Model Tier Registry ──────────────────────────────────────────────────────
//
// Uses rolling "latest" aliases wherever the provider supports them, so
// model deprecations are handled automatically by the API.
//
// Providers that do NOT offer rolling aliases (e.g. Anthropic for the haiku
// tier) receive pinned version strings — update these when Anthropic
// introduces a `claude-haiku-latest` alias.

export const MODEL_TIERS: Record<AIProvider, Record<ModelTier, string>> = {

  // Anthropic — "latest" suffixes are officially supported for sonnet & opus.
  // Haiku does not yet have a rolling alias; pin the most recent stable version.
  claude: {
    minimum: 'claude-3-haiku-20240307',   // pin — no "-latest" alias yet
    medium:  'claude-3-5-sonnet-latest',  // rolling alias → always newest 3.5 Sonnet
    maximum: 'claude-3-opus-latest',      // rolling alias → always newest Opus
  },

  // OpenAI — "chatgpt-4o-latest" is their continuously-updated flagship alias.
  chatgpt: {
    minimum: 'gpt-4o-mini',        // fast, cheap; suited for preprocessing steps
    medium:  'gpt-4o',             // stable pinned release, very capable
    maximum: 'chatgpt-4o-latest',  // rolling alias → tracks the latest GPT-4o snapshot
  },

  // Google — "latest" suffix routes to the current stable generation.
  // Both pro tiers map to pro-latest; flash is the recommended lightweight alias.
  gemini: {
    minimum: 'gemini-1.5-flash-latest',  // rolling alias → fastest/cheapest Gemini
    medium:  'gemini-1.5-pro-latest',    // rolling alias → full-capability Gemini
    maximum: 'gemini-1.5-pro-latest',    // same until a 2.0-pro-latest alias ships
  },

  // Perplexity — uses llama-based search-augmented endpoints.
  // "sonar-pro" is their premium tier with higher context and reasoning.
  // The llama-3.x small/large models serve as the standard tiers.
  perplexity: {
    minimum: 'llama-3-sonar-small-32k-online',  // lightweight, fast, online search
    medium:  'llama-3-sonar-large-32k-online',  // standard capability, online search
    maximum: 'sonar-pro',                        // premium: reasoning + search + 128k
  },
};

// ─── Public result type ───────────────────────────────────────────────────────

export type ChainRunResult = {
  success:       boolean;
  stepsRun:      number;
  totalSteps:    number;
  postsCreated:  number;
  fallbacksUsed: number;   // how many steps required a tier fallback
  error?:        string;
  failedStep?:   number;   // order of the step that threw
  failedModel?:  string;   // provider:tier string that failed
};

// ─── ModelNotFoundError ───────────────────────────────────────────────────────
//
// Thrown exclusively when the API returns HTTP 404 (model deprecated / not
// found). The fallback layer in callAI catches only this error class —
// all other errors (auth, rate limit, network) propagate unchanged.

class ModelNotFoundError extends Error {
  readonly provider:  AIProvider;
  readonly modelName: string;

  constructor(provider: AIProvider, modelName: string, detail: string) {
    super(`Model "${modelName}" not found on ${provider} (404): ${detail}`);
    this.name      = 'ModelNotFoundError';
    this.provider  = provider;
    this.modelName = modelName;
  }
}

// ─── Model string parser ──────────────────────────────────────────────────────
//
// Accepts "provider" (defaults tier to medium) or "provider:tier".
// Invalid provider or tier values fall back to safe defaults with a warning.

function parseModelString(raw: string): { provider: AIProvider; tier: ModelTier } {
  const [providerPart, tierPart] = raw.trim().split(':');
  const PROVIDERS = ['claude', 'chatgpt', 'gemini', 'perplexity'] as const;
  const matchedProvider = PROVIDERS.find((p) => p === providerPart);
  const provider: AIProvider = matchedProvider ?? 'claude';
  if (!matchedProvider) {
    console.warn(`[Engine] Unknown provider "${providerPart}", defaulting to claude`);
  }

  const tier: ModelTier = (['minimum', 'medium', 'maximum'] as const)
    .includes(tierPart as ModelTier)
    ? (tierPart as ModelTier)
    : 'medium'; // safe default when tier is omitted or unrecognised

  return { provider, tier };
}

// ─── Placeholder resolver ─────────────────────────────────────────────────────

function resolvePlaceholders(
  content:     string,
  stepOutputs: Record<number, string>,
): string {
  return content.replace(/\{\{step_(\d+)_output\}\}/g, (_match, num) => {
    const order = parseInt(num, 10);
    return stepOutputs[order] ?? `[Output of Step ${order} not available]`;
  });
}

// ─── Provider-specific callers ────────────────────────────────────────────────
//
// Each function accepts the fully-resolved model name string so the tier
// registry and fallback logic remain separate from request construction.
// 404 responses throw ModelNotFoundError; everything else throws a plain Error.

async function callClaude(
  apiKey:    string,
  modelName: string,
  prompt:    string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      modelName,
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (res.status === 404) {
    throw new ModelNotFoundError('claude', modelName, await res.text());
  }
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned an empty response body.');
  return text;
}

async function callChatGPT(
  apiKey:    string,
  modelName: string,
  prompt:    string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    modelName,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (res.status === 404) {
    throw new ModelNotFoundError('chatgpt', modelName, await res.text());
  }
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty response body.');
  return text;
}

async function callGemini(
  apiKey:    string,
  modelName: string,
  prompt:    string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });

  // Gemini surfaces 404 when the model alias is unknown or not yet available
  if (res.status === 404) {
    throw new ModelNotFoundError('gemini', modelName, await res.text());
  }
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const text = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response body.');
  return text;
}

async function callPerplexity(
  apiKey:    string,
  modelName: string,
  prompt:    string,
): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    modelName,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (res.status === 404) {
    throw new ModelNotFoundError('perplexity', modelName, await res.text());
  }
  if (!res.ok) {
    throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('Perplexity returned an empty response body.');
  return text;
}

// ─── Internal dispatcher (no fallback) ───────────────────────────────────────

function getApiKey(provider: AIProvider, env: CloudflareEnv): string {
  switch (provider) {
    case 'claude':     return env.ANTHROPIC_API_KEY;
    case 'chatgpt':    return env.OPENAI_API_KEY;
    case 'gemini':     return env.GEMINI_API_KEY;
    case 'perplexity': return env.PERPLEXITY_API_KEY;
  }
}

async function invokeProvider(
  provider:  AIProvider,
  modelName: string,
  prompt:    string,
  env:       CloudflareEnv,
): Promise<string> {
  const key = getApiKey(provider, env);
  switch (provider) {
    case 'claude':     return callClaude(key, modelName, prompt);
    case 'chatgpt':    return callChatGPT(key, modelName, prompt);
    case 'gemini':     return callGemini(key, modelName, prompt);
    case 'perplexity': return callPerplexity(key, modelName, prompt);
  }
}

// ─── Main dispatcher with tier resolution and 404 fallback ───────────────────
//
// Returns the AI output AND a flag indicating whether a fallback was used,
// so the engine loop can count how many steps required a fallback.

async function callAI(
  modelStr: string,
  prompt:   string,
  env:      CloudflareEnv,
): Promise<{ output: string; usedFallback: boolean }> {
  const { provider, tier } = parseModelString(modelStr);
  const resolvedModel      = MODEL_TIERS[provider][tier];

  try {
    const output = await invokeProvider(provider, resolvedModel, prompt, env);
    return { output, usedFallback: false };

  } catch (err) {
    // ── 404 fallback path ────────────────────────────────────────────────────
    if (err instanceof ModelNotFoundError && tier !== 'medium') {
      const fallbackModel = MODEL_TIERS[provider].medium;

      console.warn(
        `[Engine] 404 on ${provider}/${resolvedModel} — ` +
        `falling back to medium tier (${fallbackModel})`,
      );

      // Let non-404 errors from the fallback call propagate unchanged
      const output = await invokeProvider(provider, fallbackModel, prompt, env);
      return { output, usedFallback: true };
    }

    // Already on medium tier, or not a 404 — nothing more to try
    throw err;
  }
}

// ─── Main engine action ───────────────────────────────────────────────────────

export async function runPromptChain(assetId: number): Promise<ChainRunResult> {
  let stepsRun      = 0;
  let postsCreated  = 0;
  let totalSteps    = 0;
  let fallbacksUsed = 0;

  try {
    const db  = getDb();
    const env = (getRequestContext().env as unknown) as CloudflareEnv;

    // ── 1. Load steps ordered by execution order ───────────────────────────
    const steps = await db
      .select()
      .from(prompts)
      .where(eq(prompts.assetId, assetId))
      .orderBy(asc(prompts.order));

    totalSteps = steps.length;

    if (totalSteps === 0) {
      return {
        success:       false,
        stepsRun:      0,
        totalSteps:    0,
        postsCreated:  0,
        fallbacksUsed: 0,
        error:         'No prompt steps configured for this asset. Add at least one step before running.',
      };
    }

    // ── 2. Fetch asset name for generated post titles ──────────────────────
    const [assetRow] = await db
      .select({ name: assets.name })
      .from(assets)
      .where(eq(assets.id, assetId));

    const assetName = assetRow?.name ?? 'Unknown Asset';

    // ── 3. Execute chain sequentially ─────────────────────────────────────
    const stepOutputs: Record<number, string> = {};

    for (const step of steps) {
      // Inject prior step outputs into the prompt template
      const resolvedPrompt = resolvePlaceholders(step.content, stepOutputs);

      // Determine the resolved model name for logging
      const { provider, tier } = parseModelString(step.model);
      const resolvedModelName  = MODEL_TIERS[provider][tier];

      console.log(
        `[Engine] Step ${step.order}/${totalSteps} — ` +
        `provider: ${provider}, tier: ${tier}, model: ${resolvedModelName}`,
      );

      // Call AI with automatic tier fallback on 404
      let output: string;
      let usedFallback: boolean;

      try {
        ({ output, usedFallback } = await callAI(step.model, resolvedPrompt, env));
      } catch (aiErr) {
        // Non-recoverable error (auth, rate limit, network, medium fallback also failed)
        return {
          success:       false,
          stepsRun,
          totalSteps,
          postsCreated,
          fallbacksUsed,
          failedStep:    step.order,
          failedModel:   `${provider}:${tier}`,
          error:         aiErr instanceof Error ? aiErr.message : String(aiErr),
        };
      }

      if (usedFallback) fallbacksUsed++;

      // Store raw output so subsequent steps can reference it via placeholder
      stepOutputs[step.order] = output;
      stepsRun++;

      // ── Route output ────────────────────────────────────────────────────
      if (step.outputTo === 'blog_draft') {
        await db.insert(posts).values({
          title:   `[${assetName}] AI Draft — Step ${step.order}`,
          content: output,
          status:  'draft',
          assetId,
        });
        postsCreated++;

      } else if (step.outputTo === 'telegram') {
        // Telegram integration is wired up in a future iteration.
        // The full output is logged to Wrangler for verification.
        console.log(
          `[Engine → Telegram | Asset: ${assetName} | Step ${step.order}]\n` +
          output.slice(0, 500) +
          (output.length > 500 ? '…' : ''),
        );
      }
      // outputTo === 'next_step': already in stepOutputs — nothing else needed.
    }

    // Bust the posts page cache if any blog drafts were created
    if (postsCreated > 0) revalidatePath('/posts');

    return { success: true, stepsRun, totalSteps, postsCreated, fallbacksUsed };

  } catch (outerErr) {
    // Guards against DB failures, missing env vars, context errors, etc.
    return {
      success:       false,
      stepsRun,
      totalSteps,
      postsCreated,
      fallbacksUsed,
      error:         `Engine error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`,
    };
  }
}