'use server';

/**
 * src/actions/assets.actions.ts
 *
 * All mutations return a result object and rely on optimistic client-side
 * updates instead of revalidating '/assets' immediately. This avoids route
 * refresh-related failures in the edge runtime while keeping the UI fast.
 */

import { eq, asc }                from 'drizzle-orm';
import { getDb }                  from '@/db';
import { categories, assets, prompts } from '@/db/schema';
import type { Category, Asset, DBPrompt } from '@/db/schema';

// ─── Shared result wrapper ────────────────────────────────────────────────────

type ActionResult<T> =
  | { data: T;    error: null }
  | { data: null; error: string };

function ok<T>(data: T): ActionResult<T>    { return { data, error: null }; }
function err(msg: string): ActionResult<never> {
  console.error('[assets.actions]', msg);
  return { data: null, error: msg };
}

// ─── Initial data fetch ───────────────────────────────────────────────────────

export type InitialData = {
  categories: Category[];
  assets:     Asset[];
  prompts:    DBPrompt[];
};

/**
 * Called once from the Server Component to hydrate the Client Component.
 * Returns all rows flat; the client groups prompts by assetId.
 */
export async function getInitialData(): Promise<InitialData> {
  const db = getDb();
  const [allCategories, allAssets, allPrompts] = await Promise.all([
    db.select().from(categories),
    db.select().from(assets),
    db.select().from(prompts).orderBy(asc(prompts.order)),
  ]);
  return { categories: allCategories, assets: allAssets, prompts: allPrompts };
}

// ─── Category actions ─────────────────────────────────────────────────────────

export async function addCategory(
  name: string,
): Promise<ActionResult<Category>> {
  if (!name.trim()) return err('Category name is required.');
  try {
    const db = getDb();
    const [row] = await db
      .insert(categories)
      .values({ name: name.trim() })
      .returning();
    return ok(row);
  } catch (e) {
    return err(`Failed to add category: ${String(e)}`);
  }
}

export async function deleteCategory(
  id: number,
): Promise<ActionResult<{ deletedId: number }>> {
  try {
    const db = getDb();

    // Cascade: delete prompts for every asset in this category, then assets, then category.
    const categoryAssets = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.categoryId, id));

    for (const asset of categoryAssets) {
      await db.delete(prompts).where(eq(prompts.assetId, asset.id));
    }
    await db.delete(assets).where(eq(assets.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));

    return ok({ deletedId: id });
  } catch (e) {
    return err(`Failed to delete category: ${String(e)}`);
  }
}

// ─── Asset actions ────────────────────────────────────────────────────────────

export async function addAsset(
  name: string,
  categoryId: number,
): Promise<ActionResult<Asset>> {
  if (!name.trim())  return err('Asset name is required.');
  if (!categoryId)   return err('Category ID is required.');
  try {
    const db = getDb();
    const [row] = await db
      .insert(assets)
      .values({ name: name.trim(), categoryId })
      .returning();
    return ok(row);
  } catch (e) {
    return err(`Failed to add asset: ${String(e)}`);
  }
}

export async function deleteAsset(
  id: number,
): Promise<ActionResult<{ deletedId: number }>> {
  try {
    const db = getDb();
    // Cascade: delete all prompts for this asset first.
    await db.delete(prompts).where(eq(prompts.assetId, id));
    await db.delete(assets).where(eq(assets.id, id));
    return ok({ deletedId: id });
  } catch (e) {
    return err(`Failed to delete asset: ${String(e)}`);
  }
}

// ─── Prompt / Step actions ────────────────────────────────────────────────────

export type UpsertPromptInput = {
  id?:             number;   // omit for insert
  assetId:         number;
  order:           number;
  model:           string;
  content:         string;
  outputTo:        string;
  targetStepOrder: number | null;
  execType:        string;
};

/**
 * Insert a new prompt step OR update an existing one (patch by id).
 * Returns the full row after the operation.
 */
export async function upsertPromptStep(
  input: UpsertPromptInput,
): Promise<ActionResult<DBPrompt>> {
  try {
    const db = getDb();

    if (input.id) {
      // UPDATE
      const [row] = await db
        .update(prompts)
        .set({
          model:           input.model,
          content:         input.content,
          outputTo:        input.outputTo,
          targetStepOrder: input.targetStepOrder,
          execType:        input.execType,
          order:           input.order,
        })
        .where(eq(prompts.id, input.id))
        .returning();

      return ok(row);
    } else {
      // INSERT
      const [row] = await db
        .insert(prompts)
        .values({
          assetId:         input.assetId,
          order:           input.order,
          model:           input.model,
          content:         input.content,
          outputTo:        input.outputTo,
          targetStepOrder: input.targetStepOrder,
          execType:        input.execType,
        })
        .returning();
      return ok(row);
    }
  } catch (e) {
    return err(`Failed to save prompt step: ${String(e)}`);
  }
}

/**
 * Delete a step and re-sequence the remaining steps for that asset.
 * Returns the updated array of prompts for that asset so the client
 * can replace its local state without guessing the new order values.
 */
export async function deletePromptStep(
  id: number,
  assetId: number,
): Promise<ActionResult<DBPrompt[]>> {
  try {
    const db = getDb();
    await db.delete(prompts).where(eq(prompts.id, id));

    // Re-fetch and re-sequence remaining steps.
    const remaining = await db
      .select()
      .from(prompts)
      .where(eq(prompts.assetId, assetId))
      .orderBy(asc(prompts.order));

    // Fix order gaps (e.g. 1,2,4 → 1,2,3) and clear stale targetStepOrder refs.
    const validOrders = new Set(remaining.map((_, i) => i + 1));
    const updates = remaining.map(async (step, i) => {
      const newOrder = i + 1;
      const newTarget =
        step.outputTo === 'next_step' &&
        step.targetStepOrder !== null &&
        !validOrders.has(step.targetStepOrder!)
          ? null
          : step.targetStepOrder;

      const [updated] = await db
        .update(prompts)
        .set({ order: newOrder, targetStepOrder: newTarget })
        .where(eq(prompts.id, step.id))
        .returning();
      return updated;
    });

    const reordered = await Promise.all(updates);
    return ok(reordered);
  } catch (e) {
    return err(`Failed to delete prompt step: ${String(e)}`);
  }
}