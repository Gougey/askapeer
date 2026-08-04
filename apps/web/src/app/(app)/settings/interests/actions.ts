'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type InterestsState = { status: 'idle' | 'saved' | 'error'; message?: string };

/**
 * Replace the member's whole interest set (screen F5).
 *
 * The whole set every time, matching the API: the picker always knows every selection, and
 * a partial update would make "I deselected that" a second kind of call for no gain.
 *
 * Revalidates `/feed` because the ranking it just changed is cached there — without this a
 * member saves their interests, taps back to the feed, and sees the ranking they were
 * trying to replace.
 */
export async function saveInterestsAction(
  _prev: InterestsState,
  formData: FormData,
): Promise<InterestsState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const tagIds = formData.getAll('tag').map(String).filter(Boolean);

  const res = await fetch(`${API_ORIGIN}/v1/research-feed/interests`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tagIds }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return { status: 'error', message: 'Could not save your interests. Please try again.' };
  }

  revalidatePath('/feed');
  revalidatePath('/settings/interests');
  return { status: 'saved' };
}
