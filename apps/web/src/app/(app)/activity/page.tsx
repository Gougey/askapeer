import { getTranslations } from 'next-intl/server';
import { fetchNotifications } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';
import { markAllReadAction } from './actions';
import { NotificationRow } from './NotificationRow';
import { BackToStart } from '@/components/LoadMore';
import { InfiniteList } from '@/components/InfiniteList';
import { loadMoreNotifications } from './load-more';

/**
 * E1 — the notification inbox. Replies, kudos, and post-handle account-status changes,
 * newest first (EPIC-G §8).
 *
 * Push delivery is inert at MVP (EPIC-G §6.2), which has no bearing on this list: the
 * in-app channel is the one that has always worked, and the push toggle only ever
 * governed a second copy of the same event.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const token = await requireAccessToken();
  const [t, { notifications, unreadCount, nextCursor }] = await Promise.all([
    getTranslations('activity'),
    fetchNotifications(token, cursor),
  ]);

  if (notifications.length === 0) {
    // §8.16 — calm, centred, one line saying what will be here. No illustration.
    return (
      <div className="flex flex-col items-center py-16 text-center" style={{ gap: 'var(--space-3)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {cursor ? t('empty.noMore') : t('empty.notifications')}
        </p>
        {cursor && <BackToStart href="/activity" />}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      {cursor && <BackToStart href="/activity" />}
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

      {/* The inbox grows without limit, so this is the list that would have hidden the
          most over time — it just had the fewest rows to prove it today. */}
      <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <InfiniteList
          initialCursor={nextCursor}
          loadMore={loadMoreNotifications}
          storageKey="ap:list:activity"
          fallbackHref={nextCursor ? `/activity?cursor=${encodeURIComponent(nextCursor)}` : null}
        >
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </InfiniteList>
      </ul>
    </div>
  );
}
