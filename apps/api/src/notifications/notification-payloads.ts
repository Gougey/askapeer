/**
 * The per-type `community.notifications.payload` shapes (EPIC-G §9, which asks for these
 * to be documented wherever the rendering lives rather than pinned in the schema — the
 * store is indifferent to them, the client is not).
 *
 * Two rules govern what may go in here, and both come from the payload discipline in
 * EPIC-G §6.2:
 *
 * 1. **Handle-attributed only.** A payload names handles, never members. The service has
 *    no route to a real name anyway, and it must stay that way as this file grows.
 * 2. **Push copy is generated, never quoted.** Anything textual below (`postTitle`,
 *    `snippet`) is for the authenticated in-app inbox only. When the push channel is
 *    switched on, its copy is built from the *type* alone — "New reply on your post" —
 *    because a push body can surface on a lock screen, where even de-identified case
 *    discussion text does not belong.
 */

/**
 * The types S10 actually fires, and therefore the only ones the preferences screen
 * offers. `mention` and `weekly_digest` exist in the database enum but wait on EPIC-C's
 * parser and `community.follows` respectively — a toggle for a notification that cannot
 * arrive is worse than no toggle. Adding one later is adding it to this array.
 */
export const LIVE_NOTIFICATION_TYPES = [
  'reply',
  'kudos_received',
  'verification_status_change',
] as const;

export type LiveNotificationType = (typeof LIVE_NOTIFICATION_TYPES)[number];

/** Cap on the stored reply preview. Enough to know whether to open it, no more. */
export const SNIPPET_LENGTH = 120;

/** Someone answered your question, or replied to your answer. */
export type ReplyPayload = {
  postId: string;
  postTitle: string;
  commentId: string;
  /** The replier. A reply is publicly attributed in the thread, so naming them here
   *  discloses nothing the thread does not already show. */
  actorHandleName: string;
  snippet: string;
};

/**
 * Your post or answer received kudos.
 *
 * **The giver is deliberately not named.** Nothing in the product exposes who awarded
 * kudos — the thread DTO carries counts and the viewer's own `hasKudosed`, nothing more
 * — so naming them here would introduce a disclosure by way of an implementation detail,
 * and would make reciprocal kudos-trading legible in a way that corrodes the one merit
 * signal the platform has. If this is ever wanted, it is a product decision, not a
 * payload change.
 */
export type KudosReceivedPayload = {
  targetType: 'post' | 'comment';
  /** Always the thread to open — a comment's kudos deep-links to its post. */
  postId: string;
  postTitle: string;
};

/**
 * An account-status notice: a verification decision, or one of EPIC-F's member-affecting
 * moderation actions.
 *
 * These share the `verification_status_change` type rather than getting one of their own,
 * because §6.1 already defines that type as covering "account-status events (verification
 * decisions, and — via EPIC-F — suspension/expulsion notices)". The `event` discriminator
 * is what the copy switches on.
 *
 * This is the type whose email cannot be disabled, and that is doing real work here: a
 * suspended member cannot reach the in-app inbox at all — the access gate stops them at
 * the holding page — so email is the only channel that can tell them why. The locked
 * channel and the case that needs it are the same design.
 */
export type AccountNoticePayload = {
  event: 'verification' | 'warned' | 'suspended' | 'expelled' | 'handle_renamed';
  /** Verification only — the status transitioned to. */
  status?: string;
  /** The moderator's or system's stated reason, where one was given. */
  reason?: string | null;
  /** `handle_renamed` only — what the handle is now. */
  newHandleName?: string;
};

export type NotificationPayload = ReplyPayload | KudosReceivedPayload | AccountNoticePayload;

/** Trim a body to a preview without slicing a word in half. */
export function toSnippet(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= SNIPPET_LENGTH) return flat;
  const cut = flat.slice(0, SNIPPET_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > SNIPPET_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
