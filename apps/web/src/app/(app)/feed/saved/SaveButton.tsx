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
  block = false,
}: {
  articleId: string;
  initialSaved: boolean;
  /**
   * Fill the width of the container instead of hugging the label.
   *
   * The article page sets it, because there this is one half of a two-button row with "Read
   * full article" and the pair has to come out even. The saved list leaves it off: there the
   * control sits on its own under a card, and a full-width unsave button would read as the
   * main thing to do with an article you have just chosen to keep.
   */
  block?: boolean;
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
    <div
      className={`flex flex-col${block ? ' min-w-0 flex-1' : ''}`}
      style={{ gap: 'var(--space-1)' }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        // py-3 rather than py-2: at this font size that is the difference between a 36px
        // target and the 44px the style guide requires (§9). It also matches the height of
        // the link it now sits beside.
        className={`flex items-center border px-3 py-3 text-sm font-medium ${
          block ? 'w-full justify-center' : 'w-fit'
        }`}
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
