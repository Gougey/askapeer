import { NextRequest, NextResponse } from 'next/server';
import { appOrigin } from '@/lib/request';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', appOrigin(req)));
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
