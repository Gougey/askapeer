'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Tap the app bar to go back to the top of the screen.
 *
 * **It wraps the brand rather than adding a button of its own.** The need came from the
 * Research feed — a member fifty articles down wants the criteria panel, which is above
 * everything — but a floating "back to top" pill is one more thing on a screen whose whole
 * design argument is that it holds very little. The app bar is already sticky, already the
 * only thing on screen at every scroll depth, and tapping the title bar to go up is the
 * convention iOS taught everybody. So the affordance costs no pixels.
 *
 * ⚠️ **The accessible name keeps the visible word in it.** WCAG 2.5.3 (Label in Name) is
 * about a control whose spoken name contradicts the text sitting on it; "Scroll to top" over
 * a wordmark reading "AskaPeer" is exactly that, and would break voice control — someone
 * saying "tap AskaPeer" would find nothing. Naming it "AskaPeer, scroll to top" says what it
 * does without losing what it reads.
 *
 * Smooth, except when the member has asked for less motion — from the bottom of a long feed
 * this animates a very long way, which is the case `prefers-reduced-motion` exists for.
 */
export function ScrollToTop({ children }: { children: ReactNode }) {
  const t = useTranslations('shell');
  return (
    <button
      type="button"
      aria-label={t('toTop')}
      title={t('toTopShort')}
      onClick={() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }}
      className="flex cursor-pointer items-center gap-2.5 active:opacity-70"
      // The brand itself is 28px tall; the target it sits in is not allowed to be
      // (style guide §9 — min 44×44 even when the visual is smaller).
      style={{ minHeight: 44 }}
    >
      {children}
    </button>
  );
}
