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

// ─── Posts ────────────────────────────────────────────────────────────────────
// Migration note for new installs — create via drizzle-kit generate.
// For existing DBs, run:
//   CREATE TABLE IF NOT EXISTS posts (
//     id         INTEGER PRIMARY KEY AUTOINCREMENT,
//     title      TEXT    NOT NULL,
//     content    TEXT    NOT NULL,
//     status     TEXT    NOT NULL DEFAULT 'draft',
//     asset_id   INTEGER REFERENCES assets(id),
//     created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
//   );

export const posts = sqliteTable('posts', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  title:     text('title').notNull(),
  content:   text('content').notNull(),
  // 'draft' | 'published' | 'archived'
  status:    text('status').notNull().default('draft'),
  assetId:   integer('asset_id').references(() => assets.id),
  // Unix timestamp in milliseconds (compatible with `new Date(createdAt)`)
  createdAt: integer('created_at').notNull().default(sql`(unixepoch('now') * 1000)`),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Asset    = typeof assets.$inferSelect;
export type DBPrompt = typeof prompts.$inferSelect;
export type DBPost   = typeof posts.$inferSelect;