/**
 * The contribution icons and their colours (Adrian and Andrew, 20 October 2026).
 *
 * Kudos became two awards — **Insightful** (an open book) and **Useful** (a lightbulb) — and
 * every count on a post now has its own colour as well as its own icon, so nothing depends on
 * colour alone. A zero is always grey: the icon is still shown, so a card never changes shape,
 * but colour is kept for something that has actually happened.
 *
 * No `'use client'`: these are plain SVG, imported by the server-rendered card and the client
 * award buttons alike.
 */

export type StatKind = 'insightful' | 'useful' | 'answers' | 'follows';

/** Each stat's colour and its pressed-button tint (design tokens, "Contribution stats"). */
export const STAT_COLOUR: Record<StatKind, { fg: string; tint: string }> = {
  insightful: { fg: 'var(--color-insightful)', tint: 'var(--color-insightful-tint)' },
  useful: { fg: 'var(--color-useful)', tint: 'var(--color-useful-tint)' },
  answers: { fg: 'var(--color-answers)', tint: 'var(--color-answers-tint)' },
  follows: { fg: 'var(--color-follows)', tint: 'var(--color-follows-tint)' },
};

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function StatIcon({ kind, className = 'size-[14px] shrink-0' }: { kind: StatKind; className?: string }) {
  switch (kind) {
    case 'insightful':
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} {...line}>
          <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5M12 6.5c2-1.5 5-2 9-1.5v13c-4-.5-7 0-9 1.5M12 6.5v13" />
        </svg>
      );
    case 'useful':
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} {...line}>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2V17h5v-1c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
        </svg>
      );
    case 'answers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} {...line}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.4 8.5 8.5 0 0 1 9 8.4z" />
        </svg>
      );
    case 'follows':
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} {...line}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

/**
 * One count with its icon: in its colour above zero, grey at zero. `muted` forces grey —
 * the author's own standing, which sits beside the handle and is about the person, not
 * the post.
 */
export function Stat({
  kind,
  count,
  label,
  muted = false,
}: {
  kind: StatKind;
  count: number;
  /** The screen-reader reading, e.g. "6 insightful". */
  label: string;
  muted?: boolean;
}) {
  const coloured = !muted && count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 ${coloured ? 'font-semibold' : ''}`}
      style={{ color: coloured ? STAT_COLOUR[kind].fg : 'var(--color-muted)' }}
      title={label}
    >
      <StatIcon kind={kind} className={muted ? 'size-[13px] shrink-0' : 'size-[14px] shrink-0'} />
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The clinical-case marker before a title: a plain medical cross, filled, in the case teal.
 * Teal rather than red because the red cross emblem is protected in UK law (and red is the
 * Ask button's). It accompanies the teal border so a case is never signalled by colour alone.
 */
export function CaseCross({ label }: { label: string }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="mt-[0.3em] size-[15px] shrink-0"
        fill="currentColor"
        style={{ color: 'var(--color-category-teal)' }}
      >
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
      </svg>
      <span className="sr-only">{label}</span>
    </>
  );
}
