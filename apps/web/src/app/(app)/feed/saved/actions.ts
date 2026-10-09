'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

/**
 * Save or unsave one article.
 *
 * One action for both directions, because the control is a toggle and splitting it would make
 * the component decide which to call — the thing it is least sure about after an optimistic
 * flip. Both directions are idempotent on the API, so a double-tap cannot land wrong.
 *
 * Revalidates `/feed/saved` so the list is right next time it is opened, and `/feed` because
 * the header count lives there.
 */
export async function setSavedAction(
  articleId: string,
  saved: boolean,
): Promise<{ saved: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/research-feed/saved/${articleId}`, {
    method: saved ? 'PUT' : 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return { saved: !saved, error: 'Could not update your saved list. Please try again.' };
  }

  revalidatePath('/feed/saved');
  revalidatePath('/feed');
  return { saved };
}
