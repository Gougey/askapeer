import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

/**
 * Poll target for the holding page. Exists so the browser never handles a token: the
 * access token stays in an httpOnly cookie and this handler attaches it server-side.
 */
export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ verificationStatus: null }, { status: 401 });

  const res = await fetch(`${API_ORIGIN}/v1/auth/verification-status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ verificationStatus: null }, { status: res.status });
  return NextResponse.json(await res.json(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
