'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type ModerationAction = 'remove_content' | 'warn' | 'dismiss';
export type ModerationResult = { ok: true } | { ok: false; message: string };

/**
 * Take a moderation decision on a report (EPIC-F §3/§6). The API attributes it to the
 * calling moderator, writes the immutable action row, and resolves the report; here we
 * revalidate the surfaces it changes so the queue and the report reflect it immediately.
 */
export async function moderationActionAction(
  reportId: string,
  action: ModerationAction,
  reason: string,
): Promise<ModerationResult> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/admin/reports/${reportId}/action`, {
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

  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath('/admin/reports');
  revalidatePath('/admin');
  return { ok: true };
}
