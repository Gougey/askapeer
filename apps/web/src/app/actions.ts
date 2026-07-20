'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';

/**
 * Sign out. A POST-only server action, never a GET route: Next prefetches `<Link>`s that
 * enter the viewport, so a GET sign-out endpoint gets *executed* just by rendering a page
 * that links to it — which is exactly how it behaved, silently ending the session of
 * anyone who opened their profile.
 *
 * The general rule this encodes: a GET must be safe to call without the member asking.
 */
export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  redirect('/');
}

export type AuthState = {
  status: 'idle' | 'sent' | 'error';
  message?: string;
  // In dev the API returns the magic-link token so the flow is testable before
  // real email delivery lands (S10). This surfaces it as a clickable link.
  devLink?: string;
};

async function requestLink(email: string): Promise<AuthState> {
  const res = await fetch(`${API_ORIGIN}/v1/auth/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'error', message: 'Something went wrong. Please try again.' };
  const data = (await res.json()) as { devToken?: string };
  return {
    status: 'sent',
    devLink: data.devToken ? `/auth/verify?token=${encodeURIComponent(data.devToken)}` : undefined,
  };
}

export async function requestLinkAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { status: 'error', message: 'Enter your email.' };
  return requestLink(email);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const payload = {
    legalName: String(formData.get('legalName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    professionalBody: String(formData.get('professionalBody') ?? ''),
    registrationNumber: String(formData.get('registrationNumber') ?? '').trim(),
  };
  const res = await fetch(`${API_ORIGIN}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (res.status === 409) {
    return { status: 'error', message: 'An account with these details may already exist — try signing in.' };
  }
  if (!res.ok) return { status: 'error', message: 'Please check your details and try again.' };
  // Registered — send a sign-in link to complete onboarding.
  return requestLink(payload.email);
}
