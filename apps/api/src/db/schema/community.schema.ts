import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  customType,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
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

/**
 * Postgres `tsvector`. Not a Drizzle built-in, so declared here — the search design
 * (EPIC-C §4) keeps full-text search inside Postgres rather than shipping forum content,
 * including de-identified case discussions, to a third-party search service.
 */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => 'tsvector',
});

/**
 * Content-type categories (EPIC-C §3) — "Clinical Case", "Research", "Career"… NOT body
 * areas, which are tags. A small admin-managed set; every post has exactly one.
 *
 * `retired_at` hides a category from the composer without rewriting the posts that
 * already use it (EPIC-J).
 */
export const categories = community.table('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
});

export const tagFacet = community.enum('tag_facet', ['region', 'muscle', 'structure', 'pathology']);

/**
 * The single unified clinical vocabulary (EPIC-C §3, resolved with Andrew 2026-07-17).
 *
 * One list, not one per surface: a case post legitimately needs *tendinopathy* alongside
 * *knee*, and the news feed (EPIC-I) draws its interests from the same rows. The `facet`
 * is organising metadata for grouping the composer — not a wall between surfaces.
 *
 * Admin-managed, never member-created: a hybrid taxonomy whose tag half were freely
 * extensible would collapse into pure tagging, which FD-4 rejects for MVP.
 */
export const tags = community.table(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    facet: tagFacet('facet').notNull(),
    // Region grouping (Upper limb / Lower limb). Self-referencing, hence the lazy callback.
    parentId: uuid('parent_id').references((): AnyPgColumn => tags.id),
    // Seeds the search synonym dictionary (EPIC-C §4) as well as matching on input.
    synonyms: text('synonyms').array().notNull().default(sql`'{}'::text[]`),
    // INTERNAL ONLY — MeSH mapping for research-feed/literature interop (EPIC-I).
    // Never member-facing; deliberately not in any DTO.
    meshId: text('mesh_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
  },
  (t) => [index('tags_facet_idx').on(t.facet, t.sortOrder)],
);

export const postType = community.enum('post_type', ['question', 'case_discussion']);

/**
 * `draft` and `needs_correction` are case-discussion-only states (EPIC-E). An ordinary
 * question publishes immediately and only ever uses `published`/`removed`.
 */
export const postStatus = community.enum('post_status', [
  'published',
  'removed',
  'draft',
  'needs_correction',
]);

export const posts = community.table(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    handleId: uuid('handle_id')
      .notNull()
      .references(() => handles.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    type: postType('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: postStatus('status').notNull().default('published'),
    // Weighted per EPIC-C §4: a title hit outranks a passing mention in the body. Tags
    // and comments join the query at search time (S7) rather than being denormalised
    // into this column, which would need reindexing every time a tag was renamed.
    // Column names are bare rather than Drizzle references — a generated expression
    // can't refer to the table object it is being defined on.
    tsv: tsvector('tsv').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body, '')), 'B')`,
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [
    index('posts_tsv_idx').using('gin', t.tsv),
    // The list surface's default ordering, newest first, and its cursor.
    index('posts_created_idx').on(t.createdAt, t.id),
    index('posts_category_idx').on(t.categoryId, t.createdAt),
    index('posts_handle_idx').on(t.handleId, t.createdAt),
  ],
);

export const postTags = community.table(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('post_tags_tag_idx').on(t.tagId)],
);

export const commentStatus = community.enum('comment_status', ['published', 'removed']);

/**
 * Answers and replies. The write path arrives with S5 (EPIC-D's kudos ranking is what
 * makes answers meaningful); the table lands here so `answer_count` on the list and
 * thread DTOs is a real count from the start rather than a hardcoded zero.
 */
export const comments = community.table(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    handleId: uuid('handle_id')
      .notNull()
      .references(() => handles.id),
    parentCommentId: uuid('parent_comment_id').references((): AnyPgColumn => comments.id),
    body: text('body').notNull(),
    status: commentStatus('status').notNull().default('published'),
    tsv: tsvector('tsv').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(body, '')), 'D')`,
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [
    index('comments_post_idx').on(t.postId, t.createdAt),
    index('comments_tsv_idx').using('gin', t.tsv),
  ],
);

export const kudosTargetType = community.enum('kudos_target_type', ['post', 'comment']);

/**
 * A single kudos from one handle to one post or comment (EPIC-D §2, architecture §4.2).
 * Kudos is the platform's one merit signal — the mechanism behind "ideas win, not rank"
 * — so the model is deliberately spare: one row per (handle, target), no weighting.
 *
 * `target_id` is polymorphic (a post or a comment id, per `target_type`), so it carries
 * no foreign key — the two-table reference a single column can't express is validated in
 * the service instead. Kudos rows are never cascade-deleted: content is soft-removed
 * (status = removed), and the one place rows are hard-deleted is the moderation clawback
 * (EPIC-F, S11), which does it explicitly so it can decrement `kudos_total` in the same
 * transaction.
 *
 * The unique index is also the concurrency guard: two simultaneous awards of the same
 * target by the same handle can't both insert, so the paired `kudos_total` increment
 * stays a blind `+ 1` rather than a read-then-write that could race (EPIC-D §8).
 */
export const kudos = community.table(
  'kudos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetType: kudosTargetType('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    givenByHandleId: uuid('given_by_handle_id')
      .notNull()
      .references(() => handles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('kudos_one_per_handle_unique').on(t.targetType, t.targetId, t.givenByHandleId),
    // Counting a target's kudos, and the clawback's "delete all kudos for this target".
    index('kudos_target_idx').on(t.targetType, t.targetId),
  ],
);
