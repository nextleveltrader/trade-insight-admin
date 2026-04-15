// src/types/content.ts
// ─────────────────────────────────────────────────────────────────────────────
// Canonical types for user-facing content (feed, detail, saved).
//
// These types are the contract between server actions (get-content.ts) and
// every client component that renders posts.  Keep this file free of DB /
// Auth imports so it can be imported safely in both Server and Client
// components without triggering edge-runtime restrictions.
// ─────────────────────────────────────────────────────────────────────────────

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

export type Direction = "Bullish" | "Bearish" | "Neutral";
export type Category  = "Forex" | "Crypto" | "Indices" | "Commodities" | "Metals";

// ─── FEED CARD ────────────────────────────────────────────────────────────────
// Everything a feed card or saved-page card needs.  Intentionally minimal —
// the full body is only loaded for the detail page (UIInsightDetail).

export interface UIInsight {
  id:           number;
  asset:        string;        // e.g. "EUR/USD"  (from assets.name)
  category:     Category;      // e.g. "Forex"
  direction:    Direction;     // e.g. "Bullish"
  biasType:     string;        // e.g. "Fundamental Bias", "ICT Bias — Today"
  summary:      string;        // 1–2 sentence plain-text summary for the card
  timeAgo:      string;        // derived: "2h ago", "Yesterday"
  publishedAt:  string;        // formatted: "06:15 AM UTC" or "06:15 AM UTC · Apr 13"
  readMin:      number;        // derived from body word count
  confidence:   number;        // 0–100
  isProOnly:    boolean;
  isHistorical: boolean;       // derived: isProOnly && publishedAt < now-24h
  slug:         string | null;
}

// ─── DETAIL PAGE ─────────────────────────────────────────────────────────────
// Extends UIInsight with the full HTML body for the detail page.

export interface UIInsightDetail extends UIInsight {
  body: string;  // TipTap HTML
}

// ─── HELPER FUNCTIONS (pure — no side effects, no imports) ───────────────────

/** Strip all HTML tags and decode common entities to get plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g,  " ")
    .replace(/&amp;/g,   "&")
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&quot;/g,  '"')
    .replace(/&#39;/g,   "'")
    .replace(/\s{2,}/g,  " ")
    .trim();
}

/** Estimate reading time (minutes) from raw HTML body. */
export function estimateReadMin(body: string): number {
  const words = stripHtml(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Format a Date as a human-readable "time ago" string. */
export function formatTimeAgo(date: Date): string {
  const now   = Date.now();
  const diffMs = now - date.getTime();
  const diffH  = diffMs / 3_600_000;

  if (diffH < 1)   return "Just now";
  if (diffH < 24)  return `${Math.floor(diffH)}h ago`;

  const diffD = diffH / 24;
  if (diffD < 2)   return "Yesterday";
  if (diffD < 7)   return `${Math.floor(diffD)} days ago`;
  if (diffD < 30)  return `${Math.floor(diffD / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a Date into the publishedAt display string. */
export function formatPublishedAt(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }) + " UTC";

  const diffH = (Date.now() - date.getTime()) / 3_600_000;
  if (diffH < 24) return time;

  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    timeZone: "UTC",
  });
  return `${time} · ${datePart}`;
}

/** Whether a post should show as "historical" (was Pro-only but >24h old → free). */
export function deriveIsHistorical(isProOnly: boolean, publishedAt: Date): boolean {
  return isProOnly && (Date.now() - publishedAt.getTime()) > 24 * 3_600_000;
}

/** Normalise an unknown category string into the union type (fallback: "Forex"). */
export function toCategory(raw: string | null | undefined): Category {
  const allowed: Category[] = ["Forex", "Crypto", "Indices", "Commodities", "Metals"];
  if (raw && (allowed as string[]).includes(raw)) return raw as Category;
  return "Forex";
}

/** Normalise a direction string (fallback: "Neutral"). */
export function toDirection(raw: string | null | undefined): Direction {
  if (raw === "Bullish" || raw === "Bearish" || raw === "Neutral") return raw;
  return "Neutral";
}