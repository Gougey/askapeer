import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
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

// Declared above `categories` rather than beside `posts`, because the categories table
// references it — a `const` used before its initialiser is a runtime ReferenceError, not
// a type error, so the order here is load-bearing.
export const postType = community.enum('post_type', ['question', 'case_discussion']);

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
  /**
   * Which kind of post this category is for, or null for "either".
   *
   * "Clinical Case" is the one category that overlaps with `posts.type`: a case discussion
   * *is* a clinical case, so asking its author to pick that category is asking them to
   * restate what they already chose on the previous screen, and offering it to a plain
   * question invites the wrong one. Marking the category instead of matching the string
   * `'Clinical Case'` matters because EPIC-J lets an administrator rename categories, and
   * a rename must not quietly change behaviour.
   *
   * Deliberately no CHECK tying this to `posts.type`: real questions already sit in the
   * clinical-case category from before the rule existed, and retro-fitting a constraint
   * would either fail the migration or force a rewrite of members' posts to satisfy a
   * composer rule. The rule is enforced on the way in, and history is left alone.
   */
  postType: postType('post_type'),
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
    // NOT globally unique — the clinical taxonomy repeats names across branches ("Nerve",
    // "Bone", even leaves like "Rheumatoid arthritis" listed under several regions). A tag's
    // identity is its name *within its parent*; uniqueness is sibling-scoped below, and the
    // disambiguating context (region) is shown in the UI, never baked into the name.
    name: text('name').notNull(),
    facet: tagFacet('facet').notNull(),
    // The parent node (region → axis → sub-group → leaf). Self-referencing, hence the lazy
    // callback. A null parent is a top-level region.
    parentId: uuid('parent_id').references((): AnyPgColumn => tags.id),
    // Seeds the search synonym dictionary (EPIC-C §4) as well as matching on input.
    synonyms: text('synonyms').array().notNull().default(sql`'{}'::text[]`),
    // INTERNAL ONLY — MeSH mapping for research-feed/literature interop (EPIC-I).
    // Never member-facing; deliberately not in any DTO.
    meshId: text('mesh_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
  },
  (t) => [
    index('tags_facet_idx').on(t.facet, t.sortOrder),
    // Sibling-scoped uniqueness: no two children of the same parent may share a name
    // (case-insensitive), but the same name may recur under different parents.
    uniqueIndex('tags_parent_name_unique').on(t.parentId, sql`lower(${t.name})`),
    // Top-level regions have a null parent, and Postgres treats NULLs as distinct in a
    // unique index — so this partial index keeps region names themselves unique.
    uniqueIndex('tags_root_name_unique')
      .on(sql`lower(${t.name})`)
      .where(sql`${t.parentId} is null`),
  ],
);

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

/**
 * The age bands a case discussion may use (EPIC-E §4, checklist item 3 — "age expressed
 * as a band", never a date of birth).
 *
 * Three bands, not the nine the mockup guessed at, and they are **clinical rather than
 * demographic**: Andrew Renshaw's review (2026-08-01) cut them to the boundaries that
 * change sports-medicine management — skeletal immaturity, adolescent growth, and the
 * adult presentation. Decade bands would have implied a precision the platform does not
 * want to carry and does not clinically need.
 *
 * A free-text age field does not exist anywhere in the composer, which is the point: this
 * is the structural half of de-identification, enforced by the form rather than trusted
 * to the checklist (EPIC-E §4's "structural" enforcement group).
 */
export const caseAgeBand = community.enum('case_age_band', ['child', 'youth', 'adult']);

/**
 * The structured case-discussion template (EPIC-E §2, PRD §6.2 as revised).
 *
 * Six fields, per Andrew Renshaw's clinical review (2026-08-01), replacing the PRD's
 * original nine: `relevant_history` and `subjective_findings` fold into the presenting
 * condition and its history, and `red_flags_considered` / `differential_diagnosis` /
 * `interventions_tried` / `response_to_treatment` collapse into the closing question —
 * a practitioner asking for help states what they tried and what it did as part of
 * asking. Fewer, larger fields get better answers than nine boxes half of which get
 * "n/a".
 *
 * 1:1 with a `posts` row of `type = case_discussion`, rather than overloading the generic
 * `title`/`body` columns, because the template is genuinely a set of distinct clinical
 * questions and rendering it needs to keep them distinct. `posts.title`/`posts.body` are
 * still populated for a case — derived from these fields at write time — so every list,
 * search and moderation surface built on EPIC-C keeps working without special-casing the
 * type. This table is the canonical copy; those two columns are a projection of it.
 */
export const caseDetails = community.table(
  'case_details',
  {
    postId: uuid('post_id')
      .primaryKey()
      .references(() => posts.id, { onDelete: 'cascade' }),
  ageBand: caseAgeBand('age_band').notNull(),
  /**
   * Days since onset — the structural replacement for checklist item 4's "no exact
   * treatment dates" (EPIC-E §4). An integer offset with no anchor date stored anywhere
   * means the composer has no field that can accept a calendar date at all.
   *
   * "Onset" rather than "injury": Andrew's review settled the open question of what the
   * timeline counts from, and overuse and gradual-onset presentations — a large share of
   * sports medicine — have no injury event to count from.
   */
    onsetDays: integer('onset_days').notNull(),
    presentingCondition: text('presenting_condition').notNull(),
    historyPresentingCondition: text('history_presenting_condition').notNull(),
    objectiveFindings: text('objective_findings').notNull(),
    communityQuestion: text('community_question').notNull(),
    /**
     * The checklist as the author has it ticked *so far* — `{ [itemKey]: true }`, working
     * state for a draft that hasn't been attested yet (EPIC-E §3 step 3).
     *
     * It lives server-side rather than in the browser for the reason EPIC-E §3 step 4
     * gives: attesting re-checks every live item here, so the gate is never the client's
     * word for it. A member can also close the composer half-way through and come back to
     * it. This column is mutable working state and is *not* the audit record — that is the
     * immutable snapshot written to `identity.case_attestations` at the moment of attest.
     */
    checklistState: jsonb('checklist_state')
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
  },
  (t) => [
    // Mirrors the DTO's bound rather than trusting it. A negative offset is nonsense, and
    // the upper bound (100 years) exists so a mis-entered *year* can't land here as a day
    // count and be rendered as a plausible-looking timeline.
    check('case_details_onset_days_range', sql`${t.onsetDays} between 0 and 36500`),
  ],
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
    // "My answers", newest first (Activity › My Q&A, screen E2). The post-scoped index
    // above can't serve it — a member's answers are scattered across every thread.
    index('comments_handle_idx').on(t.handleId, t.createdAt),
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

/**
 * What a report points at (EPIC-F §2). `handle` is deliberately a target alongside
 * `post`/`comment`: the zero-tolerance/anonymity rule anticipates reports about a pattern
 * of behaviour or an off-platform incident that has no single post to attach to — only a
 * handle. `target_id` is polymorphic (no FK, like `kudos`), validated in the service.
 */
export const reportTargetType = community.enum('report_target_type', ['post', 'comment', 'handle']);

/**
 * Report categories (EPIC-F §4). The two priority categories are the platform's two
 * founding guarantees — patient privacy and anonymity — and are settled; the three
 * non-priority categories are a working set flagged for Andrew's domain review.
 */
export const reportCategory = community.enum('report_category', [
  'identifiable_patient_information',
  'anonymity_violation',
  'harassment',
  'spam',
  'other',
]);

export const reportStatus = community.enum('report_status', ['open', 'actioned', 'dismissed']);

/**
 * A member's report of content or a handle (EPIC-F §2). Filed here (S11b); triaged and
 * actioned by the moderation queue (S11c). The queue operates entirely on `handle_id`s —
 * a report never carries real identity; that only surfaces via the separately-audited
 * reveal action (S11e).
 */
export const reports = community.table(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterHandleId: uuid('reporter_handle_id')
      .notNull()
      .references(() => handles.id),
    targetType: reportTargetType('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    category: reportCategory('category').notNull(),
    // The reporter's optional free-text context.
    comment: text('comment'),
    // Generated, not application-set: the priority tier is a pure function of the category
    // (EPIC-F §4), so deriving it in the column keeps the queue ordering honest even if a
    // future write path forgets to set it. Bare column name — a generated expression can't
    // reference the table object it's defined on (same as `posts.tsv`).
    priority: boolean('priority').generatedAlwaysAs(
      sql`category in ('identifiable_patient_information', 'anonymity_violation')`,
    ),
    status: reportStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The moderation queue's ordering (S11c, EPIC-F §4): open reports, priority tier
    // first, then oldest-first within each tier.
    index('reports_queue_idx').on(t.status, t.priority, t.createdAt),
    // "Open reports about this target" — used when actioning a report resolves the others.
    index('reports_target_idx').on(t.targetType, t.targetId),
  ],
);

/**
 * The full moderation action vocabulary (EPIC-F §3). All six values live here from the
 * start even though S11c only wields `remove_content` and `warn` — the enum is the shape
 * of the audit trail, and later slices (S11d suspend/expel/rename, S11f request_correction)
 * add only behaviour, not schema.
 */
export const moderationActionType = community.enum('moderation_action_type', [
  'remove_content',
  'warn',
  'suspend',
  'expel',
  'request_correction',
  'rename_handle',
]);

/**
 * The immutable moderation trail (EPIC-F §3, architecture §4.4). Every action — of any
 * type — writes exactly one row here, which is the record a member was actioned. Like the
 * other audit tables it becomes INSERT-only at the database-role level at the AWS migrate
 * step; the prove phase runs under one role.
 *
 * `report_id` is nullable: an action usually resolves a report, but a moderator may also
 * act proactively with no report attached (EPIC-F §2). `moderator_id` is the acting
 * admin's identity-side member id — the one place a `community` row references a real
 * member deliberately, since "who moderated" is not pseudonymous.
 */
export const moderationActions = community.table(
  'moderation_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id').references(() => reports.id),
    targetHandleId: uuid('target_handle_id')
      .notNull()
      .references(() => handles.id),
    actionType: moderationActionType('action_type').notNull(),
    moderatorId: uuid('moderator_id')
      .notNull()
      .references(() => members.id),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A handle's moderation history, newest first — the "has this handle been actioned
    // before?" read a reviewer needs, and what a warn/suspend escalation looks at.
    index('moderation_actions_target_idx').on(t.targetHandleId, t.createdAt),
  ],
);

/**
 * All five notification types (EPIC-G §5) ship in the enum from the start, though S10
 * only fires three: `reply`, `kudos_received`, and post-handle
 * `verification_status_change`. `mention` waits on EPIC-C's @mention parser and
 * `weekly_digest` on `community.follows` (EPIC-B §8) — neither is schema work, and
 * adding an enum value later costs a migration where carrying two unused labels costs
 * nothing. Same reasoning as `moderation_action_type` shipping all six values at S11c.
 */
export const notificationType = community.enum('notification_type', [
  'reply',
  'mention',
  'kudos_received',
  'verification_status_change',
  'weekly_digest',
]);

/**
 * A member's in-app notification (EPIC-G §2, architecture §4.2).
 *
 * Handle-scoped, which is the whole of the pre-handle asymmetry (EPIC-G §4): a
 * notification cannot exist for an applicant who has no handle, so the `pending` /
 * `needs_more_info` / `rejected` status emails have no row here and never will — the FK
 * is what makes that structural rather than a rule the write path is trusted to keep.
 *
 * `payload` is type-specific by design (§9): a `reply` carries the post and actor, a
 * `kudos_received` carries the target. The shapes are defined and documented alongside
 * the copy that renders them (`notifications/notification-copy.ts`) rather than pinned
 * here, since the store is indifferent to them.
 *
 * Rows are a log of what happened, not a mirror of current state: retracting kudos does
 * not delete the notification it caused. Deleting would let a member's unread count drop
 * while they are looking at it, to undo an event that genuinely occurred.
 */
export const notifications = community.table(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    handleId: uuid('handle_id')
      .notNull()
      .references(() => handles.id),
    type: notificationType('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    /**
     * The originating event, e.g. `reply:<commentId>`. A BullMQ job is retried on
     * failure, so without this a handler that dies between writing the row and
     * finishing its remaining work would write a second row on the retry. Paired with
     * `onConflictDoNothing`, it makes the whole handler idempotent — the retry sees no
     * inserted row and knows the work was already done.
     *
     * A side effect worth naming: re-awarding kudos after retracting it does not notify
     * a second time, because the key is the (target, giver) pair rather than the moment.
     * Deliberate — a retract/re-award loop is not an event worth repeating.
     *
     * Nullable because not every notification descends from a discrete event (the
     * weekly digest is periodic), and the unique index is partial to match.
     */
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The inbox read (E1): one member's notifications, newest first.
    index('notifications_handle_idx').on(t.handleId, t.createdAt.desc()),
    // The unread badge runs on every app-shell render, so it gets its own partial index
    // rather than counting across a member's whole history to find the few unread rows.
    index('notifications_unread_idx')
      .on(t.handleId)
      .where(sql`read_at is null`),
    uniqueIndex('notifications_dedupe_unique')
      .on(t.handleId, t.dedupeKey)
      .where(sql`dedupe_key is not null`),
  ],
);

/**
 * Per-type, per-channel delivery preferences (EPIC-G §6.1).
 *
 * **A missing row means the defaults apply** — in-app and email on, push off — and rows
 * are written only when a member changes something. The alternative (seeding a row per
 * handle × type) means every new notification type needs a backfill, and any handle
 * created between the migration and the backfill silently receives nothing. Defaults
 * belong in one place in the service, not in five rows per member.
 *
 * The CHECK is EPIC-G §6.1's one non-negotiable: `verification_status_change` email
 * cannot be disabled, because an account-status change is not engagement content to opt
 * out of. Enforced in the column rather than the controller for the same reason
 * `reports.priority` is a generated column — a later write path can forget a validation
 * rule, but it cannot forget a constraint.
 */
export const notificationPreferences = community.table(
  'notification_preferences',
  {
    handleId: uuid('handle_id')
      .notNull()
      .references(() => handles.id),
    type: notificationType('type').notNull(),
    inAppEnabled: boolean('in_app_enabled').notNull().default(true),
    emailEnabled: boolean('email_enabled').notNull().default(true),
    // Push ships inert (EPIC-G §6.2): the preference and its storage exist from day one
    // so switching the channel on is a config change, not a migration plus a UI change.
    // Default false — nothing is opted into a channel that currently delivers nothing.
    pushEnabled: boolean('push_enabled').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.handleId, t.type] }),
    check(
      'notification_preferences_verification_email_locked',
      sql`not (type = 'verification_status_change' and email_enabled = false)`,
    ),
  ],
);
