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
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs disabled:opacity-60"
      style={{
        borderColor: kudosed ? 'var(--color-accent)' : 'var(--color-muted)',
        color: kudosed ? 'var(--color-accent)' : 'var(--color-fg)',
        background: kudosed ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
      }}
    >
      <span aria-hidden>👏</span>
      <span>{t('kudos', { count })}</span>
    </button>
  );
}
