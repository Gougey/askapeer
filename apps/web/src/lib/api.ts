// Server-side base URL for the API. Never exposed to the client — the web app is a
// thin BFF: server actions and route handlers call the API and manage the session.
export const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000';

/**
 * Authenticated read against the API. Distinguishes "not found" from "unreachable" the
 * same way `lib/onboarding` does: a 404 is a real answer the screen renders, anything
 * else throws so Next shows the error boundary and a reload retries — rather than a
 * missing thread and a cold API looking identical to the member.
 *
 * Lives here rather than in `lib/forum` because it is not about the forum: the research
 * feed reads the same API the same way, and a second copy would drift from this one the
 * moment either is fixed.
 */
export async function apiGet<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${API_ORIGIN}/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Askapeer is temporarily unreachable (${res.status}).`);
  return (await res.json()) as T;
}
