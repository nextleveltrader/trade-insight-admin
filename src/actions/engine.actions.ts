'use server';

/**
 * src/actions/engine.actions.ts
 *
 * Core AI execution engine. Runs a full prompt chain for a given asset:
 *   1. Fetches all prompt steps ordered by `order` ASC.
 *   2. Resolves {{step_X_output}} placeholders using prior step outputs.
 *   3. Calls the appropriate AI API for each step.
 *   4. Routes the output: stores it for the next step, saves a blog draft,
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

// ─── Public return type (consumed by the client) ──────────────────────────────

export type ChainRunResult = {
  success:      boolean;
  stepsRun:     number;
  totalSteps:   number;
  postsCreated: number;
  error?:       string;
  failedStep?:  number;        // order number of the step that threw
  failedModel?: string;        // which AI model failed
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

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
  };
  const text = data.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned an empty response.');
  return text;
}

async function callChatGPT(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const text = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

async function callPerplexity(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    'sonar-pro',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('Perplexity returned an empty response.');
  return text;
}

/** Routes the call to the correct provider. Throws on unsupported model. */
async function callAI(
  model:  string,
  prompt: string,
  env:    CloudflareEnv,
): Promise<string> {
  switch (model) {
    case 'claude':
      return callClaude(env.ANTHROPIC_API_KEY, prompt);
    case 'chatgpt':
      return callChatGPT(env.OPENAI_API_KEY, prompt);
    case 'gemini':
      return callGemini(env.GEMINI_API_KEY, prompt);
    case 'perplexity':
      return callPerplexity(env.PERPLEXITY_API_KEY, prompt);
    default:
      throw new Error(`Unknown model "${model}". Supported: claude, chatgpt, gemini, perplexity.`);
  }
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
      // Inject prior step outputs into the prompt text
      const resolvedPrompt = resolvePlaceholders(step.content, stepOutputs);

      // Call the AI — isolate errors per-step so we can report which one failed
      let output: string;
      try {
        output = await callAI(step.model, resolvedPrompt, env);
      } catch (aiErr) {
        return {
          success:      false,
          stepsRun,
          totalSteps,
          postsCreated,
          failedStep:   step.order,
          failedModel:  step.model,
          error:        aiErr instanceof Error ? aiErr.message : String(aiErr),
        };
      }

      // Always store the raw output so subsequent steps can reference it
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

    // Invalidate the posts page cache so new blog drafts appear immediately
    if (postsCreated > 0) revalidatePath('/posts');

    return { success: true, stepsRun, totalSteps, postsCreated };

  } catch (outerErr) {
    // Catches DB errors, context errors, etc.
    return {
      success:      false,
      stepsRun,
      totalSteps,
      postsCreated,
      error:        `Unexpected engine error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`,
    };
  }
}