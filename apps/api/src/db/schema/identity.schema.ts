import { sql } from 'drizzle-orm';
import { pgSchema, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

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
