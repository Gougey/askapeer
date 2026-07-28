import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { AppBar } from '@/components/Brand';
import { requireAppAccess } from '@/lib/onboarding';

/**
 * The app shell (screen spec §1.1). Everything in this route group sits behind both
 * gates and carries the bottom nav; onboarding and the holding pages live outside it and
 * render without it, which is what keeps "am I in the app yet?" a routing fact rather
 * than a per-screen flag.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  await requireAppAccess();

  return (
    // Clearance for the fixed bottom nav, which itself grows by the home-indicator inset
    // when installed — so the content padding has to grow with it or the last row hides.
    <div className="mx-auto max-w-lg" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <AppBar />
      {children}
      <BottomNav />
    </div>
  );
}
