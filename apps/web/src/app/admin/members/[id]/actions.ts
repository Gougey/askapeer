'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type ReviewAction = 'approve' | 'reject' | 'request_more_info';
export type DecisionResult = { ok: true } | { ok: false; message: string };

/**
 * Record a manual verification decision (EPIC-A §6). The API attributes it to the
 * calling admin and writes the immutable decision row; here we just revalidate the
 * surfaces it changes so the new status and audit entry show without a manual refresh.
 */
export async function verificationDecisionAction(
  memberId: string,
  action: ReviewAction,
  reason: string,
): Promise<DecisionResult> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/admin/members/${memberId}/verification-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, reason: reason.trim() || undefined }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    return { ok: false, message: message ?? 'That action could not be completed.' };
  }

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath('/admin/review');
  revalidatePath('/admin');
  return { ok: true };
}
