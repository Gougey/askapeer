import { NextRequest, NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE } from '@/lib/session';

// The magic-link target: exchanges the token for a session, sets httpOnly cookies,
// and redirects to the holding page.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/', req.url));

  const res = await fetch(`${API_ORIGIN}/v1/auth/verify-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.redirect(new URL('/?error=link', req.url));

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const secure = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(new URL('/status', req.url));
  response.cookies.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
