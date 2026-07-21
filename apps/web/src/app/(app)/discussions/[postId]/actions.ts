'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

type KudosTarget = 'post' | 'comment';
export type KudosResult = { kudosCount: number; hasKudosed: boolean };

async function authedToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  return token;
}

/**
 * Toggle kudos on a post or comment (EPIC-D). The caller passes the *current* state and
 * this flips it: awarded → retract, not-awarded → award. The API is idempotent either
 * way, so a double-tap or a stale toggle can't wedge the count.
 */
export async function toggleKudosAction(
  target: KudosTarget,
  targetId: string,
  currentlyKudosed: boolean,
): Promise<KudosResult> {
  const token = await authedToken();
  const path = target === 'post' ? `posts/${targetId}/kudos` : `comments/${targetId}/kudos`;
  const res = await fetch(`${API_ORIGIN}/v1/${path}`, {
    method: currentlyKudosed ? 'DELETE' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Kudos update failed (${res.status}).`);
  return (await res.json()) as KudosResult;
}

export type AnswerState = { status: 'idle' | 'error'; reason?: 'empty' | 'unavailable' };

/**
 * Post an answer, or a reply to one when `parentCommentId` is set (reply composer X3).
 * Revalidates the thread so the new answer lands in its ranked position on the next
 * render rather than needing a manual refresh.
 */
export async function createAnswerAction(
  postId: string,
  parentCommentId: string | null,
  _prev: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const token = await authedToken();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { status: 'error', reason: 'empty' };

  const res = await fetch(`${API_ORIGIN}/v1/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body, parentCommentId: parentCommentId ?? undefined }),
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'error', reason: res.status === 400 ? 'empty' : 'unavailable' };

  revalidatePath(`/discussions/${postId}`);
  return { status: 'idle' };
}

/** Author self-delete of an answer/reply (soft delete — EPIC-C §6). */
export async function deleteCommentAction(postId: string, commentId: string): Promise<void> {
  const token = await authedToken();
  const res = await fetch(`${API_ORIGIN}/v1/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status}).`);
  revalidatePath(`/discussions/${postId}`);
}
