import { sql } from 'drizzle-orm';
import {
  inet,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * The `identity` schema (EPIC-A) — real, personally-identifying data. In production
 * this schema gets restricted per-role grants (architecture spec §4.1); only
 * IdentityService / NotificationService / BillingService roles may read it. For the
 * prove phase everything runs under one role; the boundary lands at the migrate step.
 */
export const identity = pgSchema('identity');

export const professionalBody = identity.enum('professional_body', [
  'hcpc',
  'gmc',
  'basrat',
  'sst',
]);

export const verificationStatus = identity.enum('verification_status', [
  'pending',
  'needs_more_info',
  'approved_verified',
  'rejected',
  'suspended',
  'expelled',
]);

export const members = identity.table(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legalName: text('legal_name').notNull(),
    email: text('email').notNull().unique(),
    professionalBody: professionalBody('professional_body').notNull(),
    registrationNumber: text('registration_number').notNull(),
    registrationCountry: text('registration_country').notNull().default('UK'),
    verificationStatus: verificationStatus('verification_status').notNull().default('pending'),
    statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Set when an admin routes the applicant to `needs_more_info` (EPIC-A §4); surfaced
    // on the holding page so they know what to provide.
    needsMoreInfoReason: text('needs_more_info_reason'),
    // Recorded at onboarding (A7), gap G-13. Nullable until the member acknowledges.
    anonymityAcknowledgedAt: timestamp('anonymity_acknowledged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One real-world registration backs at most one non-rejected account (EPIC-A §2).
    uniqueIndex('members_registration_unique')
      .on(t.professionalBody, t.registrationNumber, t.registrationCountry)
      .where(sql`${t.verificationStatus} <> 'rejected'`),
    /*
     * One address is one account, whatever it was typed in.
     *
     * The column's own `.unique()` is byte-wise, so `Ade@x.com` and `ade@x.com` are two
     * different accounts to it — for one person, with one inbox. The DTOs lower-case
     * every email on the way in (`NormaliseEmail`), and this index is what makes that
     * hold even if some future route forgets to.
     */
    uniqueIndex('members_email_lower_unique').on(sql`lower(${t.email})`),
  ],
);

/** One-time magic-link tokens for passwordless sign-in (architecture §5.2). */
/**
 * The email-only projection of `identity.members` (EPIC-G §3).
 *
 * `NotificationService` needs one column from the identity schema — `email`, to send mail
 * — and must never read `legal_name`. Every template addresses a member by their handle,
 * even though the service technically has the rows to do otherwise.
 *
 * The view exists so that becomes a **permission** rather than a promise: at the AWS
 * migrate step, when per-role grants land (architecture spec §4.1), the notification
 * role is granted on this view and **not** on `identity.members`, and a query selecting
 * `legal_name` fails at the database rather than in review. Under the prove phase's
 * single role it provides no enforcement on its own — but reading through it now means
 * the hardening is a grant, not a refactor, and nothing new accretes a direct
 * `members` read in the meantime.
 */
export const memberEmails = identity
  .view('member_emails', {
    memberId: uuid('member_id').notNull(),
    email: text('email').notNull(),
  })
  // Declared, not generated: the DDL is hand-authored in the migration alongside the
  // grant comment it belongs with, since the point of this view is a permission boundary
  // rather than a shape.
  .existing();

export const emailSuppressionKind = identity.enum('email_suppression_kind', [
  'hard_bounce',
  'spam_complaint',
  'manual',
]);

/**
 * Addresses we must stop mailing (fed by the Postmark bounce/complaint webhook).
 *
 * **Deliberately not a notification preference.** The obvious-looking implementation is to
 * set `email_enabled = false` on the member's preferences, and it is wrong twice over:
 * a CHECK constraint forbids disabling the account-status email (EPIC-G §6.1), and it
 * would be a lie about what happened — the member has not opted out of anything. Their
 * address is broken, which is a fact about delivery, not about their wishes. Keeping the
 * two separate means that if the address is fixed, mail resumes without having to guess
 * which preferences were theirs and which were ours.
 *
 * Keyed by **email, not member id**: a bounce tells us about an address. It may belong to
 * no member, or to a member who has since changed it, and either way the address is what
 * we must not send to.
 *
 * `cleared_at` rather than a delete, so a re-suppression can see it happened before —
 * a repeatedly bouncing address is a different conversation from a one-off.
 */
export const emailSuppressions = identity.table(
  'email_suppressions',
  {
    email: text('email').primaryKey(),
    kind: emailSuppressionKind('kind').notNull(),
    /** The provider's own description, kept verbatim for diagnosis. */
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    clearedAt: timestamp('cleared_at', { withTimezone: true }),
  },
  (t) => [
    // "What is currently suppressed, newest first" — the review list.
    index('email_suppressions_active_idx').on(t.createdAt).where(sql`cleared_at is null`),
  ],
);

export const magicLinks = identity.table('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Rotating refresh tokens (opaque, stored hashed). Access tokens are short-lived JWTs. */
export const refreshTokens = identity.table('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceType = identity.enum('evidence_type', [
  'register_lookup',
  'onfido_check',
  'manual_document',
]);

export const evidenceOutcome = identity.enum('evidence_outcome', ['pass', 'fail', 'needs_review']);

/**
 * What the automated checks found (EPIC-A §2). One row per check attempt — a resubmit
 * (§12.1) writes new rows rather than overwriting, so the evidence trail is complete.
 * `raw_result` may embed applicant document data, hence `identity` schema (§9).
 */
export const verificationEvidence = identity.table(
  'verification_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    evidenceType: evidenceType('evidence_type').notNull(),
    source: text('source').notNull(),
    rawResult: jsonb('raw_result').notNull(),
    outcome: evidenceOutcome('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_evidence_member_idx').on(t.memberId, t.createdAt)],
);

/**
 * Immutable audit of every status transition (EPIC-A §3). No `verification_status`
 * change is ever written without a row here, in the same transaction — that is what
 * makes the trail authoritative rather than incidental. INSERT-only grant in production.
 */
export const verificationDecisions = identity.table(
  'verification_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status').notNull(),
    toStatus: text('to_status').notNull(),
    decidedBy: text('decided_by').notNull(), // 'system' or an admin's member_id
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_decisions_member_idx').on(t.memberId, t.createdAt)],
);

export const identityCheckState = identity.enum('identity_check_state', [
  'awaiting_capture',
  'complete',
  'timed_out',
]);

/**
 * An in-flight identity-document check (EPIC-A §5 step B). Provider-agnostic: holds
 * whatever reference the provider uses to correlate its async callback back to us
 * (`provider_ref` — an Onfido check id in production, a simulated id until then).
 *
 * This table is the reason the async webhook path is real even while the provider is
 * simulated: the worker creates a session, stops, and only resumes when a callback
 * arrives against `provider_ref` (or the timeout job fires).
 */
export const identityCheckSessions = identity.table(
  'identity_check_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'simulated' | 'onfido'
    providerRef: text('provider_ref').notNull().unique(),
    state: identityCheckState('state').notNull().default('awaiting_capture'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('identity_check_sessions_member_idx').on(t.memberId, t.createdAt)],
);

/**
 * Blocked registration attempts that matched an `expelled` member (EPIC-A §2). The
 * applicant sees the same generic 409 as any duplicate — this log exists so admins
 * can see the pattern the applicant is deliberately not told about. INSERT-only.
 */
export const reapplicationAttempts = identity.table('reapplication_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchedMemberId: uuid('matched_member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  attemptedLegalName: text('attempted_legal_name').notNull(),
  attemptedEmail: text('attempted_email').notNull(),
  professionalBody: professionalBody('professional_body').notNull(),
  registrationNumber: text('registration_number').notNull(),
  registrationCountry: text('registration_country').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const identityAccessReason = identity.enum('identity_access_reason', [
  'reported_violation',
  'legal_request',
  'safety_escalation',
]);

/**
 * Every moderator access to a member's real identity (EPIC-F §5, architecture §4.1). The
 * pseudonymity guarantee is that linking a handle to a real person is a distinct, logged
 * act — never implicit in reading a report — so this row is written *before* the identity
 * is ever returned. INSERT-only grant in production.
 *
 * `handle_id` is the community handle the reveal was triggered from, stored as a bare uuid
 * with no cross-schema FK: `identity` must not depend on `community` (that would make the
 * schema import circular), and the `member_id` FK is the one that carries the meaning.
 */
export const identityAccessLog = identity.table(
  'identity_access_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    handleId: uuid('handle_id').notNull(),
    accessedBy: uuid('accessed_by')
      .notNull()
      .references(() => members.id),
    reasonCode: identityAccessReason('reason_code').notNull(),
    reasonNote: text('reason_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('identity_access_log_member_idx').on(t.memberId, t.createdAt)],
);

/**
 * A member's attestation that a case discussion is de-identified (EPIC-E §5, PRD §10.3,
 * architecture §4.3 — "the deliberate exception" where identity and community data join).
 *
 * This table is why the attestation is worth anything. Everything else a member does is
 * attributed to their handle; this one act is bound to their **verified legal identity**,
 * because the promise being made ("I have de-identified this, and I understand a breach
 * may be referred to my regulator") is a professional undertaking and a pseudonymous one
 * would be unenforceable. That is also why it lives in `identity` rather than next to
 * `case_details` in `community`.
 *
 * `post_id` is a bare uuid with no cross-schema FK, for the same reason
 * `identity_access_log.handle_id` is: `identity` must not depend on `community` or the
 * schema imports go circular. `member_id` is the FK that carries the meaning.
 *
 * INSERT-only, like every other audit record in this schema (PRD §9.4 — immutable). A
 * `needs_correction` post that is re-attested writes a **second row**; the first is never
 * updated or deleted, so the history of what was attested, and when, stays complete.
 */
export const caseAttestations = identity.table(
  'case_attestations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    postId: uuid('post_id').notNull(),
    /** The exact wording shown, stored verbatim — a later policy edit must not rewrite
     *  what this member was asked to agree to. */
    attestationText: text('attestation_text').notNull(),
    /** The checklist as it stood at this moment: `[{ key, label, confirmed }]`. Snapshotted
     *  rather than referenced so the record stays self-contained when the checklist's own
     *  wording changes, and so the six-item (text-only) era is still legible once images
     *  restore items 6 and 7 (EPIC-E §4). */
    checklistSnapshot: jsonb('checklist_snapshot')
      .$type<{ key: string; label: string; confirmed: boolean }[]>()
      .notNull(),
    attestedAt: timestamp('attested_at', { withTimezone: true }).notNull().defaultNow(),
    /** Evidential, per architecture §4.3. Nullable: behind a proxy it can be absent, and a
     *  missing address must not be a reason to refuse an otherwise valid attestation. */
    ipAddress: inet('ip_address'),
  },
  (t) => [
    index('case_attestations_post_idx').on(t.postId, t.attestedAt),
    index('case_attestations_member_idx').on(t.memberId, t.attestedAt),
  ],
);
