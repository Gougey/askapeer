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
   * Document navigations only.
   *
   * The refresh rotates — the used token is revoked and a new pair issued — so two
   * requests refreshing at once means the second presents a token that no longer exists
   * and gets signed out. A page load fires several requests (RSC payloads, prefetches,
   * server actions), and refreshing on all of them would make that race routine rather
   * than rare. Only the document request refreshes; everything else on that page then
   * travels with the cookie it set.
   */
  if (!req.headers.get('accept')?.includes('text/html')) return NextResponse.next();

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
    // A genuinely dead refresh token (expired, revoked, or already rotated by a racing
    // request). Clear it so the next request does not retry a token that cannot work.
    const response = NextResponse.next();
    response.cookies.delete(REFRESH_COOKIE);
    return response;
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
