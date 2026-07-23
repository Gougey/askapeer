import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from './ui';

/**
 * The admin console (S11a) — read-only observability, gated to allowlisted admins.
 * It lives outside the (app) route group on purpose: it isn't a member surface, so it
 * has its own chrome and none of the pseudonymous app shell's bottom nav.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">Admin</h1>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Read-only · verification &amp; members
        </span>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
