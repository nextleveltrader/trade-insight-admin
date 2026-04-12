'use server';

/**
 * src/actions/engine.actions.ts
 *
 * Core AI execution engine. Runs a full prompt chain for a given asset.
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

const MODEL_VERSION_MAP: Record<string, Record<ModelTier, string>> = {
  claude: {
    minimum: 'claude-3-haiku-20240307',       // fastest / cheapest Haiku
    medium:  'claude-3-5-sonnet-latest',       // Anthropic dynamic alias
    maximum: 'claude-3-opus-latest',           // Anthropic dynamic alias
  },
  chatgpt: {
    minimum: 'gpt-4o-mini',                   // small, cheap, fast
    medium:  'gpt-4o',                         // stable 4o release
    maximum: 'chatgpt-4o-latest',              // OpenAI continually-updated alias
  },
  gemini: {
    minimum: 'gemini-1.5-flash-8b',        // Google's fastest free model
    medium:  'gemini-1.5-flash',           // Balanced model
    maximum: 'gemini-1.5-pro',             // Pro model without -latest
  },
  perplexity: {
    minimum: 'llama-3-sonar-small-32k-online',
    medium:  'llama-3-sonar-large-32k-online',
    maximum: 'llama-3-sonar-huge-32k-online',
  },
};

// ─── Gemini aggressive fallback list ─────────────────────────────────────────

const GEMINI_FALLBACK_MODELS: readonly string[] = [
  'gemini-1.5-flash',   
  'gemini-1.5-flash-8b', 
  'gemini-1.5-pro',     
  'gemini-1.0-pro',         
];

// ─── Model version resolver ───────────────────────────────────────────────────

// Removed 'export' from here to fix the Next.js build error
function getActualModelVersion(provider: string, tier: string): string {
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

function getFallbackTiers(tier: string): ModelTier[] {
  switch (tier as ModelTier) {
    case 'maximum': return ['medium', 'minimum'];
    case 'medium':  return ['minimum'];
    case 'minimum': return [];           
    default:        return ['minimum'];
  }
}

function isModelUnavailableError(status: number, body: string): boolean {
  if (status === 404) return true;                         
  if (status === 529) return true;                         
  if (status === 503) return true;                         
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

// ─── Public return type ───────────────────────────────────────────────────────

export type ChainRunResult = {
  success:      boolean;
  stepsRun:     number;
  totalSteps:   number;
  postsCreated: number;
  error?:       string;
  failedStep?:  number;        
  failedModel?: string;        
};

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

// ─── AI caller functions ──────────────────────────────────────────────────────

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
  // Trim spaces and use stable v1 API
  const cleanModel = modelVersion.trim(); 
  const url = `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Safe token limit for older models
      generationConfig: { maxOutputTokens: 2048 }, 
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) return { text: '', status: res.status, rawBody };

  const data = JSON.parse(rawBody) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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

async function callGeminiWithAggressiveFallback(
  apiKey:        string,
  tierModel:     string,
  prompt:        string,
): Promise<string> {
  const seen    = new Set<string>();
  const toTry: string[] = [];
  for (const m of [tierModel, ...GEMINI_FALLBACK_MODELS]) {
    if (!seen.has(m)) { seen.add(m); toTry.push(m); }
  }

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

    if ([401, 403, 429].includes(result.status)) {
      throw new Error(
        `Gemini (${model}) HTTP ${result.status} — this error cannot be resolved ` +
        `by trying a different model: ${result.rawBody.slice(0, 300)}`,
      );
    }

    if (isModelUnavailableError(result.status, result.rawBody)) {
      const snippet = result.rawBody.slice(0, 150);
      console.warn(`[Engine | Gemini] Model "${model}" unavailable (HTTP ${result.status}): ${snippet}`);
      failures.push({ model, status: result.status, snippet });
      continue;
    }

    throw new Error(
      `Gemini (${model}) HTTP ${result.status}: ${result.rawBody.slice(0, 400)}`,
    );
  }

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

    throw new Error(
      `${provider} (${modelVersion}) HTTP ${result.status}: ${result.rawBody.slice(0, 400)}`,
    );
  }

  throw new Error(
    `All model tiers for provider="${provider}" failed. Last error: ${lastError}`,
  );
}

// ─── Public callAI: routes to the correct strategy per provider ───────────────

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

    const [assetRow] = await db
      .select({ name: assets.name })
      .from(assets)
      .where(eq(assets.id, assetId));

    const assetName = assetRow?.name ?? 'Unknown Asset';

    const stepOutputs: Record<number, string> = {};

    for (const step of steps) {
      const resolvedTier    = step.modelTier ?? 'medium';
      const resolvedVersion = getActualModelVersion(step.model, resolvedTier);

      const resolvedPrompt = resolvePlaceholders(step.content, stepOutputs);

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

      stepOutputs[step.order] = output;
      stepsRun++;

      if (step.outputTo === 'blog_draft') {
        await db.insert(posts).values({
          title:   `[${assetName}] AI Draft — Step ${step.order}`,
          content: output,
          status:  'draft',
          assetId,
        });
        postsCreated++;

      } else if (step.outputTo === 'telegram') {
        console.log(
          `[Engine → Telegram | Asset: ${assetName} | Step ${step.order}]\n` +
          output.slice(0, 500) +
          (output.length > 500 ? '…' : ''),
        );
      }
    }

    if (postsCreated > 0) revalidatePath('/posts');

    return { success: true, stepsRun, totalSteps, postsCreated };

  } catch (outerErr) {
    return {
      success:      false,
      stepsRun,
      totalSteps,
      postsCreated,
      error: `Unexpected engine error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`,
    };
  }
}