'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

async function authedToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  return token;
}

/**
 * Mark one notification read (EPIC-G §8).
 *
 * Revalidates the app-shell layout as well as the inbox, because the unread badge is
 * rendered up in the layout — marking a row read has to clear the tab, not just the row.
 */
export async function markReadAction(notificationId: string): Promise<void> {
  const token = await authedToken();
  const res = await fetch(`${API_ORIGIN}/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  // A 404 means it was already gone or never theirs — nothing to surface to a member who
  // is only trying to open a notification.
  if (!res.ok && res.status !== 404) throw new Error(`Could not mark as read (${res.status}).`);
  revalidatePath('/activity');
  revalidatePath('/', 'layout');
}

/**
 * Open a notification: mark it read, then go where it points — if it points anywhere.
 *
 * A form action rather than an onClick, so the row works with no client JavaScript and
 * the read state is committed before navigation rather than racing it. `redirect` throws
 * by design, so it sits outside anything that would catch it.
 *
 * `href` is null for notifications that say everything they have to say in the row — a
 * kudos, or a moderation notice too old to carry an `actionId`. Those return without
 * redirecting rather than bouncing through `/activity` to land back where they started:
 * `markReadAction` has already revalidated the inbox, so the row visibly turns read
 * without the member losing their scroll position.
 */
export async function openNotificationAction(
  notificationId: string,
  href: string | null,
): Promise<void> {
  await markReadAction(notificationId);
  if (href) redirect(href);
}

export async function markAllReadAction(): Promise<void> {
  const token = await authedToken();
  const res = await fetch(`${API_ORIGIN}/v1/notifications/read-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Could not mark all as read (${res.status}).`);
  revalidatePath('/activity');
  revalidatePath('/', 'layout');
}
