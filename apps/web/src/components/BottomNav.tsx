'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * The five destinations agreed for the app shell (screen spec §1.1). Order is fixed:
 * Create sits in the centre because it's the primary action, and the two content tabs
 * flank it on the left with the two personal tabs on the right. Icons are the line set
 * from the style guide (§6.1); Create is the spark "Ask" FAB.
 */
const ICON = {
  feed: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  discussions:
    'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.4 8.5 8.5 0 0 1 9 8.4z',
  create: 'M12 5v14M5 12h14',
  activity: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  profile: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-7 8-7s8 3 8 7',
} as const;

const TABS = [
  { href: '/feed', key: 'feed', glyph: ICON.feed },
  { href: '/discussions', key: 'discussions', glyph: ICON.discussions },
  { href: '/create', key: 'create', glyph: ICON.create, primary: true },
  { href: '/activity', key: 'activity', glyph: ICON.activity },
  { href: '/profile', key: 'profile', glyph: ICON.profile },
] as const;

export function BottomNav() {
  const t = useTranslations('shell');
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-muted)',
        /*
         * Installed to the home screen there is no browser chrome below this bar, so on a
         * gesture-nav phone the tabs would sit under the home indicator. Padding rather
         * than a fixed offset: the inset is 0 in a normal browser tab, so this costs
         * nothing there and only takes effect where it is needed.
         */
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label={t('primaryNav')}
    >
      <ul
        className="mx-auto flex items-stretch"
        style={{ maxWidth: 'var(--container-max)', minHeight: 'var(--nav-h)' }}
      >
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
                      ? 'flex size-[52px] items-center justify-center text-white -mt-1'
                      : 'flex items-center justify-center'
                  }
                  style={
                    'primary' in tab
                      ? {
                          background:
                            'linear-gradient(135deg, var(--color-spark), var(--color-spark-dark))',
                          borderRadius: 'var(--radius-large)',
                          boxShadow: 'var(--shadow-fab)',
                        }
                      : undefined
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={'primary' in tab ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={'primary' in tab ? 'size-[26px]' : 'size-6'}
                  >
                    <path d={tab.glyph} />
                  </svg>
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
