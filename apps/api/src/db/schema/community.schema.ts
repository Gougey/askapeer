import { sql } from 'drizzle-orm';
import { date, integer, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { members } from './identity.schema';

/**
 * The `community` schema (EPIC-B onwards) — pseudonymous, peer-facing data. Nothing
 * here is personally identifying: the split from `identity` is what makes the anonymity
 * guarantee structural rather than a display-layer filter (architecture spec §4.4).
 */
export const community = pgSchema('community');

export const handleStatus = community.enum('handle_status', ['active', 'suspended', 'expelled']);

/**
 * A member's pseudonymous handle (EPIC-B §2). One per member.
 *
 * `member_id` exists for referential integrity only — no endpoint in this schema ever
 * returns it (EPIC-B §5). In production it is readable solely under IdentityService's
 * role; the prove phase runs everything under one role, and the boundary lands at the
 * AWS migrate step alongside the rest of the per-role grants.
 */
export const handles = community.table(
  'handles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .unique()
      .references(() => members.id, { onDelete: 'cascade' }),
    handleName: text('handle_name').notNull(),
    // Written by EPIC-D (S5). Read-only here.
    kudosTotal: integer('kudos_total').notNull().default(0),
    // Full date stored for internal/KPI use; the API only ever exposes the year —
    // a precise join date is a correlation vector back to a real person (EPIC-B §4).
    memberSince: date('member_since').notNull().defaultNow(),
    // Written by EPIC-F (S11). Read-only here.
    status: handleStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive uniqueness: `DrSmith` and `drsmith` must not coexist, since
    // visually near-identical handles are an impersonation vector (EPIC-B §3).
    uniqueIndex('handles_name_lower_unique').on(sql`lower(${t.handleName})`),
  ],
);

/**
 * Append-only record of every name a handle has had (EPIC-B §2). Two jobs:
 *
 *  1. A moderator-forced rename (EPIC-F's `rename_handle`, S11) must leave a trail —
 *     otherwise a renamed handle's post history looks like it belonged to two people.
 *  2. It is the lookup that stops a fresh registration re-adopting a name an expelled
 *     member used (EPIC-B §3), which would confuse members about who they're talking to.
 *
 * Job 2 is why a row is written at *creation* time too, not only on rename (the spec's
 * `changed_by = 'system'` case). At creation `previous_name` holds the name just taken —
 * slightly at odds with the column's name, but it keeps the "has this name ever been
 * used?" check a single lookup that still answers correctly if the handle row is later
 * removed. Renames write the name being replaced, as the column reads.
 */
export const handleNameHistory = community.table('handle_name_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  handleId: uuid('handle_id')
    .notNull()
    .references(() => handles.id, { onDelete: 'cascade' }),
  previousName: text('previous_name').notNull(),
  changedBy: text('changed_by').notNull(), // 'system' (first creation) or an admin's member_id
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});
