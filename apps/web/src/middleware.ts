import { NextResponse, type NextRequest } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE } from '@/lib/session';

/**
 * Keeps a session alive by spending the refresh token the app already had.
 *
 * **The bug this fixes.** The design is a 15-minute access token plus a 30-day rotating
 * refresh, but nothing ever called the refresh endpoint — `app/auth/session/route.ts` was
 * its only caller and had no callers of its own. So when `ap_access` expired the guard
 * redirected to sign-in while a perfectly good 30-day `ap_refresh` sat unused, and the
 * *access token's* lifetime became the whole session. Fifteen minutes, regardless of
 * activity.
 *
 * **Why middleware and not the guard.** A Next server component cannot set cookies during
 * render, so rotation cannot live in `requireAppAccess` where the expiry is noticed.
 * Middleware runs before render and can, which is the only place this fits.
 *
 * **Why the 15 minutes stays 15 minutes.** `AppAccessGuard` trusts the scope claim in the
 * JWT rather than re-reading the database, so the access token's lifetime *is* how long a
 * suspended or expelled member keeps working (EPIC-B §10 accepts that boundary). Lengthening
 * it to avoid signing people out would trade the moderation guarantee for convenience.
 * Refreshing silently gets both: a session that lasts while you use it, and revocation that
 * lands within a quarter of an hour.
 */
export async function middleware(req: NextRequest) {
  const hasAccess = req.cookies.has(ACCESS_COOKIE);
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (hasAccess || !refreshToken) return NextResponse.next();

  /*
   * Every request, not just document loads.
   *
   * This was gated on `Accept: text/html`, reasoning that the refresh rotates and two
   * concurrent refreshes sign the loser out. True, and still wrong: **reopening an
   * installed app does not load a document** — the client router issues an RSC request,
   * which was skipped, so the guard saw no access token and bounced the member to sign-in.
   * That is the phone-after-fifteen-idle-minutes symptom, invisible on a desktop where you
   * usually arrive by typing a URL.
   *
   * The obvious repair — refresh on navigations but not prefetches — is not available:
   * **Next strips its own `RSC` and `Next-Router-Prefetch` headers before middleware
   * runs** (verified by dumping the headers that actually arrive; only `Accept` survives),
   * so a prefetch and a real navigation are indistinguishable here.
   *
   * So the race is solved where it lives instead — `AuthService.refresh` reuses a refresh
   * token for its first ten minutes rather than rotating on every call, and concurrent
   * refreshes can no longer invalidate one another. This layer just asks.
   */
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    // The API being unreachable is not the same as the session being over. Carry on
    // without a token and let the guard decide — a cold start must not sign anyone out.
    return NextResponse.next();
  }

  if (!res.ok) {
    /*
     * Deliberately does **not** clear the cookie.
     *
     * A 401 here means expired, revoked — or already rotated by a request that raced this
     * one. In that last case the winner has just set a fresh cookie, and deleting it would
     * sign out a member whose session is perfectly good, turning a harmless race into the
     * exact bug this middleware exists to prevent. Leaving a dead cookie costs one API call
     * per navigation while the member sits at sign-in, and signing in overwrites it.
     */
    return NextResponse.next();
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const secure = process.env.NODE_ENV === 'production';

  // Set on the *request* as well as the response: the page about to render reads cookies
  // from the request, so without this the member is signed in only from the next
  // navigation onwards — and the page they actually asked for still redirects.
  req.cookies.set(ACCESS_COOKIE, data.accessToken);
  req.cookies.set(REFRESH_COOKIE, data.refreshToken);
  const response = NextResponse.next({ request: { headers: req.headers } });

  const options = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
  response.cookies.set(ACCESS_COOKIE, data.accessToken, { ...options, maxAge: ACCESS_MAX_AGE });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, { ...options, maxAge: REFRESH_MAX_AGE });
  return response;
}

export const config = {
  /*
   * Everything except Next's own assets and the files served from `public/`. The auth
   * routes are deliberately included: arriving at `/auth/verify` with an expired access
   * token and a live refresh should not be a dead end either.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|brand/|fonts/|manifest.webmanifest).*)'],
};
