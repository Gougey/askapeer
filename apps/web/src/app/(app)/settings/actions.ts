'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import type { NotificationPreference } from '@/lib/notifications';
import { getAccessToken } from '@/lib/session';

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
