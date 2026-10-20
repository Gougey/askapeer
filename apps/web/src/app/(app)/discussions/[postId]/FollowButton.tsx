'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { STAT_COLOUR, StatIcon } from '@/components/StatIcons';
import { toggleFollowAction } from './actions';

/**
 * Follow a discussion (S15, screen C4).
 *
 * **Now the same pill as Insightful and Useful, beside them** (Option B, 20 October 2026):
 * the eye, the count and the word — "3 Follow", then "3 Following" tinted in the follows
 * colour. It used to sit on a row of its own, text only, partly because a gold star and a
 * bell beside each other looked busy; with every stat now drawn the same way, three pills in
 * a row read as one family. At a 390px screen they fit on one line, and only when all three
 * reach three digits does Follow wrap to a second.
 *
 * The word still carries the state, which satisfies §9.2 on its own: "Follow" and "Following"
 * are different words, not the same word in two colours.
 *
 * **The count is the card's eye**: people watching who have not answered (`watcherCount`). So
 * the caller's own toggle only moves it when they would be counted in it — not as the author,
 * and not once they have answered (`countsMe`).
 *
 * Optimistic: it flips on tap and rolls back if the server refuses. Both directions are
 * idempotent, so a stale click cannot wedge the state.
 *
 * A thread you wrote in opens already following. That is not a quirk — it is the control's
 * first job, since muting your own noisy question is the thing members could not do at all
 * before this existed.
 */
export function FollowButton({
  postId,
  initialFollowing,
  initialCount,
  countsMe,
}: {
  postId: string;
  initialFollowing: boolean;
  initialCount: number;
  /** Would the caller's own follow appear in `initialCount`? See above. */
  countsMe: boolean;
}) {
  const t = useTranslations('discussions');
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const colour = STAT_COLOUR.follows;

  function toggle() {
    const wasFollowing = following;
    const step = countsMe ? 1 : 0;
    setFollowing(!wasFollowing);
    setCount((c) => Math.max(0, c + (wasFollowing ? -step : step)));
    startTransition(async () => {
      try {
        await toggleFollowAction(postId, wasFollowing);
      } catch {
        setFollowing(wasFollowing);
        setCount((c) => Math.max(0, c + (wasFollowing ? step : -step)));
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
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
      style={{
        borderColor: following ? colour.fg : 'var(--color-border-strong)',
        background: following ? colour.tint : 'transparent',
        color: following ? colour.fg : 'var(--color-muted)',
      }}
    >
      <span style={{ color: following || count > 0 ? colour.fg : 'var(--color-muted)' }}>
        <StatIcon kind="follows" className="size-[15px]" />
      </span>
      {t(following ? 'followButtonOn' : 'followButtonOff', { count })}
    </button>
  );
}
