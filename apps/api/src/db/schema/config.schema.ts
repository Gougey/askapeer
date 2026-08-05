import { sql } from 'drizzle-orm';
import { index, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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

export const blocklistMatchMode = config.enum('blocklist_match_mode', ['exact', 'contains']);

/**
 * Handle-name blocklist (EPIC-B §3/§11) — a table, not a code constant, so a moderator
 * can add a term without a release. Profession-specific words that hint at identity or
 * impersonate authority can't be enumerated upfront, and needing a deploy for each one
 * is friction felt exactly when responding to abuse.
 *
 * `match_mode` exists because EPIC-B §12 rules out a naive substring match: role-
 * impersonation terms ("admin") must be caught anywhere in a name, but a blanket
 * substring rule would reject legitimate clinical words that happen to contain a
 * blocked fragment. Terms whose false-positive risk is high are stored `exact`.
 */
export const handleBlocklist = config.table(
  'handle_blocklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    term: text('term').notNull(),
    matchMode: blocklistMatchMode('match_mode').notNull().default('contains'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('handle_blocklist_term_unique').on(sql`lower(${t.term})`)],
);

/**
 * Tunable platform settings (EPIC-J §4). Values are stored as text and parsed by the
 * reading module, which owns the type — the alternative (a column per type) buys
 * nothing at this scale. Numeric billing tunables live here; billing *semantics* stay
 * in EPIC-H (open-questions §1.4).
 */
export const settings = config.table('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every configuration change an administrator makes (EPIC-J §3).
 *
 * Required by EPIC-J from the start and never created until now, because nothing had been
 * editable — the vocabulary arrived by migration. The taxonomy admin changes that, and
 * taxonomy edits are exactly what needs a record: a synonym alters what every member can
 * find, in search and in their feed, without changing a single visible screen. "Why did
 * this article start appearing?" needs an answer that is not archaeology through git.
 *
 * Append-only by convention, like `identity_access_log` and `moderation_actions`: no update
 * or delete path exists in the application. `detail` holds the before and after, because a
 * record that says only "synonyms changed" answers nothing.
 */
export const adminAuditLog = config.table(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The administrator's *member* id — this is identity-side accountability, not a handle. */
    actorMemberId: uuid('actor_member_id').notNull(),
    /** e.g. `tag.synonyms_updated`. Dotted, so a target's actions group by prefix. */
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    /** Before and after. Free-shaped on purpose: each action records what it needs. */
    detail: jsonb('detail').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('admin_audit_created_idx').on(t.createdAt.desc())],
);
