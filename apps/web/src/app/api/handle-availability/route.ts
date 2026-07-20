import { NextRequest, NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

/**
 * BFF passthrough for the as-you-type availability check on A6. The browser can't call
 * the API directly — the access token is in an httpOnly cookie and the API origin is
 * never exposed to the client — so this route attaches the token server-side.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? '';
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ available: false }, { status: 401 });

  const res = await fetch(
    `${API_ORIGIN}/v1/handles/availability?name=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.json({ available: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
