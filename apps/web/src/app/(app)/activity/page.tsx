import { getTranslations } from 'next-intl/server';
import { fetchNotifications } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';
import { markAllReadAction } from './actions';
import { NotificationRow } from './NotificationRow';

/**
 * E1 — the notification inbox. Replies, kudos, and post-handle account-status changes,
 * newest first (EPIC-G §8).
 *
 * Push delivery is inert at MVP (EPIC-G §6.2), which has no bearing on this list: the
 * in-app channel is the one that has always worked, and the push toggle only ever
 * governed a second copy of the same event.
 */
export default async function ActivityPage() {
  const token = await requireAccessToken();
  const [t, { notifications, unreadCount }] = await Promise.all([
    getTranslations('activity'),
    fetchNotifications(token),
  ]);

  if (notifications.length === 0) {
    // §8.16 — calm, centred, one line saying what will be here. No illustration.
    return (
      <div className="flex flex-col items-center py-16 text-center" style={{ gap: 'var(--space-3)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('empty.notifications')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      {unreadCount > 0 && (
        <form action={markAllReadAction} className="flex justify-end">
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-semibold"
            style={{ color: 'var(--color-accent)', borderRadius: 'var(--radius-pill)' }}
          >
            {t('markAllRead')}
          </button>
        </form>
      )}

      <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </ul>
    </div>
  );
}
