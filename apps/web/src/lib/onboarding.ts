import { redirect } from 'next/navigation';
import { API_ORIGIN } from './api';
import { getAccessToken } from './session';

/**
 * What the API tells us about where a member is in onboarding. `hasHandle` and
 * `anonymityAcknowledged` are what decide the next screen; the verification fields
 * drive the holding page.
 */
export type SessionState = {
  verificationStatus: string;
  statusUpdatedAt: string;
  needsMoreInfoReason: string | null;
  hasHandle: boolean;
  handleStatus: 'active' | 'suspended' | 'expelled' | null;
  anonymityAcknowledged: boolean;
};

export async function fetchSessionState(token: string): Promise<SessionState | null> {
  const res = await fetch(`${API_ORIGIN}/v1/auth/verification-status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as SessionState;
}

/**
 * The single place the onboarding order is expressed: verified → handle (A6) →
 * anonymity acknowledgement (A7) → the app. Every screen in the sequence calls this and
 * acts on the answer, so there is one definition of "where should this member be" rather
 * than one per page drifting apart.
 *
 * Returns the path the member belongs on, or null if they belong where they are.
 */
export function nextOnboardingPath(state: SessionState, current: string): string | null {
  if (state.verificationStatus !== 'approved_verified') {
    return current === '/status' ? null : '/status';
  }
  // Suspended or expelled: the token isn't handle-scoped, so the app is unreachable.
  // The dedicated moderation holding page is out of MVP screen scope (screen spec §1.2),
  // and the holding page carries a status-appropriate message meanwhile.
  if (state.handleStatus === 'suspended' || state.handleStatus === 'expelled') {
    return current === '/status' ? null : '/status';
  }
  if (!state.hasHandle) return current === '/onboarding/handle' ? null : '/onboarding/handle';
  if (!state.anonymityAcknowledged) {
    return current === '/onboarding/setup' ? null : '/onboarding/setup';
  }
  // Fully onboarded — anything under the app shell is fine.
  return current.startsWith('/onboarding') || current === '/status' ? '/feed' : null;
}

/**
 * Guard for a specific onboarding screen: resolves the session, sends the member to
 * whichever step they actually owe, and returns their state and token if they belong
 * on `current`.
 */
export async function requireSession(current: string): Promise<{ token: string; state: SessionState }> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  const state = await fetchSessionState(token);
  if (!state) redirect('/'); // session gone or expired → back to sign-in
  const next = nextOnboardingPath(state, current);
  if (next) redirect(next);
  return { token, state };
}

/**
 * Guard for the app shell. Every screen inside it has the same requirement — fully
 * onboarded, both gates passed — so it doesn't need to know which one it's protecting,
 * and the layout doesn't need the pathname plumbed in to ask.
 */
export async function requireAppAccess(): Promise<{ token: string; state: SessionState }> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  const state = await fetchSessionState(token);
  if (!state) redirect('/');
  if (state.verificationStatus !== 'approved_verified' || state.handleStatus !== 'active') {
    redirect('/status');
  }
  if (!state.hasHandle) redirect('/onboarding/handle');
  if (!state.anonymityAcknowledged) redirect('/onboarding/setup');
  return { token, state };
}
