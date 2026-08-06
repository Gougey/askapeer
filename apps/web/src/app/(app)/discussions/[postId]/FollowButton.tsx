'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toggleFollowAction } from './actions';

/**
 * Follow a discussion (S15, screen C4).
 *
 * **Text only.** It carried the Activity tab's bell, on the reasoning that borrowing the
 * glyph said where the replies would arrive — but the row already holds the gold kudos star,
 * and a second glyph beside it made a plain two-state toggle look busier than it is. The
 * words do the whole job.
 *
 * That also means the label is what carries the state, which satisfies §9.2 on its own:
 * "Follow" and "Following" are different words, not the same word in two colours. Nothing
 * here relies on the fill or the border to be legible.
 *
 * The label names its **object** — "Follow discussion", not "Follow" — because following a
 * *handle* is S7's, and the two will eventually sit in the same product. A bare "Follow"
 * would be ambiguous the moment that lands, and the ambiguity would be worst on a profile,
 * where both could plausibly appear.
 *
 * Never gold in either state — this is not kudos, and kudos gold is the product's one
 * status colour.
 *
 * Optimistic, like the kudos toggle beside it: it flips on tap and rolls back if the
 * server refuses. Both directions are idempotent, so a stale click cannot wedge the state.
 *
 * A thread you wrote in opens already following. That is not a quirk — it is the control's
 * first job, since muting your own noisy question is the thing members could not do at all
 * before this existed.
 */
export function FollowButton({
  postId,
  initialFollowing,
}: {
  postId: string;
  initialFollowing: boolean;
}) {
  const t = useTranslations('discussions');
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    startTransition(async () => {
      try {
        await toggleFollowAction(postId, wasFollowing);
      } catch {
        setFollowing(wasFollowing);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      // The visible label has to survive a 390px row, so the fuller meaning rides on the
      // accessible name instead of being squeezed into two words on screen.
      aria-label={following ? t('following.ariaOn') : t('following.ariaOff')}
      className="inline-flex items-center border px-3 py-1.5 text-xs font-medium"
      style={{
        borderRadius: 'var(--radius-pill)',
        borderColor: following ? 'var(--color-accent)' : 'var(--color-border-strong)',
        background: following ? 'var(--color-navy-tint)' : 'transparent',
        color: following ? 'var(--color-accent)' : 'var(--color-muted)',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {following ? t('following.on') : t('following.off')}
    </button>
  );
}
