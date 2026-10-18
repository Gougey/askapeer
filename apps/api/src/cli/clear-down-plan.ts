/**
 * What the pilot clear-down empties and what it keeps — the pure half, pinned by
 * `npm run verify:pilot -w apps/api`.
 *
 * Decided with Adrian, 2026-10-17: before Andrew's colleagues arrive, every member and
 * everything they made goes; the research corpus and the platform's own configuration stay.
 * All member data to date was the founders' and the seeded demo's — test data — and the
 * backup taken before the run keeps it recoverable, including the audit logs that policy
 * otherwise treats as immutable.
 */

/** Schemas the clear-down reasons about. A table anywhere else is out of its scope. */
export const SCHEMAS = ['identity', 'community', 'research', 'config'] as const;

/**
 * Emptied. Every member, every handle, everything a handle made, and every record about them.
 *
 * - `identity.*` — accounts, sign-in links and tokens, verification evidence and decisions,
 *   identity-access and reapplication logs, case attestations, and email suppressions (whose
 *   rows are mostly the demo's unresolvable addresses).
 * - `community.*` except the vocabulary — posts, answers, kudos, follows, notifications,
 *   reports and moderation actions, saved criteria and interests.
 * - `research.saved_articles` — a member's reading list, keyed on a handle that will not exist.
 */
export const CLEAR = [
  'identity.case_attestations',
  'identity.email_suppressions',
  'identity.identity_access_log',
  'identity.identity_check_sessions',
  'identity.magic_links',
  'identity.members',
  'identity.reapplication_attempts',
  'identity.refresh_tokens',
  'identity.verification_decisions',
  'identity.verification_evidence',
  'community.case_details',
  'community.comments',
  'community.feed_preferences',
  'community.follows',
  'community.handle_name_history',
  'community.handles',
  'community.kudos',
  'community.member_interests',
  'community.moderation_actions',
  'community.notification_preferences',
  'community.notifications',
  'community.post_tags',
  'community.posts',
  'community.reports',
  'research.saved_articles',
] as const;

/**
 * Kept. The literature and everything that makes it findable, the clinical vocabulary, and the
 * platform's configuration — including the invitation list itself, so it can be imported before
 * the clear-down as well as after.
 *
 * `config.admin_audit_log` stays: it is the record of every taxonomy edit, which is about the
 * vocabulary we are keeping. Its `actor_member_id` will point at member ids that no longer exist
 * (it has no foreign key, deliberately — an audit row must outlive its subject).
 */
export const KEEP = [
  'community.categories',
  'community.tags',
  'config.admin_audit_log',
  'config.app_meta',
  'config.handle_blocklist',
  'config.pilot_allowlist',
  'config.settings',
  'research.article_tags',
  'research.articles',
  'research.backfill_slices',
  'research.ingestion_cursors',
  'research.reclassify_state',
  // A materialised view, listed so the guard below recognises it.
  'research.spelling_dictionary',
] as const;

/** Background queues whose jobs are only ever about members, so they go with them. */
export const QUEUES_TO_EMPTY = ['verification', 'notifications'] as const;
/** Redis keys that cache member data. `rl:*` (rate limits) expire on their own. */
export const REDIS_PATTERNS = ['kudos:*'] as const;

/**
 * ⚠️ **Refuse to run against a schema we have not read.** A table added after this was written
 * is neither cleared nor knowingly kept, and either mistake is silent — a new member table
 * left full, or a new research table emptied. Any table in scope that is on neither list, or a
 * listed table that no longer exists, stops the run until this file is updated.
 */
export function unclassified(present: readonly string[]): { unknown: string[]; missing: string[] } {
  const listed = new Set<string>([...CLEAR, ...KEEP]);
  const here = new Set(present);
  return {
    unknown: present.filter((t) => !listed.has(t)).sort(),
    missing: [...listed].filter((t) => !here.has(t)).sort(),
  };
}
