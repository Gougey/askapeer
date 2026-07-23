import Link from 'next/link';
import type { Stage } from '@/lib/admin';

/** Colour-coded pipeline stage. Amber = needs a human; green = done; red = terminal-bad. */
export function StageBadge({ stage }: { stage: Stage }) {
  const { label, color } = STAGE_META[stage];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {label}
    </span>
  );
}

const STAGE_META: Record<Stage, { label: string; color: string }> = {
  processing: { label: 'Processing', color: 'var(--color-muted)' },
  awaiting_id_capture: { label: 'Awaiting ID capture', color: '#0ea5e9' },
  awaiting_manual_review: { label: 'Needs review', color: '#d97706' },
  needs_more_info: { label: 'Needs more info', color: '#d97706' },
  approved: { label: 'Approved', color: 'var(--color-ok)' },
  rejected: { label: 'Rejected', color: 'var(--color-bad)' },
  suspended: { label: 'Suspended', color: 'var(--color-bad)' },
  expelled: { label: 'Expelled', color: 'var(--color-bad)' },
};

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav() {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b pb-3" style={{ borderColor: 'var(--color-muted)' }}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{ color: 'var(--color-fg)' }}
        >
          {tab.label}
        </Link>
      ))}
      <Link href="/feed" className="ml-auto text-sm underline" style={{ color: 'var(--color-muted)' }}>
        ← Back to app
      </Link>
    </nav>
  );
}

/** Shared table shell so the admin views read as one surface. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left" style={{ color: 'var(--color-muted)' }}>
            {head.map((h) => (
              <th key={h} className="border-b px-2 py-2 font-medium" style={{ borderColor: 'var(--color-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
