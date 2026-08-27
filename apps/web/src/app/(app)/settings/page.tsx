import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SignOutDevice } from './SignOutDevice';
import { SignOutEverywhere } from './SignOutEverywhere';

/**
 * F3 — the settings hub: chevron rows to each settings screen (style guide §8.14).
 *
 * It lists only what exists. Interests (F5), billing (F6), account & legal (F7) and
 * sign-in & security (F8) arrive with the slices that own them — S8, S12, and the auth
 * work respectively — and each adds its own row here. A hub full of dead rows teaches a
 * member that the app doesn't work, which is a worse first impression than a short hub.
 *
 * **Both sign-out controls live here (moved from the profile screen, 2026-08-27).** They
 * were split across two screens: the ordinary one on the profile, "sign out everywhere"
 * here. Two ways to end a session, in two places, one of them a security action — the pair
 * belongs together so the difference between them is visible at the moment of choosing.
 *
 * The ordinary sign-out is kept rather than folded into "everywhere": ending this session
 * is routine, and on a borrowed or shared device it should not also revoke the phone in
 * your pocket.
 */
export default async function SettingsPage() {
  const t = await getTranslations('settings');

  const rows = [
    { href: '/settings/interests', label: t('rows.interests') },
    { href: '/settings/notifications', label: t('rows.notifications') },
  ];

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

      {/* Routine before drastic: ending this session is the everyday act, and the one that
          reaches devices a member cannot see reads better as the deliberate step past it. */}
      <SignOutDevice />
      <SignOutEverywhere />
    </main>
  );
}
