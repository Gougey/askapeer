'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Segment = { href: string; label: string };

/**
 * Style guide §8.9 — grey track, 3px padding, the active segment a surface pill with a
 * soft shadow and navy text. Named in the guide for exactly this use ("My questions /
 * Notifications").
 *
 * Built on links rather than buttons because the two panes are two routes: each is
 * independently addressable and survives a refresh, and the browser's own back button
 * moves between them. `aria-current="page"` is what carries the active state to a screen
 * reader — the pill is colour and shadow, which §9.2 says can never be the only signal.
 */
export function SegmentedControl({ segments }: { segments: Segment[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex"
      style={{
        background: 'var(--color-navy-tint-2)',
        borderRadius: 'var(--radius-pill)',
        padding: '3px',
        gap: '3px',
      }}
    >
      {segments.map((segment) => {
        const active = pathname === segment.href;
        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={active ? 'page' : undefined}
            className="flex-1 py-2 text-center text-sm font-semibold"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: active ? 'var(--color-surface)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-muted)',
              boxShadow: active ? 'var(--shadow-card)' : 'var(--shadow-none)',
            }}
          >
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}
