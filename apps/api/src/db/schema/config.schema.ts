import { pgSchema, text } from 'drizzle-orm/pg-core';

/**
 * The `config` schema (EPIC-J) — operational configuration. Introduced first
 * as the S0 walking-skeleton's proof that Postgres schemas + migrations work
 * end-to-end. Other schemas (identity, community, billing, research) arrive
 * with their epics' slices.
 */
export const config = pgSchema('config');

/** A tiny key/value table used by the health check to prove a real DB round-trip. */
export const appMeta = config.table('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
