'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import type { NotificationPreference } from '@/lib/notifications';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, getAccessToken, REFRESH_COOKIE } from '@/lib/session';

export type PreferenceUpdate = Pick<NotificationPreference, 'type' | 'inApp' | 'email' | 'push'>;

/**
 * Set one notification type's three channels (EPIC-G §8).
 *
 * The whole triple goes every time, matching the API's PUT semantics — the screen always
 * knows all three values, and a partial update would need a merge rule that nothing
 * wants.
 *
 * The API rejects disabling the account-status email (§6.1), and the database rejects it
 * underneath that. The UI renders the toggle disabled so it should never come to either,
 * but a rejection here is a real answer rather than a bug: it means the client tried
 * something the policy forbids, and it must not be swallowed.
 */
export async function setNotificationPreferenceAction(update: PreferenceUpdate): Promise<void> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/notification-preferences`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      type: update.type,
      inAppEnabled: update.inApp,
      emailEnabled: update.email,
      pushEnabled: update.push,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Could not save that preference (${res.status}).`);
  revalidatePath('/settings/notifications');
}

/**
 * Sign out on every device, not just this one.
 *
 * The control that was missing while a session slid for 30 days: a lost phone with the app
 * installed stays signed in indefinitely, and on a network where the handle *is* the
 * identity, whoever holds it can post as you. The only previous remedy was asking a
 * moderator to suspend the handle, which punishes the person who was robbed.
 *
 * Revoking every refresh token stops sessions being renewed; an access token already in
 * flight survives until it expires, the same ~15-minute boundary suspension accepts. This
 * device's cookies are cleared here too, so the member sees it take effect rather than
 * being told it did.
 */
export async function signOutEverywhereAction(): Promise<void> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  await fetch(`${API_ORIGIN}/v1/auth/sign-out-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  redirect('/');
}
