'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { STAT_COLOUR, StatIcon } from '@/components/StatIcons';
import { toggleKudosAction } from './actions';

type Kind = 'insightful' | 'useful';

/**
 * One kind of kudos, as a button inside a discussion: icon, count and name — "6 Insightful",
 * "11 Useful" (Option B, 20 October 2026). The name is spelled out here, and only here,
 * because this is where a member chooses between the two; on the card the icons are enough.
 *
 * Three looks. Not awarded by you: grey outline, the icon in its colour once anyone has
 * awarded it. Awarded by you: tinted in its colour. Your own post: the same pill, but not a
 * button (`own`), since a handle cannot award itself.
 *
 * Optimistic, like the star it replaces: the count moves on tap and the server's answer then
 * replaces the guess, or the tap is undone if the call fails.
 */
export function AwardButton({
  kind,
  target,
  targetId,
  initialCount,
  initialAwarded,
  own = false,
}: {
  kind: Kind;
  /** Answers only (21 October 2026): questions are recognised by Follow, not awards. */
  target: 'comment';
  targetId: string;
  initialCount: number;
  initialAwarded: boolean;
  own?: boolean;
}) {
  const t = useTranslations('discussions');
  const [count, setCount] = useState(initialCount);
  const [awarded, setAwarded] = useState(initialAwarded);
  const [pending, startTransition] = useTransition();
  const colour = STAT_COLOUR[kind];
  const label = t(kind === 'insightful' ? 'insightfulButton' : 'usefulButton', { count });

  if (own) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
        style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-muted)' }}
      >
        <span style={{ color: count > 0 ? colour.fg : 'var(--color-muted)' }}>
          <StatIcon kind={kind} className="size-[15px]" />
        </span>
        {label}
      </span>
    );
  }

  function toggle() {
    const was = awarded;
    setAwarded(!was);
    setCount((c) => c + (was ? -1 : 1));
    startTransition(async () => {
      try {
        const result = await toggleKudosAction(target, targetId, kind, was);
        setAwarded(kind === 'insightful' ? result.hasInsightful : result.hasUseful);
        setCount(kind === 'insightful' ? result.insightfulCount : result.usefulCount);
      } catch {
        setAwarded(was);
        setCount((c) => c + (was ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={awarded}
      aria-label={`${t(kind === 'insightful' ? 'insightfulAction' : 'usefulAction')} — ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
      style={{
        borderColor: awarded ? colour.fg : 'var(--color-border-strong)',
        color: awarded ? colour.fg : 'var(--color-muted)',
        background: awarded ? colour.tint : 'transparent',
      }}
    >
      <span style={{ color: awarded || count > 0 ? colour.fg : 'var(--color-muted)' }}>
        <StatIcon kind={kind} className="size-[15px]" />
      </span>
      {label}
    </button>
  );
}
