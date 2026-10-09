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
  variant = 'block',
}: {
  articleId: string;
  initialSaved: boolean;
  /**
   * Where it is being rendered.
   *
   * - `block` — the foot of the article page, one half of a row with "Read full article".
   * - `compact` — the top row of a results card, beside the evidence pill.
   *
   * Two variants rather than a set of size and width flags: these are the only two places it
   * appears, and a flag per axis invites a third combination that nobody has designed.
   */
  variant?: 'block' | 'compact';
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

  const compact = variant === 'compact';

  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      // `title` is the only place a compact button can show what went wrong; see `error` below.
      title={compact ? (error ?? undefined) : undefined}
      className={
        compact
          ? /*
             * A pill at the scale of the evidence chip beside it — 24px of visual.
             *
             * ⚠️ **`relative z-10` is load-bearing**, not styling: the card's link stretches a
             * pseudo-element over the whole card, and without a stacking context above it this
             * button would be covered and every press would open the article instead.
             *
             * ⚠️ **The hit area is taken out to 44px by `before:-inset-2.5`.** The guide asks
             * for 44×44 "even when the visual is smaller" (§9). Making the *visual* 44 was the
             * obvious alternative and it costs 24px on every card in an infinite list, which is
             * the wrong thing to spend on a secondary control.
             */
            'relative z-10 flex shrink-0 items-center border px-2 py-1 text-xs font-medium' +
            " before:absolute before:-inset-2.5 before:content-['']"
          : // py-3 rather than py-2: at this font size that is the difference between a 36px
            // target and the 44px the guide requires, and it matches the link beside it.
            'flex w-full items-center justify-center border px-3 py-3 text-sm font-medium'
      }
      style={{
        gap: compact ? 'var(--space-1)' : 'var(--space-2)',
        borderRadius: compact ? 'var(--radius-pill)' : 'var(--radius)',
        color: 'var(--color-accent)',
        borderColor: saved ? 'var(--color-accent)' : 'var(--color-border-strong)',
        background: saved ? 'var(--color-navy-tint)' : 'transparent',
      }}
    >
      {/* Filled when saved, outlined when not — the one glyph carries the state visually. */}
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
      {saved ? t('savedLabel') : t('saveLabel')}
    </button>
  );

  /*
   * ⚠️ **The compact variant cannot show the error message, and says so to a screen reader
   * instead.** On the article page there is room for a line of red text under the button; on a
   * card's top row there is not, and pushing the evidence pill around to make some would move
   * the page under a member who only mistyped a tap. What they get is the revert — the glyph
   * goes back to how it was, which is the honest signal that nothing happened — plus a live
   * region and the `title`. A failure here needs no recovery beyond pressing it again.
   */
  if (compact) {
    return (
      <>
        {button}
        <span className="sr-only" role="status" aria-live="polite">
          {error}
        </span>
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--space-1)' }}>
      {button}
      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
