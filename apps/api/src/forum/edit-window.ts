/**
 * When may an author still change what they wrote?
 *
 * Andrew asked for editing after testing — *"is there an option to edit your replies and
 * posts to correct spelling errors?"* — and suggested ten minutes. The rule we settled on is
 * narrower in the way that matters and looser in the way that helps:
 *
 * > **Until something has responded to it, and never more than 24 hours.**
 *
 * The engagement half is the real gate. A post that has been kudosed, answered or reported is
 * a post other people have acted on: the kudos endorses *that* text, the answer replies to
 * *that* question, the report accuses *that* wording. Letting the author rewrite it
 * afterwards makes all three into claims about something that no longer exists — and on a
 * pseudonymous network, where a member's standing is built entirely from kudos on specific
 * contributions, that is not a small thing.
 *
 * Before anything has responded, none of that applies. Nobody has relied on the text, so
 * correcting a typo changes nothing for anyone.
 *
 * The 24-hour half is the backstop for the case engagement cannot see: a post can be *read*
 * many times without being kudosed, answered or reported, and an unanswered question left
 * editable indefinitely is a question that can silently become a different question weeks
 * later. Reading leaves no trace we can gate on, so time stands in for it.
 *
 * Both halves are necessary and neither is sufficient: whichever expires first closes the
 * window.
 */
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Why an edit was refused — the client shows the reason rather than a bare 403. */
export type EditRefusal = 'not_author' | 'window_closed' | 'has_engagement' | 'not_editable';

export function withinEditWindow(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < EDIT_WINDOW_MS;
}

/**
 * The whole rule in one place, so the `canEdit` the API advertises and the check it enforces
 * can never disagree. The client renders the affordance from `canEdit`; this is what makes
 * that safe, because the answer is computed once and used for both.
 */
export function editRefusal(input: {
  isAuthor: boolean;
  createdAt: Date;
  hasEngagement: boolean;
  /** A removed comment, or a case discussion, is not editable by this route at all. */
  editable: boolean;
  now?: Date;
}): EditRefusal | null {
  if (!input.editable) return 'not_editable';
  if (!input.isAuthor) return 'not_author';
  if (input.hasEngagement) return 'has_engagement';
  if (!withinEditWindow(input.createdAt, input.now)) return 'window_closed';
  return null;
}

/**
 * What to tell the member. Each says what closed the window and, where there is one, what to
 * do instead — a refusal that only says "no" invites the same attempt again.
 */
export const EDIT_REFUSAL_MESSAGE: Record<EditRefusal, string> = {
  not_author: 'You can only edit your own contributions.',
  window_closed: 'Edits are only possible for 24 hours after posting.',
  has_engagement:
    'Someone has already responded to this, so it can no longer be edited. Add a reply with the correction instead.',
  not_editable:
    'This cannot be edited here. A case discussion is revised through the correction loop, which takes a fresh attestation.',
};
