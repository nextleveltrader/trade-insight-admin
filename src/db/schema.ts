import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';


// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = sqliteTable('categories', {
  id:   integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// ─── Assets ───────────────────────────────────────────────────────────────────
//
// Sprint 2 — new column:
//   ALTER TABLE assets ADD COLUMN category TEXT;

export const assets = sqliteTable('assets', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  // ── Sprint 2 ──────────────────────────────────────────────────────────────
  category:   text('category'),    // denormalised label, e.g. "Forex", "Metals"
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
//
// Original migration notes — SEO / taxonomy columns (already applied):
//
//   ALTER TABLE posts ADD COLUMN category         TEXT;
//   ALTER TABLE posts ADD COLUMN tags             TEXT;
//   ALTER TABLE posts ADD COLUMN slug             TEXT;
//   ALTER TABLE posts ADD COLUMN meta_description TEXT;
//   ALTER TABLE posts ADD COLUMN meta_keywords    TEXT;
//
// Sprint 2 migration notes (applied via 0002_sprint2_posts_columns.sql):
//
//   ALTER TABLE posts ADD COLUMN asset_id     INTEGER REFERENCES assets(id);
//   ALTER TABLE posts ADD COLUMN direction    TEXT CHECK(direction IN ('Bullish','Bearish','Neutral'));
//   ALTER TABLE posts ADD COLUMN bias_type    TEXT;
//   ALTER TABLE posts ADD COLUMN summary      TEXT;
//   ALTER TABLE posts ADD COLUMN body         TEXT;
//   ALTER TABLE posts ADD COLUMN is_pro_only  INTEGER NOT NULL DEFAULT 0;
//   ALTER TABLE posts ADD COLUMN confidence   INTEGER NOT NULL DEFAULT 0;
//   ALTER TABLE posts ADD COLUMN published_at TEXT;

export const posts = sqliteTable(
  'posts',
  {
    // ── Core ────────────────────────────────────────────────────────────────
    id:      integer('id').primaryKey({ autoIncrement: true }),
    title:   text('title').notNull(),
    content: text('content').notNull(),                           // original rich-text column (keep)
    status:  text('status').notNull().default('draft'),           // 'draft' | 'published' | 'archived'

    // ── Existing SEO / taxonomy columns ─────────────────────────────────────
    assetId:         integer('asset_id').references(() => assets.id),
    category:        text('category'),           // e.g. "Forex", "Metals"
    tags:            text('tags'),               // comma-separated or JSON
    slug:            text('slug'),               // URL slug: "xauusd-weekly-outlook"
    metaDescription: text('meta_description'),   // ≤160 chars
    metaKeywords:    text('meta_keywords'),       // comma-separated keywords

    // ── Timestamps ──────────────────────────────────────────────────────────
    /**
     * createdAt — epoch-milliseconds (integer) set automatically on INSERT.
     * Already present in the original schema; kept here unchanged.
     */
    createdAt:  integer('created_at')
                  .notNull()
                  .default(sql`(unixepoch('now') * 1000)`),

    /**
     * publishedAt — ISO-8601 text string; set by the CMS when `status` is
     * changed to 'published'.  Null for drafts.
     * Stored as TEXT so it can be NULL before publish and is human-readable
     * in the DB browser without epoch→date conversion.
     */
    publishedAt: text('published_at'),

    // ── Sprint 2 — Content pipeline columns ─────────────────────────────────

    /**
     * direction — AI-determined market bias for this asset.
     * Enforced at the DB level by a CHECK constraint (see table options below)
     * and at the application level by the Direction type in src/types/content.ts.
     */
    direction: text('direction'),               // 'Bullish' | 'Bearish' | 'Neutral'

    /**
     * biasType — human-readable label for the analysis type shown on cards.
     * e.g. "Fundamental Bias", "ICT Bias — Today", "ICT Bias — Yesterday"
     */
    biasType: text('bias_type'),

    /**
     * summary — 1–2 sentence plain-text summary displayed on feed cards and
     * in the detail page header.  Distinct from metaDescription (SEO) and
     * body (full article).
     */
    summary: text('summary'),

    /**
     * body — Full TipTap HTML for the detail page.
     * Kept separate from `content` (the original CMS column) so the migration
     * is additive and no existing data is lost.
     */
    body: text('body'),

    /**
     * isProOnly — freemium gate flag.
     * 0 = free (visible to all users)
     * 1 = Pro-only (hidden behind paywall; becomes free after 24 h as
     *     "historical proof", see deriveIsHistorical() in src/types/content.ts)
     *
     * Stored as integer (SQLite has no native boolean).
     * Default 0 so that newly created posts are free until explicitly gated.
     */
    isProOnly: integer('is_pro_only').notNull().default(0),

    /**
     * confidence — AI-generated confidence score (0–100).
     * Rendered as the coloured progress bar on feed cards and the detail header.
     */
    confidence: integer('confidence').notNull().default(0),
  },
  // ── Table-level constraints ─────────────────────────────────────────────────
  (table) => ({
    /**
     * directionCheck — mirrors the CHECK constraint already applied to the
     * live DB via 0002_sprint2_posts_columns.sql so that Drizzle Kit's schema
     * introspection stays in sync.
     */
    directionCheck: check(
      'direction_check',
      sql`${table.direction} in ('Bullish', 'Bearish', 'Neutral')`,
    ),
  }),
);

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Asset    = typeof assets.$inferSelect;
export type DBPrompt = typeof prompts.$inferSelect;
export type DBPost   = typeof posts.$inferSelect;


// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUTH.JS v5 — DrizzleAdapter Tables (SQLite / Turso) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
//
// Migration note for existing DBs — run these statements once:
//
//   ALTER TABLE user ADD COLUMN trial_starts_at    INTEGER;
//   ALTER TABLE user ADD COLUMN trial_ends_at      INTEGER;
//   ALTER TABLE user ADD COLUMN device_id          TEXT;
//   ALTER TABLE user ADD COLUMN stripe_customer_id TEXT;
//   ALTER TABLE user ADD COLUMN is_pro             INTEGER NOT NULL DEFAULT 0;
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
    // ⚠️  Bug #11 — post_id is stored as TEXT but posts.id is INTEGER.
    //     The column type will be fixed (text → integer) in Sprint 3 so the
    //     FK relationship is correct at the DB level.  Until then,
    //     get-content.ts works around this with an explicit CAST.
    postId:  text("post_id").notNull(),
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