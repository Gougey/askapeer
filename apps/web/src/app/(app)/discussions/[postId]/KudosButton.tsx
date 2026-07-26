'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toggleKudosAction } from './actions';

/**
 * The kudos toggle — the platform's one merit control. Optimistic: it flips on click so
 * the tap feels instant, then reconciles with the server's authoritative count. The
 * server is idempotent, so a stale or double click can't corrupt the total.
 *
 * Rendered only for content the viewer didn't author; own content shows a static count
 * (a handle can't kudos itself — the "ideas win on merit" guarantee).
 */
export function KudosButton({
  target,
  targetId,
  initialCount,
  initialHasKudosed,
}: {
  target: 'post' | 'comment';
  targetId: string;
  initialCount: number;
  initialHasKudosed: boolean;
}) {
  const t = useTranslations('discussions');
  const [count, setCount] = useState(initialCount);
  const [kudosed, setKudosed] = useState(initialHasKudosed);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const wasKudosed = kudosed;
    // Optimistic flip.
    setKudosed(!wasKudosed);
    setCount((c) => c + (wasKudosed ? -1 : 1));
    startTransition(async () => {
      try {
        const result = await toggleKudosAction(target, targetId, wasKudosed);
        setKudosed(result.hasKudosed);
        setCount(result.kudosCount);
      } catch {
        // Roll back to where we started if the server rejected it.
        setKudosed(wasKudosed);
        setCount((c) => c + (wasKudosed ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={kudosed}
      aria-label={t('kudosAction')}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
      style={{
        // Kudos gold is the product's one status colour (style guide §2.1) — so the
        // kudos control reads gold in both states: outline star before you act, filled
        // star + gold tint once you have. Never navy; that would introduce a second signal.
        borderColor: kudosed ? 'var(--color-kudos)' : 'var(--color-border-strong)',
        color: kudosed ? 'var(--color-kudos-text)' : 'var(--color-muted)',
        background: kudosed ? 'var(--color-kudos-tint)' : 'transparent',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-[15px]"
        style={{ color: 'var(--color-kudos)' }}
        fill={kudosed ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={kudosed ? 0 : 1.6}
      >
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
      </svg>
      <span>{t('kudos', { count })}</span>
    </button>
  );
}
