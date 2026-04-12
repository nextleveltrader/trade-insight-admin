import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ক্যাটাগরি টেবিল (Forex, Crypto etc.)
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// অ্যাসেট টেবিল (XAUUSD, BTCUSD etc.)
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
});

// প্রম্পট টেবিল (Prompt Chaining Logic)
export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id').references(() => assets.id),
  order: integer('order').notNull(), // ১, ২, ৩ নম্বর প্রম্পট
  model: text('model').notNull(), // Claude, ChatGPT, Gemini etc.
  content: text('content').notNull(), // প্রম্পট টেক্সট
  outputTo: text('output_to').notNull(), // Next Prompt, Telegram, Blog
});