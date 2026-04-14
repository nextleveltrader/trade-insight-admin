import { sqliteTable, text, integer, primaryKey, unique } from 'drizzle-orm/sqlite-core';
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


// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUTH.JS v5 — DrizzleAdapter Tables (SQLite / Cloudflare D1) ──────────────
// ═══════════════════════════════════════════════════════════════════════════════
//
// Migration note for existing DBs — run these statements once:
//
//   ALTER TABLE user ADD COLUMN trial_starts_at  INTEGER;
//   ALTER TABLE user ADD COLUMN trial_ends_at    INTEGER;
//   ALTER TABLE user ADD COLUMN device_id        TEXT;
//   ALTER TABLE user ADD COLUMN stripe_customer_id TEXT;
//   ALTER TABLE user ADD COLUMN is_pro           INTEGER NOT NULL DEFAULT 0;
//
//   CREATE TABLE IF NOT EXISTS session (
//     sessionToken TEXT NOT NULL PRIMARY KEY,
//     userId       TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
//     expires      INTEGER NOT NULL
//   );
//
//   CREATE TABLE IF NOT EXISTS verification_token (
//     identifier TEXT NOT NULL,
//     token      TEXT NOT NULL,
//     expires    INTEGER NOT NULL,
//     PRIMARY KEY (identifier, token)
//   );
//
// For new installs, run: npx drizzle-kit generate && npx wrangler d1 migrations apply
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Users ────────────────────────────────────────────────────────────────────
//
// Core Auth.js columns (id, name, email, emailVerified, image) MUST stay
// exactly as-is for the DrizzleAdapter contract.
//
// Custom columns appended below the core set:
//   • password         — bcrypt hash for credentials provider
//   • role             — "user" | "admin" for future RBAC
//   • trialStartsAt    — UTC epoch (ms) when the 14-day trial began
//   • trialEndsAt      — UTC epoch (ms) when the trial expires
//   • deviceId         — browser fingerprint for anti-fraud deduplication
//   • stripeCustomerId — Stripe customer object ID, set on first checkout
//   • isPro            — 1 when an active paid subscription exists

export const users = sqliteTable("user", {
  // ── Auth.js core ─────────────────────────────────────────────────────────
  id:            text("id")
                   .primaryKey()
                   .$defaultFn(() => crypto.randomUUID()),
  name:          text("name"),
  email:         text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image:         text("image"),

  // ── Credentials auth ─────────────────────────────────────────────────────
  password:      text("password"),           // bcrypt hash; null for OAuth users

  // ── Role-based access control ─────────────────────────────────────────────
  role:          text("role").default("user"), // "user" | "admin"

  // ── Freemium / trial tracking ─────────────────────────────────────────────
  /**
   * trialStartsAt — set to NOW() at the moment of registration.
   * Stored as epoch-milliseconds (integer) for consistency with
   * Auth.js's emailVerified column convention.
   */
  trialStartsAt: integer("trial_starts_at", { mode: "timestamp_ms" }),

  /**
   * trialEndsAt — set to trialStartsAt + 14 days at registration.
   * The application checks  Date.now() < trialEndsAt  to gate content.
   */
  trialEndsAt:   integer("trial_ends_at",   { mode: "timestamp_ms" }),

  // ── Anti-fraud device fingerprinting ─────────────────────────────────────
  /**
   * deviceId — a stable browser fingerprint (e.g. FingerprintJS visitor ID)
   * stored on first login/registration. Used to prevent serial trial abuse
   * by detecting the same physical device creating multiple accounts.
   */
  deviceId:      text("device_id"),

  // ── Billing ──────────────────────────────────────────────────────────────
  /**
   * stripeCustomerId — populated on the first Stripe Checkout session.
   * Allows webhook handlers to look up the user by their Stripe customer.
   */
  stripeCustomerId: text("stripe_customer_id"),

  /**
   * isPro — 1 (true) when the user holds an active paid subscription.
   * Flipped to 0 on subscription cancellation / payment failure via webhook.
   * Using integer mode here because SQLite has no native boolean type;
   * Drizzle will coerce JS booleans automatically when mode:"boolean" is set.
   */
  isPro:         integer("is_pro", { mode: "boolean" }).notNull().default(false),

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdAt:     text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Accounts ─────────────────────────────────────────────────────────────────
// OAuth provider accounts linked to a user row.
// Required by DrizzleAdapter — do not rename columns.

export const accounts = sqliteTable(
  "account",
  {
    userId:            text("userId")
                         .notNull()
                         .references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token:     text("refresh_token"),
    access_token:      text("access_token"),
    expires_at:        integer("expires_at"),
    token_type:        text("token_type"),
    scope:             text("scope"),
    id_token:          text("id_token"),
    session_state:     text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

// ─── Sessions ─────────────────────────────────────────────────────────────────
// Database sessions managed by Auth.js (used when strategy: "database").
// Required by DrizzleAdapter — do not rename columns.

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId:       text("userId")
                  .notNull()
                  .references(() => users.id, { onDelete: "cascade" }),
  expires:      integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// ─── Verification Tokens ──────────────────────────────────────────────────────
// Short-lived tokens for email verification / magic-link sign-in.
// Required by DrizzleAdapter — do not rename columns.

export const verificationTokens = sqliteTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ─── USER FEATURES TABLES ─────────────────────────────────────────────────────

export const savedPosts = sqliteTable(
  "saved_posts",
  {
    id:      text("id")
               .primaryKey()
               .$defaultFn(() => crypto.randomUUID()),
    userId:  text("user_id")
               .notNull()
               .references(() => users.id, { onDelete: "cascade" }),
    postId:  text("post_id")
               .notNull()
               .references(() => posts.id, { onDelete: "cascade" }),
    savedAt: text("saved_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueSave: unique("unique_save_idx").on(table.userId, table.postId),
  }),
);

// ─── Inferred types (Auth) ────────────────────────────────────────────────────

export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type Account           = typeof accounts.$inferSelect;
export type Session           = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type SavedPost         = typeof savedPosts.$inferSelect;