'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * The five destinations agreed for the app shell (screen spec §1.1). Order is fixed:
 * Create sits in the centre because it's the primary action, and the two content tabs
 * flank it on the left with the two personal tabs on the right.
 */
const TABS = [
  { href: '/feed', key: 'feed', glyph: '📰' },
  { href: '/discussions', key: 'discussions', glyph: '💬' },
  { href: '/create', key: 'create', glyph: '➕', primary: true },
  { href: '/activity', key: 'activity', glyph: '🔔' },
  { href: '/profile', key: 'profile', glyph: '👤' },
] as const;

export function BottomNav() {
  const t = useTranslations('shell');
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
      aria-label={t('primaryNav')}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-2 text-xs"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-muted)' }}
              >
                <span
                  aria-hidden
                  className={
                    'primary' in tab
                      ? 'flex size-8 items-center justify-center rounded-full text-white'
                      : 'text-lg'
                  }
                  style={'primary' in tab ? { background: 'var(--color-accent)' } : undefined}
                >
                  {tab.glyph}
                </span>
                <span>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
