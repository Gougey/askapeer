import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// httpOnly session cookies. Access = short-lived JWT; refresh = rotating opaque token.
export const ACCESS_COOKIE = 'ap_access';
export const REFRESH_COOKIE = 'ap_refresh';

export const ACCESS_MAX_AGE = 60 * 15; // 15 min
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

/**
 * For screens *inside* the app shell, whose layout has already run `requireAppAccess`.
 * They need the token but not a second round-trip to re-prove access the layout just
 * established; the redirect here only covers the cookie vanishing mid-render.
 */
export async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  return token;
}
