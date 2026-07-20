'use server';

import { revalidatePath } from 'next/cache';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type VerifyState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Stands in for the Onfido SDK's completion callback. The real SDK posts its result to
 * the provider, which then webhooks the API; here the browser posts the chosen outcome
 * to the API's simulated-callback endpoint. Same downstream path either way.
 */
export async function submitCaptureAction(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const captureToken = String(formData.get('captureToken') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  if (!captureToken || !outcome) return { status: 'error', message: 'Pick an outcome.' };

  const res = await fetch(`${API_ORIGIN}/v1/auth/verification/simulated-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captureToken, outcome }),
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'error', message: 'That check could not be completed.' };
  revalidatePath('/status');
  return { status: 'done' };
}

/** EPIC-A §12.1 — the applicant's exit from `needs_more_info`. */
export async function resubmitAction(): Promise<VerifyState> {
  const token = await getAccessToken();
  if (!token) return { status: 'error', message: 'Please sign in again.' };

  const res = await fetch(`${API_ORIGIN}/v1/auth/verification/resubmit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'error', message: 'Could not restart your verification.' };
  revalidatePath('/status');
  return { status: 'done' };
}
