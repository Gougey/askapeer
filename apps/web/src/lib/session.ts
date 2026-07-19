import { cookies } from 'next/headers';

// httpOnly session cookies. Access = short-lived JWT; refresh = rotating opaque token.
export const ACCESS_COOKIE = 'ap_access';
export const REFRESH_COOKIE = 'ap_refresh';

export const ACCESS_MAX_AGE = 60 * 15; // 15 min
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}
