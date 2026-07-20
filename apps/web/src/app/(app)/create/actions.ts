'use server';

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

  const thread = (await res.json()) as { post: { id: string } };
  // Straight to the thread rather than the list: the member's own question at the top of
  // a list is weak confirmation, whereas the thread is the thing they just made.
  redirect(`/discussions/${thread.post.id}`);
}
