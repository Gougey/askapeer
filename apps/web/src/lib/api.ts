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
  if (!res.ok) throw new Error(await failure(path, res));
  return (await res.json()) as T;
}

/**
 * What to put in the thrown error, and why it is worth the extra read.
 *
 * "Askapeer is temporarily unreachable (400)" is true of an outage and a lie about a
 * rejected parameter, and it sent a real defect the long way round: the feed's filter panel
 * put an empty `tag` in the URL, the API answered `each value in tag must be a UUID`, and
 * all that reached the log was the word "unreachable" and a status code — so the cause had
 * to be guessed at rather than read.
 *
 * A **4xx is the caller's fault and names itself**, so the API's own message and the path
 * are recorded. A 5xx or a network failure really is "temporarily unreachable", and keeps
 * the wording a member might reasonably be shown.
 *
 * ⚠️ The message ends up in a server log and, through Next's error boundary, potentially in
 * front of a member — so the path and the validation text go in, and nothing else does.
 * Never the token, never the response body of a successful call.
 */
async function failure(path: string, res: Response): Promise<string> {
  if (res.status >= 500) return `Askapeer is temporarily unreachable (${res.status}).`;
  const detail = await res
    .clone()
    .json()
    .then((body: { message?: string | string[] }) =>
      Array.isArray(body?.message) ? body.message.join('; ') : body?.message,
    )
    .catch(() => undefined);
  return `Askapeer refused ${path} (${res.status})${detail ? `: ${detail}` : ''}.`;
}
