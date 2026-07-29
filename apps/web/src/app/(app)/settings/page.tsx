import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/**
 * F3 — the settings hub: chevron rows to each settings screen (style guide §8.14).
 *
 * It lists only what exists. Interests (F5), billing (F6), account & legal (F7) and
 * sign-in & security (F8) arrive with the slices that own them — S8, S12, and the auth
 * work respectively — and each adds its own row here. A hub full of dead rows teaches a
 * member that the app doesn't work, which is a worse first impression than a short hub.
 *
 * Sign out deliberately stays on the profile screen until F7 exists to hold it: moving a
 * working affordance somewhere new, on the way to somewhere else, is churn a member pays
 * for twice.
 */
export default async function SettingsPage() {
  const t = await getTranslations('settings');

  const rows = [{ href: '/settings/notifications', label: t('rows.notifications') }];

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      <ul
        className="flex flex-col border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {rows.map((row) => (
          <li key={row.href}>
            <Link
              href={row.href}
              className="flex items-center justify-between"
              style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}
            >
              <span className="text-sm font-medium">{row.label}</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-faint)' }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
