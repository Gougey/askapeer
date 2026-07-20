import { sql } from 'drizzle-orm';
import { jsonb, pgSchema, text, timestamp, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';

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
  ],
);

/** One-time magic-link tokens for passwordless sign-in (architecture §5.2). */
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
