'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  getAccessToken,
} from '@/lib/session';

export type HandleState = {
  status: 'idle' | 'error';
  /** Maps to a message key so the reason is rendered from the catalog, not the API. */
  reason?: 'taken' | 'invalid_format' | 'blocklisted';
  message?: string;
};

/**
 * Claims the handle (A6). On success the API returns a fresh, handle-scoped session —
 * writing those cookies here is what actually promotes the member out of the holding
 * pages, so it must happen before the redirect.
 */
export async function createHandleAction(_prev: HandleState, formData: FormData): Promise<HandleState> {
  const handleName = String(formData.get('handleName') ?? '').trim();
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/handles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ handleName }),
    cache: 'no-store',
  });

  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { reason?: HandleState['reason'] };
    return { status: 'error', reason: body.reason ?? 'taken' };
  }
  if (!res.ok) return { status: 'error', message: 'error' };

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  jar.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ACCESS_MAX_AGE,
  });
  jar.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE,
  });
  redirect('/onboarding/setup');
}

export type SetupState = { status: 'idle' | 'error' };

/** Records the anonymity acknowledgement (A7, gap G-13), then opens the app. */
export async function acknowledgeAction(): Promise<SetupState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/auth/anonymity-acknowledgement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'error' };
  redirect('/feed');
}
