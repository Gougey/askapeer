'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toggleFollowAction } from './actions';

/**
 * Follow a discussion (S15, screen C4).
 *
 * The bell is the Activity tab's own glyph, reused deliberately: this control routes later
 * replies to that tab, and borrowing the icon says so without a sentence of explanation.
 * Line icon, `stroke-width: 2` per style guide §6.1 — the filled kudos star is the only
 * exception to that rule, and this is emphatically not kudos, so it never uses gold.
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
      className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium"
      style={{
        borderRadius: 'var(--radius-pill)',
        borderColor: following ? 'var(--color-accent)' : 'var(--color-border-strong)',
        background: following ? 'var(--color-navy-tint)' : 'transparent',
        color: following ? 'var(--color-accent)' : 'var(--color-muted)',
        opacity: pending ? 0.6 : 1,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-[15px]"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        {/* Struck through when off, so the state is not carried by colour alone (§9.2). */}
        {!following && <path d="M3 3l18 18" />}
      </svg>
      {following ? t('following.on') : t('following.off')}
    </button>
  );
}
