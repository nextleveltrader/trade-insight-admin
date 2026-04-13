'use server';

/**
 * src/actions/engine.actions.ts
 *
 * Core AI execution engine. Runs a full prompt chain for a given asset:
 *   1. Fetches all prompt steps ordered by `order` ASC.
 *   2. Resolves {{step_X_output}} placeholders using prior step outputs.
 *   3. Resolves the concrete model version from (provider, modelTier) via
 *      getActualModelVersion() so the code never hard-codes a specific version.
 *   4. Calls the appropriate AI API for each step:
 *        – Non-Gemini providers: standard 3-tier fallback (maximum → medium → minimum)
 *          on 404 / 503 / model-unavailable errors.
 *        – Gemini: "aggressive fallback" — on any model-unavailable error the engine
 *          immediately abandons tier logic and sequentially tries every model in
 *          GEMINI_FALLBACK_MODELS until one succeeds. This is necessary because the
 *          Gemini free tier inconsistently returns 404 for valid model names.
 *   5. Routes the output: stores it for the next step, saves a blog draft,
 *      or logs it for Telegram (to be wired up later).
 *
 * API keys are read from Cloudflare Secrets via getRequestContext().env —
 * they are never exposed to the client.
 */

import { asc, eq }          from 'drizzle-orm';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { revalidatePath }    from 'next/cache';
import { getDb }             from '@/db';
import { prompts, posts, assets } from '@/db/schema';

// ─── Environment typing ───────────────────────────────────────────────────────

type CloudflareEnv = {
  DB:                  D1Database;
  ANTHROPIC_API_KEY:   string;
  OPENAI_API_KEY:      string;
  GEMINI_API_KEY:      string;
  PERPLEXITY_API_KEY:  string;
};

// ─── Model tier types ─────────────────────────────────────────────────────────

export type ModelTier = 'minimum' | 'medium' | 'maximum';

// ─── Dynamic model version map ────────────────────────────────────────────────

/**
 * Single source-of-truth for concrete model identifiers.
 *
 * Prefer "latest" aliases where providers support them so that minor
 * version bumps (e.g. claude-3-5-sonnet-20241022 → 20250101) happen
 * transparently without code changes. Where no alias exists we use the
 * most recent stable string.
 *
 * Update this map whenever a provider deprecates or renames a model.
 */
const MODEL_VERSION_MAP: Record<string, Record<ModelTier, string>> = {
  claude: {
    minimum: 'claude-3-haiku-20240307',       // fastest / cheapest Haiku
    medium:  'claude-3-5-sonnet-latest',       // Anthropic dynamic alias → always latest 3.5 Sonnet
    maximum: 'claude-3-opus-latest',           // Anthropic dynamic alias → always latest Opus
  },
  chatgpt: {
    minimum: 'gpt-4o-mini',                   // small, cheap, fast
    medium:  'gpt-4o',                         // stable 4o release
    maximum: 'chatgpt-4o-latest',              // OpenAI continually-updated alias
  },
  gemini: {
    minimum: 'gemini-1.5-flash-latest',        // Flash — fastest / free-tier friendly
    medium:  'gemini-1.5-pro-latest',          // Pro — balanced capability
    maximum: 'gemini-1.5-pro-latest',          // No "ultra" stable alias yet; Pro is top tier
  },
  perplexity: {
    minimum: 'llama-3-sonar-small-32k-online', // lightweight online search model
    medium:  'llama-3-sonar-large-32k-online', // standard online model
    maximum: 'llama-3-sonar-huge-32k-online',  // largest available sonar variant
  },
};

// ─── Gemini aggressive fallback list ─────────────────────────────────────────

/**
 * Ordered list of known-stable Gemini model identifiers tried sequentially
 * when the tier-resolved model name returns a 404 / 503 from the free tier.
 *
 * Design rules:
 *   • Use bare, version-pinned names (NO "-latest" suffix) — the Gemini free
 *     tier is inconsistently unreliable with dynamic aliases.
 *   • Order from most capable → most available so capability degrades
 *     gracefully rather than suddenly.
 *   • Add new entries when Google releases confirmed-stable model IDs.
 *   • Remove entries only after a model is fully decommissioned by Google.
 *
 * The tier-resolved model (from MODEL_VERSION_MAP above) is always prepended
 * at runtime, so the full attempt order for any tier is:
 *   [tier-resolved] → gemini-1.5-flash → gemini-1.5-pro → gemini-pro
 * Duplicates are automatically deduplicated while preserving insertion order.
 */
const GEMINI_FALLBACK_MODELS: readonly string[] = [
  'gemini-1.5-flash',   // fastest; highest free-tier quota
  'gemini-1.5-pro',     // balanced capability
  'gemini-pro',         // legacy stable fallback (still served on free tier)
];

// ─── Model version resolver ───────────────────────────────────────────────────

/**
 * Returns the concrete model version string for a (provider, tier) pair.
 * Falls back to the medium tier if the provider or tier is unknown so the
 * engine never crashes on a bad DB value.
 */
export function getActualModelVersion(provider: string, tier: string): string {
  const providerMap = MODEL_VERSION_MAP[provider];
  if (!providerMap) {
    console.warn(`[Engine] Unknown provider "${provider}" — falling back to claude/medium`);
    return MODEL_VERSION_MAP['claude']['medium'];
  }
  const safeTier = (['minimum', 'medium', 'maximum'] as const).includes(tier as ModelTier)
    ? (tier as ModelTier)
    : 'medium';
  return providerMap[safeTier];
}

/** Returns the fallback tier order for a given starting tier. */
function getFallbackTiers(tier: string): ModelTier[] {
  switch (tier as ModelTier) {
    case 'maximum': return ['medium', 'minimum'];
    case 'medium':  return ['minimum'];
    case 'minimum': return [];           // already at the bottom — no further fallback
    default:        return ['minimum'];
  }
}

/** Returns true when an HTTP status / error message indicates the model is
 *  unavailable (not an auth or quota error, which should not be retried). */
function isModelUnavailableError(status: number, body: string): boolean {
  if (status === 404) return true;                         // model not found
  if (status === 529) return true;                         // Anthropic overloaded
  if (status === 503) return true;                         // service unavailable
  const lower = body.toLowerCase();
  return (
    lower.includes('model_not_found') ||
    lower.includes('model not found') ||
    lower.includes('no such model') ||
    lower.includes('does not exist') ||
    lower.includes('deprecated') ||
    lower.includes('not available') ||
    lower.includes('overloaded')
  );
}

// ─── Public return type (consumed by the client) ──────────────────────────────

export type ChainRunResult = {
  success:      boolean;
  stepsRun:     number;
  totalSteps:   number;
  postsCreated: number;
  error?:       string;
  failedStep?:  number;        // order number of the step that threw
  failedModel?: string;        // which AI model (resolved version) failed
};

// ─── Placeholder resolver ─────────────────────────────────────────────────────

/**
 * Replaces every {{step_N_output}} token in `content` with the recorded
 * output of step N. If step N has not run yet, the token is replaced with a
 * clear fallback so the downstream AI prompt does not silently receive a raw
 * template literal.
 */
function resolvePlaceholders(
  content:     string,
  stepOutputs: Record<number, string>,
): string {
  return content.replace(/\{\{step_(\d+)_output\}\}/g, (_match, num) => {
    const order = parseInt(num, 10);
    return stepOutputs[order] ?? `[Output of Step ${order} not available]`;
  });
}

// ─── AI caller functions ──────────────────────────────────────────────────────
// Each caller now accepts an explicit `modelVersion` string resolved by
// getActualModelVersion() instead of a hard-coded constant.

async function callClaude(
  apiKey:       string,
  modelVersion: string,
  prompt:       string,
): Promise<{ text: string; status: number; rawBody: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      modelVersion,
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) return { text: '', status: res.status, rawBody };

  const data = JSON.parse(rawBody) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = data.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('Anthropic returned an empty response.');
  return { text, status: res.status, rawBody };
}

async function callChatGPT(
  apiKey:       string,
  modelVersion: string,
  prompt:       string,
): Promise<{ text: string; status: number; rawBody: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    modelVersion,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) return { text: '', status: res.status, rawBody };

  const data = JSON.parse(rawBody) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned an empty response.');
  return { text, status: res.status, rawBody };
}

async function callGemini(
  apiKey:       string,
  modelVersion: string,
  prompt:       string,
): Promise<{ text: string; status: number; rawBody: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) return { text: '', status: res.status, rawBody };

  const data = JSON.parse(rawBody) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const text = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned an empty response.');
  return { text, status: res.status, rawBody };
}

async function callPerplexity(
  apiKey:       string,
  modelVersion: string,
  prompt:       string,
): Promise<{ text: string; status: number; rawBody: string }> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    modelVersion,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) return { text: '', status: res.status, rawBody };

  const data = JSON.parse(rawBody) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('Perplexity returned an empty response.');
  return { text, status: res.status, rawBody };
}

// ─── Unified dispatcher ───────────────────────────────────────────────────────

/**
 * Calls the correct provider API for a given (provider, modelVersion).
 * Returns the raw response envelope so retry loops can inspect the HTTP
 * status without re-throwing immediately.
 */
async function dispatchCall(
  provider:     string,
  modelVersion: string,
  prompt:       string,
  env:          CloudflareEnv,
): Promise<{ text: string; status: number; rawBody: string }> {
  switch (provider) {
    case 'claude':
      return callClaude(env.ANTHROPIC_API_KEY, modelVersion, prompt);
    case 'chatgpt':
      return callChatGPT(env.OPENAI_API_KEY, modelVersion, prompt);
    case 'gemini':
      return callGemini(env.GEMINI_API_KEY, modelVersion, prompt);
    case 'perplexity':
      return callPerplexity(env.PERPLEXITY_API_KEY, modelVersion, prompt);
    default:
      throw new Error(
        `Unknown provider "${provider}". Supported: claude, chatgpt, gemini, perplexity.`,
      );
  }
}

// ─── Gemini: aggressive model-list fallback ───────────────────────────────────

/**
 * Gemini-specific caller that completely ignores tier logic on failure and
 * instead walks through every model in GEMINI_FALLBACK_MODELS sequentially.
 *
 * Attempt order (example for tier = 'medium'):
 *   1. gemini-1.5-pro-latest  (tier-resolved, from MODEL_VERSION_MAP)
 *   2. gemini-1.5-flash       (GEMINI_FALLBACK_MODELS[0])
 *   3. gemini-1.5-pro         (GEMINI_FALLBACK_MODELS[1])
 *   4. gemini-pro             (GEMINI_FALLBACK_MODELS[2])
 *
 * Deduplication: if the tier-resolved name already appears in
 * GEMINI_FALLBACK_MODELS it is tried only once (first occurrence wins).
 *
 * Hard-bail conditions (NOT retried):
 *   • 401 Unauthorized  — wrong / missing API key
 *   • 403 Forbidden     — project disabled / billing issue
 *   • 429 Rate-limited  — quota exhausted; a different model won't help
 *   All other non-200 responses that pass isModelUnavailableError() proceed
 *   to the next candidate.
 */
async function callGeminiWithAggressiveFallback(
  apiKey:        string,
  tierModel:     string,   // the model name resolved from (provider, tier)
  prompt:        string,
): Promise<string> {
  // Build a deduplicated ordered list: tier-resolved first, then the static list.
  const seen    = new Set<string>();
  const toTry: string[] = [];
  for (const m of [tierModel, ...GEMINI_FALLBACK_MODELS]) {
    if (!seen.has(m)) { seen.add(m); toTry.push(m); }
  }

  // Track every failed attempt for the final error message.
  const failures: { model: string; status: number; snippet: string }[] = [];

  for (const model of toTry) {
    const isFirstAttempt = model === toTry[0];

    if (!isFirstAttempt) {
      console.warn(
        `[Engine | Gemini] Aggressive fallback → trying "${model}" ` +
        `(previous failures: ${failures.map((f) => `${f.model}→HTTP${f.status}`).join(', ')})`,
      );
    }

    let result: { text: string; status: number; rawBody: string };
    try {
      result = await callGemini(apiKey, model, prompt);
    } catch (networkErr) {
      // Network / parse error on this candidate — log and try the next one.
      console.error(`[Engine | Gemini] Network error for "${model}":`, networkErr);
      failures.push({ model, status: 0, snippet: String(networkErr) });
      continue;
    }

    if (result.status === 200) {
      if (!isFirstAttempt) {
        console.info(
          `[Engine | Gemini] Aggressive fallback succeeded with model="${model}" ` +
          `after ${failures.length} failed attempt(s): ` +
          failures.map((f) => f.model).join(' → '),
        );
      }
      return result.text;
    }

    // Hard-bail: auth / quota errors cannot be resolved by swapping the model.
    if ([401, 403, 429].includes(result.status)) {
      throw new Error(
        `Gemini (${model}) HTTP ${result.status} — this error cannot be resolved ` +
        `by trying a different model: ${result.rawBody.slice(0, 300)}`,
      );
    }

    // Model-unavailable? Record and continue to the next candidate.
    if (isModelUnavailableError(result.status, result.rawBody)) {
      const snippet = result.rawBody.slice(0, 150);
      console.warn(`[Engine | Gemini] Model "${model}" unavailable (HTTP ${result.status}): ${snippet}`);
      failures.push({ model, status: result.status, snippet });
      continue;
    }

    // Any other unexpected non-200 response — bail immediately.
    throw new Error(
      `Gemini (${model}) HTTP ${result.status}: ${result.rawBody.slice(0, 400)}`,
    );
  }

  // All candidates exhausted — build a detailed error message.
  const attemptSummary = failures
    .map((f, i) => `  ${i + 1}. ${f.model} → HTTP ${f.status || 'network error'}: ${f.snippet}`)
    .join('\n');

  throw new Error(
    `All ${toTry.length} Gemini model(s) failed.\n` +
    `Attempted (in order): ${toTry.join(', ')}\n` +
    `Failure details:\n${attemptSummary}`,
  );
}

// ─── Standard tier-based fallback (non-Gemini providers) ─────────────────────

/**
 * Calls the AI with automatic tier-based fallback for Claude, ChatGPT and
 * Perplexity. Gemini is intentionally routed to callGeminiWithAggressiveFallback
 * above and never reaches this function.
 *
 * Attempt order example for tier='maximum':
 *   1. maximum version  → if model-unavailable error →
 *   2. medium  version  → if model-unavailable error →
 *   3. minimum version  → if still failing → throws
 *
 * Auth / rate-limit / quota errors (401, 403, 429) are NOT retried because
 * switching the model won't fix those problems.
 */
async function callWithTierFallback(
  provider:   string,
  tier:       string,
  prompt:     string,
  env:        CloudflareEnv,
): Promise<string> {
  const tiersToTry: string[] = [tier, ...getFallbackTiers(tier)];
  let lastError = '';

  for (const currentTier of tiersToTry) {
    const modelVersion = getActualModelVersion(provider, currentTier);

    if (currentTier !== tier) {
      console.warn(
        `[Engine] Tier fallback: provider="${provider}" ` +
        `"${tier}" → "${currentTier}" (${modelVersion}) after: ${lastError}`,
      );
    }

    let result: { text: string; status: number; rawBody: string };
    try {
      result = await dispatchCall(provider, modelVersion, prompt, env);
    } catch (networkErr) {
      throw networkErr;
    }

    if (result.status === 200) {
      if (currentTier !== tier) {
        console.info(
          `[Engine] Tier fallback succeeded: provider="${provider}" ` +
          `tier="${currentTier}" model="${modelVersion}"`,
        );
      }
      return result.text;
    }

    if (isModelUnavailableError(result.status, result.rawBody)) {
      lastError = `HTTP ${result.status} — ${result.rawBody.slice(0, 200)}`;
      continue;
    }

    // Hard-bail on auth / quota / unrelated server errors.
    throw new Error(
      `${provider} (${modelVersion}) HTTP ${result.status}: ${result.rawBody.slice(0, 400)}`,
    );
  }

  throw new Error(
    `All model tiers for provider="${provider}" failed. Last error: ${lastError}`,
  );
}

// ─── Public callAI: routes to the correct strategy per provider ───────────────

/**
 * Entry point used by the chain runner. Routes to the appropriate retry
 * strategy depending on the provider:
 *
 *   gemini      → callGeminiWithAggressiveFallback (model-list exhaustion)
 *   everything  → callWithTierFallback             (3-tier degradation)
 */
async function callAI(
  provider:   string,
  tier:       string,
  prompt:     string,
  env:        CloudflareEnv,
): Promise<string> {
  if (provider === 'gemini') {
    const tierModel = getActualModelVersion('gemini', tier);
    return callGeminiWithAggressiveFallback(env.GEMINI_API_KEY, tierModel, prompt);
  }
  return callWithTierFallback(provider, tier, prompt, env);
}

// ─── Main engine action ───────────────────────────────────────────────────────

export async function runPromptChain(assetId: number): Promise<ChainRunResult> {
  let stepsRun     = 0;
  let postsCreated = 0;
  let totalSteps   = 0;

  try {
    const db  = getDb();
    const env = (getRequestContext().env as unknown) as CloudflareEnv;

    // ── 1. Load steps ─────────────────────────────────────────────────────────
    const steps = await db
      .select()
      .from(prompts)
      .where(eq(prompts.assetId, assetId))
      .orderBy(asc(prompts.order));

    totalSteps = steps.length;

    if (totalSteps === 0) {
      return {
        success:      false,
        stepsRun:     0,
        totalSteps:   0,
        postsCreated: 0,
        error:        'No prompt steps are configured for this asset. Add at least one step before running.',
      };
    }

    // ── 2. Load asset name (used in generated post titles) ────────────────────
    const [assetRow] = await db
      .select({ name: assets.name })
      .from(assets)
      .where(eq(assets.id, assetId));

    const assetName = assetRow?.name ?? 'Unknown Asset';

    // ── 3. Execute chain sequentially ─────────────────────────────────────────
    const stepOutputs: Record<number, string> = {};

    for (const step of steps) {
      // Resolve the concrete model version for this step.
      const resolvedTier    = step.modelTier ?? 'medium';
      const resolvedVersion = getActualModelVersion(step.model, resolvedTier);

      // Inject prior step outputs into the prompt text.
      const resolvedPrompt = resolvePlaceholders(step.content, stepOutputs);

      // Call the AI with automatic tier fallback — isolate errors per-step.
      let output: string;
      try {
        output = await callAI(step.model, resolvedTier, resolvedPrompt, env);
      } catch (aiErr) {
        return {
          success:      false,
          stepsRun,
          totalSteps,
          postsCreated,
          failedStep:   step.order,
          failedModel:  resolvedVersion,
          error:        aiErr instanceof Error ? aiErr.message : String(aiErr),
        };
      }

      // Always store the raw output so subsequent steps can reference it.
      stepOutputs[step.order] = output;
      stepsRun++;

      // ── Route output ────────────────────────────────────────────────────────
      if (step.outputTo === 'blog_draft') {
        await db.insert(posts).values({
          title:   `[${assetName}] AI Draft — Step ${step.order}`,
          content: output,
          status:  'draft',
          assetId,
        });
        postsCreated++;

      } else if (step.outputTo === 'telegram') {
        // Telegram integration will be wired up in a future iteration.
        // For now we log the first 500 chars so it's visible in Wrangler logs.
        console.log(
          `[Engine → Telegram | Asset: ${assetName} | Step ${step.order}]\n` +
          output.slice(0, 500) +
          (output.length > 500 ? '…' : ''),
        );

      }
      // outputTo === 'next_step': output is already in stepOutputs — nothing else to do.
    }

    // Invalidate the posts page cache so new blog drafts appear immediately.
    if (postsCreated > 0) revalidatePath('/posts');

    return { success: true, stepsRun, totalSteps, postsCreated };

  } catch (outerErr) {
    // Catches DB errors, context errors, etc.
    return {
      success:      false,
      stepsRun,
      totalSteps,
      postsCreated,
      error: `Unexpected engine error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`,
    };
  }
}