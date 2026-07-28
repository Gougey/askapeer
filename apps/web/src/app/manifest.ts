import type { MetadataRoute } from 'next';
import { resolveTheme } from '@askapeer/design-tokens';

/**
 * Web app manifest — what makes AskaPeer installable to the home screen and, crucially for
 * the design phase, run **standalone**: full screen, no browser chrome.
 *
 * Deliberately no service worker yet. Standalone display needs only this file and the
 * icons; a service worker buys the Android install prompt, offline and push, and brings
 * cache invalidation with it — which would fight a daily cosmetic-iteration loop. It is
 * phase-2 work (FD-3), not now.
 *
 * Colours come from the design tokens rather than literals, so the installed app's chrome
 * cannot drift from the app it opens.
 */
const tokens = resolveTheme('light');

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AskaPeer',
    short_name: 'AskaPeer',
    description: 'The No Ego Sports Medicine Network — verified, pseudonymous peer discussion.',
    /*
     * Not '/' (the sign-in page): `requireAppAccess` already routes every session state to
     * the right place — unauthenticated to sign-in, unverified to the holding page,
     * handle-less to onboarding — so launching here lands a signed-in member in the app
     * instead of on a sign-in screen they do not need.
     */
    start_url: '/discussions',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: tokens['color-bg'],
    theme_color: tokens['color-navy'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Cropped by the launcher to the device's shape — full-bleed, mark inside the safe circle.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
