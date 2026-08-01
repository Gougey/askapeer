'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import type { RevealedIdentity } from '@/lib/admin';
import { getAccessToken } from '@/lib/session';

export type RevealReasonCode = 'reported_violation' | 'legal_request' | 'safety_escalation';
export type RevealResult =
  | { ok: true; identity: RevealedIdentity }
  | { ok: false; message: string };

/**
 * The audited reveal-identity action (EPIC-F §5, screen G3). Crosses the pseudonymity
 * boundary — the API logs every call (moderator, reason, timestamp) *before* returning
 * the identity, so this server action carries no special trust; it just relays the
 * reason and renders the result.
 */
export async function revealIdentityAction(
  handleId: string,
  reasonCode: RevealReasonCode,
  reasonNote: string,
): Promise<RevealResult> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/admin/handles/${handleId}/reveal-identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reasonCode, reasonNote: reasonNote.trim() }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    return { ok: false, message: message ?? 'The identity could not be revealed.' };
  }
  return { ok: true, identity: (await res.json()) as RevealedIdentity };
}

export type ModerationAction =
  | 'remove_content'
  | 'warn'
  | 'dismiss'
  | 'suspend'
  | 'expel'
  | 'rename_handle'
  | 'request_correction';
export type ModerationResult = { ok: true } | { ok: false; message: string };

/**
 * Take a moderation decision on a report (EPIC-F §3/§6). The API attributes it to the
 * calling moderator, writes the immutable action row, and resolves the report; here we
 * revalidate the surfaces it changes so the queue and the report reflect it immediately.
 * `newHandleName` is only sent (and required) for `rename_handle`.
 */
export async function moderationActionAction(
  reportId: string,
  action: ModerationAction,
  reason: string,
  newHandleName?: string,
): Promise<ModerationResult> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/admin/reports/${reportId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      action,
      reason: reason.trim() || undefined,
      newHandleName: action === 'rename_handle' ? newHandleName?.trim() || undefined : undefined,
    }),
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
