'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type CriteriaState = { status: 'idle' | 'saved' | 'error'; message?: string };

/**
 * Make what is in the filter panel the member's standing settings (Andrew's review item 6).
 *
 * ⚠️ **Chosen tags overwrite the clinical interests.** Interests have exactly one home —
 * `community.member_interests` — and a second copy behind the feed would let the Settings
 * screen and this panel disagree about what the member follows. The panel warns before it
 * gets here; this action is where the overwrite actually happens.
 *
 * An *empty* tag row is left alone rather than treated as "I have no interests": pressing
 * Save on a panel whose tags were never touched must not silently delete a list the member
 * curated. The API applies the same rule.
 *
 * Revalidates `/feed` because the ranking these criteria change is cached there, and
 * `/settings/interests` because this may just have rewritten it.
 */
export async function saveFeedCriteriaAction(
  _prev: CriteriaState,
  formData: FormData,
): Promise<CriteriaState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const years = Number(formData.get('years'));
  const body = {
    tagIds: formData.getAll('tag').map(String).filter(Boolean),
    query: String(formData.get('q') ?? '').trim() || undefined,
    evidence: String(formData.get('evidence') ?? '') || undefined,
    periodYears: Number.isInteger(years) && years > 0 ? years : undefined,
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
  revalidatePath('/settings/interests');
  return { status: 'saved' };
}
