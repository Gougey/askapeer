import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchNotificationPreferences } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';
import { PreferenceRow } from './PreferenceRow';

/**
 * F4 — notification preferences: type × channel (EPIC-G §6.1, §8).
 *
 * Only the types that can actually arrive are listed. `mention` and the weekly digest
 * exist in the data model but wait on EPIC-C's parser and `community.follows`; a toggle
 * for a notification that cannot be sent is worse than no toggle, so the API doesn't
 * offer them and neither does this.
 */
export default async function NotificationSettingsPage() {
  const token = await requireAccessToken();
  const [t, { preferences, pushAvailable }] = await Promise.all([
    getTranslations('settings.notifications'),
    fetchNotificationPreferences(token),
  ]);

  const channelLabels = {
    inApp: t('channels.inApp'),
    email: t('channels.email'),
    push: t('channels.push'),
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <Link href="/settings" className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          {t('back')}
        </Link>
        <h1 className="text-xl font-semibold">{t('heading')}</h1>
      </div>

      <div
        className="border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 'var(--space-4)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr>
              <td />
              {(['inApp', 'email', 'push'] as const).map((channel) => (
                <th
                  key={channel}
                  scope="col"
                  className="pb-2 text-center text-xs font-bold uppercase tracking-wide"
                  style={{
                    color: channel === 'push' && !pushAvailable ? 'var(--color-faint)' : 'var(--color-muted)',
                  }}
                >
                  {channelLabels[channel]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preferences.map((preference) => (
              <PreferenceRow
                key={preference.type}
                preference={preference}
                label={t(`types.${preference.type}`)}
                channelLabels={channelLabels}
                pushAvailable={pushAvailable}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        {/* Each note explains a control that is deliberately not operable, so the screen
            never looks broken to someone wondering why a switch won't move. */}
        <li className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('notes.accountEmailLocked')}
        </li>
        <li className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('notes.emailNotYetSending')}
        </li>
        {!pushAvailable && (
          <li className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {t('notes.pushComingSoon')}
          </li>
        )}
      </ul>
    </main>
  );
}
