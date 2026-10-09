'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setSavedAction } from './actions';

/**
 * The save toggle.
 *
 * **Optimistic, because the answer is never in doubt.** Saving is a private write with no
 * server-side rule that can refuse it — the only failure is the network — so flipping on press
 * and reverting on error reads better than a spinner for something that feels instant.
 *
 * ⚠️ **The accessible name states the action, not the state**, and `aria-pressed` carries the
 * state. "Save" / "Saved" alone would leave a screen-reader user unsure whether they had just
 * read a label or a confirmation.
 */
export function SaveButton({
  articleId,
  initialSaved,
}: {
  articleId: string;
  initialSaved: boolean;
}) {
  const t = useTranslations('feed');
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    setError(null);
    startTransition(async () => {
      const result = await setSavedAction(articleId, next);
      setSaved(result.saved);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className="flex w-fit items-center border px-3 py-2 text-sm font-medium"
        style={{
          gap: 'var(--space-2)',
          borderRadius: 'var(--radius)',
          borderColor: saved ? 'var(--color-accent)' : 'var(--color-border-strong)',
          color: 'var(--color-accent)',
          background: saved ? 'var(--color-navy-tint)' : 'transparent',
        }}
      >
        {/* Filled when saved, outlined when not — the one glyph carries the state visually. */}
        <span aria-hidden="true">{saved ? '★' : '☆'}</span>
        {saved ? t('savedLabel') : t('saveLabel')}
      </button>
      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
