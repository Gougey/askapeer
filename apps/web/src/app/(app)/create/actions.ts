'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type ComposeState = {
  status: 'idle' | 'error';
  /** Maps to a message key, so the copy comes from the catalog rather than the API. */
  reason?: 'missing_fields' | 'rejected' | 'unavailable';
};

/**
 * Publishes a question (screens D1/D2). An ordinary question goes live immediately —
 * only case discussions (EPIC-E, S9) travel through a draft/attestation route.
 */
export async function createPostAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const categoryId = String(formData.get('categoryId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const tagIds = formData.getAll('tagIds').map(String);

  // Checked here as well as in the browser: the client-side disable is a convenience,
  // and a form can always be submitted without it.
  if (!categoryId || !title || !body) return { status: 'error', reason: 'missing_fields' };

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/v1/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categoryId, title, body, tagIds }),
      cache: 'no-store',
    });
  } catch {
    return { status: 'error', reason: 'unavailable' };
  }

  if (!res.ok) {
    return { status: 'error', reason: res.status === 400 ? 'rejected' : 'unavailable' };
  }

  /*
   * Back to the list (C1), not the new thread (C4).
   *
   * Landing on your own freshly-posted question put an empty answer box directly beneath
   * it, which reads as the post having been *reopened* and you being prompted to reply to
   * yourself — the opposite of "that's published, done". The list is newest-first, so the
   * question is sitting at the top when it loads: confirmation by arrival rather than by
   * being parked inside the thing you just wrote.
   *
   * Revalidated first: the whole point is that the question is *there* on arrival, so a
   * cached list without it would be worse than the thread we came from.
   */
  revalidatePath('/discussions');
  redirect('/discussions');
}
