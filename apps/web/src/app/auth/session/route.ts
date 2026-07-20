import { NextRequest, NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { appOrigin } from '@/lib/request';
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE } from '@/lib/session';

/**
 * Rotates the session and redirects to `next`.
 *
 * Needed because the access token carries the verification scope as a claim: an
 * applicant who signed in while `pending` holds a pending-scoped token, and it stays
 * pending-scoped after approval until it is reissued. The holding page sends the
 * member here the moment it sees `approved_verified` so their session catches up
 * without waiting out the 15-minute token lifetime.
 */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const next = req.nextUrl.searchParams.get('next') ?? '/status';
  // Only same-app paths — never redirect to an attacker-supplied absolute URL.
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/status';

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.redirect(new URL('/', origin));

  const res = await fetch(`${API_ORIGIN}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.redirect(new URL('/', origin));

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const secure = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(new URL(target, origin));
  response.cookies.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
