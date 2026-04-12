import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = sqliteTable('categories', {
  id:   integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = sqliteTable('assets', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
});

// ─── Prompts ──────────────────────────────────────────────────────────────────
// Migration note: if upgrading an existing DB, run:
//   ALTER TABLE prompts ADD COLUMN target_step_order INTEGER;
//   ALTER TABLE prompts ADD COLUMN exec_type TEXT NOT NULL DEFAULT 'manual';

export const prompts = sqliteTable('prompts', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  assetId:         integer('asset_id').references(() => assets.id),
  order:           integer('order').notNull(),
  model:           text('model').notNull(),      // 'claude' | 'perplexity' | 'gemini' | 'chatgpt'
  content:         text('content').notNull(),
  outputTo:        text('output_to').notNull(),  // 'next_step' | 'telegram' | 'blog_draft'
  targetStepOrder: integer('target_step_order'), // nullable — only set when outputTo = 'next_step'
  execType:        text('exec_type').notNull().default('manual'), // 'manual' | 'scheduled'
});

// ─── Inferred types (used in server actions + client) ─────────────────────────

export type Category  = typeof categories.$inferSelect;
export type Asset     = typeof assets.$inferSelect;
export type DBPrompt  = typeof prompts.$inferSelect;