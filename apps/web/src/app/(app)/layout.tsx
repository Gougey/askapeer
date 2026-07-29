import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { AppBar } from '@/components/Brand';
import { fetchUnreadCount } from '@/lib/notifications';
import { requireAppAccess } from '@/lib/onboarding';

/**
 * The app shell (screen spec §1.1). Everything in this route group sits behind both
 * gates and carries the bottom nav; onboarding and the holding pages live outside it and
 * render without it, which is what keeps "am I in the app yet?" a routing fact rather
 * than a per-screen flag.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { token } = await requireAppAccess();
  // Fetched here rather than in the nav so the nav stays a presentational client
  // component; the actions that mark notifications read revalidate this layout, which is
  // what clears the dot without a manual refresh.
  const unreadCount = await fetchUnreadCount(token);

  return (
    // The member-facing app is a centred --container-max column at every width (style
    // guide §4.2) — never a multi-column desktop layout, which would reintroduce
    // desktop-first thinking and break the one-hand model. The admin console is a
    // separate context and is not bound by it.
    //
    // Clearance for the fixed bottom nav, which itself grows by the home-indicator inset
    // when installed — so the content padding has to grow with it or the last row hides.
    <div
      className="mx-auto"
      style={{
        maxWidth: 'var(--container-max)',
        paddingBottom: 'calc(var(--nav-h) + var(--space-4) + env(safe-area-inset-bottom))',
      }}
    >
      <AppBar />
      {children}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
