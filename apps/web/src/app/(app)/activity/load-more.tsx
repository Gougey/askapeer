'use server';

import { fetchNotifications } from '@/lib/notifications';
import { getAccessToken } from '@/lib/session';
import type { InfinitePage } from '@/components/InfiniteList';
import { NotificationRow } from './NotificationRow';

/**
 * The inbox's next page, already rendered — see `discussions/load-more.tsx` for why a
 * server action returns elements rather than JSON.
 */
export async function loadMoreNotifications(cursor: string): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { notifications, nextCursor } = await fetchNotifications(token, cursor);
  return {
    node: (
      <>
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </>
    ),
    nextCursor,
  };
}
