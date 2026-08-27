'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Segment = {
  href: string;
  label: string;
  /**
   * Set when the two panes are the *same* route with different query strings — search
   * results are `/search?in=discussions` and `/search?in=papers`, so comparing `pathname`
   * alone marks both inactive. The caller already knows which is showing, and it is a
   * server component, so it says so rather than making this read the query string.
   */
  active?: boolean;
};

/**
 * Style guide §8.9 — a bordered strip whose active segment is filled with the accent.
 *
 * **This is the compose control's look, adopted as the single one (2026-08-27).** §8.9 had
 * always specified one control for both in-pane toggles and compose mode, but compose grew
 * its own markup and a different treatment — a filled navy segment against a hairline
 * border, rather than a grey track with a raised white pill. Two looks for one idea, and
 * the filled one is the clearer at a glance on a phone, so it wins and this is now the only
 * implementation.
 *
 * Built on links rather than buttons because the panes are routes: each is independently
 * addressable and survives a refresh, and the browser's own back button moves between them.
 * `aria-current="page"` is what carries the active state to a screen reader — fill is colour,
 * which §9.2 says can never be the only signal.
 */
export function SegmentedControl({ segments, label }: { segments: Segment[]; label?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="flex overflow-hidden border"
      style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
    >
      {segments.map((segment) => {
        const active = segment.active ?? pathname === segment.href;
        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={active ? 'page' : undefined}
            className="flex-1 px-3 py-2 text-center text-sm font-medium"
            style={
              active
                ? { background: 'var(--color-accent)', color: 'var(--color-surface)' }
                : { color: 'var(--color-muted)' }
            }
          >
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}
