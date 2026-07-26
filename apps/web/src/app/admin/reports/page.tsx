import Link from 'next/link';
import { fetchReports, requireAdmin, type ReportQueueItem } from '@/lib/admin';
import { Table } from '../ui';
import { CATEGORY_LABELS, TARGET_LABELS } from './labels';

/**
 * The moderation queue (screen G1, EPIC-F §4). Open reports, priority tier first then
 * oldest-first — patient-privacy and anonymity reports rise to the top. Everything here is
 * pseudonymous: handle names, never real identity (that's the audited reveal, S11e).
 */
export default async function ReportsQueuePage() {
  const token = await requireAdmin();
  const reports = await fetchReports(token, 'open');
  const priority = reports.filter((r) => r.priority);
  const rest = reports.filter((r) => !r.priority);

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Priority"
        hint="Identifiable patient information and anonymity violations — actioned first."
        reports={priority}
      />
      <Section title="Other reports" hint="Harassment, spam, and everything else." reports={rest} />
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Remove content, warn, or dismiss from a report. Suspend / expel and identity access
        arrive in later slices.
      </p>
    </div>
  );
}

function Section({ title, hint, reports }: { title: string; hint: string; reports: ReportQueueItem[] }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-medium">
          {title} <span style={{ color: 'var(--color-muted)' }}>· {reports.length}</span>
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {hint}
        </p>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Nothing here.
        </p>
      ) : (
        <Table head={['Reason', 'Target', 'Reporter', 'Reported']}>
          {reports.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-2">
                <Link href={`/admin/reports/${r.id}`} className="underline" style={{ color: 'var(--color-accent)' }}>
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </Link>
              </td>
              <td className="px-2 py-2">
                <span style={{ color: 'var(--color-muted)' }}>{TARGET_LABELS[r.targetType]}</span>{' '}
                {r.target.snippet}
                {r.target.contentStatus === 'removed' && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                    (removed)
                  </span>
                )}
              </td>
              <td className="px-2 py-2">{r.reporterHandle ?? '—'}</td>
              <td className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                {new Date(r.createdAt).toLocaleString('en-GB')}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
