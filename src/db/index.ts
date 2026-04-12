/**
 * src/db/index.ts
 *
 * Returns a Drizzle ORM instance bound to the Cloudflare D1 database.
 *
 * REQUIREMENTS:
 *   npm install @cloudflare/next-on-pages
 *
 * LOCAL DEV:
 *   Use `wrangler pages dev` (not `next dev`) so that getRequestContext()
 *   can access the D1 binding. Add the following to wrangler.toml:
 *
 *     [[d1_databases]]
 *     binding = "DB"
 *     database_name = "trade-admin"
 *     database_id   = "<your-d1-database-id>"
 *
 * MIGRATIONS:
 *   npx drizzle-kit generate
 *   npx wrangler d1 migrations apply trade-admin --local   # local
 *   npx wrangler d1 migrations apply trade-admin           # production
 */

import { getRequestContext } from '@cloudflare/next-on-pages';
import { drizzle }           from 'drizzle-orm/d1';
import * as schema           from './schema';

export type DB = ReturnType<typeof getDb>;

export function getDb() {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  return drizzle(db, { schema });
}