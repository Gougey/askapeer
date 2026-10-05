'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type CriteriaState = { status: 'idle' | 'saved' | 'error'; message?: string };

/**
 * Make what is in the panel the member's standing criteria.
 *
 * ⚠️ **These seed the panel on a later visit; they do not run themselves.** My Research starts
 * empty with the panel open, by design — saving spares the retyping, it does not put results
 * on a screen nobody has asked a question of.
 *
 * ⚠️ **Nothing here touches the member's clinical interests any more.** It used to: the panel
 * carried a tag row, and saving wrote those tags back as the interests, with a warning. Since
 * interests were taken out of My Research, this writes one row of its own and nothing else.
 *
 * Revalidates `/feed` because the criteria it seeds are cached there.
 */
export async function saveFeedCriteriaAction(
  _prev: CriteriaState,
  formData: FormData,
): Promise<CriteriaState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const years = Number(formData.get('years'));
  const body = {
    query: String(formData.get('q') ?? '').trim() || undefined,
    evidence: String(formData.get('evidence') ?? '') || undefined,
    // Bounded both ends: the API accepts 1–5 and refuses anything else with a 400.
    periodYears: Number.isInteger(years) && years >= 1 && years <= 5 ? years : undefined,
    sort: String(formData.get('sort') ?? '') || undefined,
  };

  const res = await fetch(`${API_ORIGIN}/v1/research-feed/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    return { status: 'error', message: 'Could not save these as your settings. Please try again.' };
  }

  revalidatePath('/feed');
  return { status: 'saved' };
}
