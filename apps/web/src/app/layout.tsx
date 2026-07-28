import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { resolveTheme } from '@askapeer/design-tokens';
import './globals.css';

export const metadata: Metadata = {
  title: 'Askapeer',
  description: 'The No Ego Sports Medicine Network',
  // Standalone on iOS is driven by this, not the manifest — Safari reads its own meta.
  appleWebApp: { capable: true, title: 'AskaPeer', statusBarStyle: 'default' },
  other: {
    /*
     * Next emits only the standardised `mobile-web-app-capable`. Current Safari treats the
     * two as aliases, but older iOS honours just this legacy name — and getting it wrong
     * means the "installed" app opens with browser chrome, which is the one thing this
     * whole change exists to remove. A duplicate meta is cheaper than that failure.
     */
    'apple-mobile-web-app-capable': 'yes',
  },
};

/**
 * `viewportFit: 'cover'` is what lets the layout reach under the notch and home indicator
 * — and, less obviously, it is the switch that makes `env(safe-area-inset-*)` return
 * anything other than zero. Every safe-area rule in the app is inert without it.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: resolveTheme('light')['color-navy'] },
    { media: '(prefers-color-scheme: dark)', color: resolveTheme('dark')['color-surface'] },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
