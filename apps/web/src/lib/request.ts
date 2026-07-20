import type { NextRequest } from 'next/server';

/**
 * The public origin of the app, from the proxy's forwarding headers. Behind Fly's
 * proxy, `req.url` reflects the internal bind address (0.0.0.0:3000), so redirects
 * built from it point somewhere the browser can't reach. Use this for redirect URLs.
 */
export function appOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}
