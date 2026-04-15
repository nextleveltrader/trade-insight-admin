// src/actions/get-content.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2 — DB-backed content actions.
//
// Replaces all hardcoded INSIGHTS mock arrays on the user-facing pages.
//
// ── Schema prerequisites ─────────────────────────────────────────────────────
// Run src/db/migrations/0002_sprint2_posts_columns.sql before deploying.
// New columns used here (beyond the original posts table):
//
//   posts.asset_id    INTEGER      FK → assets.id
//   posts.direction   TEXT         'Bullish' | 'Bearish' | 'Neutral'
//   posts.bias_type   TEXT         e.g. 'ICT Bias — Today'
//   posts.summary     TEXT         plain-text summary for feed cards
//   posts.body        TEXT         TipTap HTML
//   posts.is_pro_only INTEGER      0 | 1 boolean
//   posts.confidence  INTEGER      0–100
//   posts.published_at TEXT        ISO 8601 timestamp string
//
// ── Bug #11 workaround ───────────────────────────────────────────────────────
// saved_posts.post_id is TEXT; posts.id is INTEGER.
// Until the Sprint 3 schema fix lands, the join uses a SQL CAST.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { sql, eq, desc, and, inArray } from "drizzle-orm";
import { getDb }                        from "@/db";
import { posts, assets, savedPosts }    from "@/db/schema";
import { auth }                         from "@/auth";
import {
  UIInsight,
  UIInsightDetail,
  estimateReadMin,
  formatTimeAgo,
  formatPublishedAt,
  deriveIsHistorical,
  toCategory,
  toDirection,
} from "@/types/content";

// ─── INTERNAL COLUMN SELECTOR ─────────────────────────────────────────────────
// Centralised column list used in every query so we never over-fetch.

const POST_COLUMNS = {
  id:          posts.id,
  status:      posts.status,
  direction:   posts.direction,
  biasType:    posts.biasType,
  summary:     posts.summary,
  isProOnly:   posts.isProOnly,
  confidence:  posts.confidence,
  publishedAt: posts.publishedAt,
  createdAt:   posts.createdAt,
  slug:        posts.slug,
  category:    posts.category,
} as const;

const POST_DETAIL_COLUMNS = {
  ...POST_COLUMNS,
  body: posts.body,
} as const;

const ASSET_COLUMNS = {
  assetName:     assets.name,
  assetCategory: assets.category,
} as const;

// ─── INTERNAL MAPPER ──────────────────────────────────────────────────────────
// Maps a raw DB row (result of any of the queries below) into the UI type.
// All fields are nullable at the DB level; we apply safe defaults everywhere.

type RawPostRow = {
  id:            number;
  direction:     string | null;
  biasType:      string | null;
  summary:       string | null;
  isProOnly:     boolean | number | null;
  confidence:    number | null;
  publishedAt:   string | null;
  createdAt:     number | null;
  slug:          string | null;
  category:      string | null;
  assetName:     string | null;
  assetCategory: string | null;
};

type RawDetailRow = RawPostRow & { body: string | null };

function resolveDate(publishedAt: string | null, createdAt: number | null): Date {
  const raw = publishedAt ?? createdAt;
  if (!raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function mapToUIInsight(row: RawPostRow): UIInsight {
  const date        = resolveDate(row.publishedAt, row.createdAt);
  const isProOnly   = Boolean(row.isProOnly);
  const isHistorical = deriveIsHistorical(isProOnly, date);

  return {
    id:           row.id,
    asset:        row.assetName     ?? "Unknown Asset",
    category:     toCategory(row.assetCategory ?? row.category),
    direction:    toDirection(row.direction),
    biasType:     row.biasType      ?? "Market Analysis",
    summary:      row.summary       ?? "",
    timeAgo:      formatTimeAgo(date),
    publishedAt:  formatPublishedAt(date),
    readMin:      0,   // not needed for feed cards; set to 0 to avoid body fetch
    confidence:   row.confidence    ?? 0,
    isProOnly,
    isHistorical,
    slug:         row.slug          ?? null,
  };
}

function mapToUIInsightDetail(row: RawDetailRow): UIInsightDetail {
  const date        = resolveDate(row.publishedAt, row.createdAt);
  const isProOnly   = Boolean(row.isProOnly);
  const isHistorical = deriveIsHistorical(isProOnly, date);
  const body        = row.body ?? "";

  return {
    id:           row.id,
    asset:        row.assetName     ?? "Unknown Asset",
    category:     toCategory(row.assetCategory ?? row.category),
    direction:    toDirection(row.direction),
    biasType:     row.biasType      ?? "Market Analysis",
    summary:      row.summary       ?? "",
    body,
    timeAgo:      formatTimeAgo(date),
    publishedAt:  formatPublishedAt(date),
    readMin:      estimateReadMin(body),
    confidence:   row.confidence    ?? 0,
    isProOnly,
    isHistorical,
    slug:         row.slug          ?? null,
  };
}

// ─── ACTION 1: getLatestInsights ──────────────────────────────────────────────
// Feed page — 20 most recent published posts, joined with their asset names.

export async function getLatestInsights(): Promise<UIInsight[]> {
  try {
    const db   = getDb();
    const rows = await db
      .select({ ...POST_COLUMNS, ...ASSET_COLUMNS })
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt))
      .limit(20)
      .all();

    return rows.map(mapToUIInsight);
  } catch (err) {
    console.error("[getLatestInsights] DB error:", err);
    return [];
  }
}

// ─── ACTION 2: getSavedInsights ───────────────────────────────────────────────
// Saved page — posts bookmarked by the current user.
//
// Bug #11 workaround: saved_posts.post_id is TEXT, posts.id is INTEGER.
// We use a SQL CAST so SQLite can match the types correctly in the join.

export async function getSavedInsights(): Promise<UIInsight[]> {
  try {
    const session = await auth();
    const userId  = session?.user?.id;
    if (!userId) return [];

    const db = getDb();

    // Step 1 — get the saved post IDs for the user (already working code path)
    const savedRows = await db
      .select({ postId: savedPosts.postId })
      .from(savedPosts)
      .where(eq(savedPosts.userId, userId))
      .all();

    if (savedRows.length === 0) return [];

    // Step 2 — convert TEXT post IDs to numbers
    const postIds = savedRows
      .map((r) => Number(r.postId))
      .filter((n) => !isNaN(n) && n > 0);

    if (postIds.length === 0) return [];

    // Step 3 — fetch those posts with asset join
    const rows = await db
      .select({ ...POST_COLUMNS, ...ASSET_COLUMNS })
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(
        and(
          inArray(posts.id, postIds),
          eq(posts.status, "published"),
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .all();

    return rows.map(mapToUIInsight);
  } catch (err) {
    console.error("[getSavedInsights] DB error:", err);
    return [];
  }
}

// ─── ACTION 3: getInsightById ─────────────────────────────────────────────────
// Detail page — single post with full HTML body.
// Returns null for draft / archived posts (404 → NotFound in the UI).

export async function getInsightById(id: number): Promise<UIInsightDetail | null> {
  if (!id || isNaN(id)) return null;

  try {
    const db = getDb();

    const [row] = await db
      .select({ ...POST_DETAIL_COLUMNS, ...ASSET_COLUMNS })
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(
        and(
          eq(posts.id, id),
          eq(posts.status, "published"),
        ),
      )
      .limit(1)
      .all();

    if (!row) return null;
    return mapToUIInsightDetail(row);
  } catch (err) {
    console.error(`[getInsightById(${id})] DB error:`, err);
    return null;
  }
}

// ─── ACTION 4: getInsightsByCategory ─────────────────────────────────────────
// Feed filter helper — used if the server side needs to filter by category.
// Currently the category filter is client-side; this is here for future use
// or if the feed is converted to server-driven pagination.

export async function getInsightsByCategory(
  category: string,
  limit = 20,
): Promise<UIInsight[]> {
  try {
    const db   = getDb();
    const rows = await db
      .select({ ...POST_COLUMNS, ...ASSET_COLUMNS })
      .from(posts)
      .leftJoin(assets, eq(posts.assetId, assets.id))
      .where(
        and(
          eq(posts.status,   "published"),
          eq(posts.category, category),
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .all();

    return rows.map(mapToUIInsight);
  } catch (err) {
    console.error("[getInsightsByCategory] DB error:", err);
    return [];
  }
}