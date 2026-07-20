import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
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
    <div className="mx-auto max-w-lg pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
