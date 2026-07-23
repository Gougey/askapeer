import Link from 'next/link';
import { fetchMembers, fetchReviewQueue, requireAdmin } from '@/lib/admin';

/** A quick pulse of the platform: how many members, and how many need attention. */
export default async function AdminOverview() {
  const token = await requireAdmin();
  const [members, queue] = await Promise.all([fetchMembers(token), fetchReviewQueue(token)]);

  const byStatus = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.verificationStatus] = (acc[m.verificationStatus] ?? 0) + 1;
    return acc;
  }, {});
  const needsReview = queue.filter(
    (m) => m.stage === 'awaiting_manual_review' || m.stage === 'needs_more_info',
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Members" value={members.length} href="/admin/members" />
        <Tile label="Needs review" value={needsReview} href="/admin/review" accent={needsReview > 0} />
        <Tile label="Verified" value={byStatus.approved_verified ?? 0} href="/admin/members?status=approved_verified" />
        <Tile label="Pending" value={byStatus.pending ?? 0} href="/admin/members?status=pending" />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">By status</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {Object.entries(byStatus)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <li key={status}>
                <Link
                  href={`/admin/members?status=${status}`}
                  className="rounded-lg border px-3 py-1.5"
                  style={{ borderColor: 'var(--color-muted)' }}
                >
                  {status} · {count}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border p-3"
      style={{
        borderColor: accent ? 'var(--color-bad)' : 'var(--color-muted)',
        background: 'var(--color-surface)',
      }}
    >
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
    </Link>
  );
}
