import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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
//
// Migration note for existing DBs — run this ALTER statement:
//
//   ALTER TABLE prompts ADD COLUMN model_tier TEXT NOT NULL DEFAULT 'medium';
//
// For new installs, run: npx drizzle-kit generate && npx wrangler d1 migrations apply

export const prompts = sqliteTable('prompts', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  assetId:         integer('asset_id').references(() => assets.id),
  order:           integer('order').notNull(),
  model:           text('model').notNull(),
  /**
   * modelTier controls which specific model version the engine resolves at
   * runtime via getActualModelVersion(). One of: 'minimum' | 'medium' | 'maximum'.
   *
   *   minimum  → fastest / cheapest variant for the chosen provider
   *   medium   → balanced default  (← default for all new rows)
   *   maximum  → most capable (and most expensive) variant
   */
  modelTier:       text('model_tier').notNull().default('medium'),
  content:         text('content').notNull(),
  outputTo:        text('output_to').notNull(),
  targetStepOrder: integer('target_step_order'),
  execType:        text('exec_type').notNull().default('manual'),
});

// ─── Posts ────────────────────────────────────────────────────────────────────
// Migration note for existing DBs — run these ALTER statements:
//
//   ALTER TABLE posts ADD COLUMN category        TEXT;
//   ALTER TABLE posts ADD COLUMN tags            TEXT;
//   ALTER TABLE posts ADD COLUMN slug            TEXT;
//   ALTER TABLE posts ADD COLUMN meta_description TEXT;
//   ALTER TABLE posts ADD COLUMN meta_keywords   TEXT;
//
// For new installs, run: npx drizzle-kit generate && npx wrangler d1 migrations apply

export const posts = sqliteTable('posts', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  title:           text('title').notNull(),
  content:         text('content').notNull(),
  status:          text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  assetId:         integer('asset_id').references(() => assets.id),
  createdAt:       integer('created_at').notNull().default(sql`(unixepoch('now') * 1000)`),
  // ── New SEO & taxonomy columns ─────────────────────────────────────────────
  category:        text('category'),           // e.g. "Technical Analysis"
  tags:            text('tags'),               // comma-separated: "forex,gold,xauusd"
  slug:            text('slug'),               // URL slug: "xauusd-weekly-outlook"
  metaDescription: text('meta_description'),   // SEO meta description (≤160 chars)
  metaKeywords:    text('meta_keywords'),      // SEO meta keywords, comma-separated
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Asset    = typeof assets.$inferSelect;
export type DBPrompt = typeof prompts.$inferSelect;
export type DBPost   = typeof posts.$inferSelect;