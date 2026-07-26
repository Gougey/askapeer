import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchReport, type ReportQueueItem, requireAdmin } from '@/lib/admin';
import { CATEGORY_LABELS, TARGET_LABELS } from '../labels';
import { ModerationActions } from './ModerationActions';
import { RevealIdentity } from './RevealIdentity';

/**
 * One report, in full, with the moderation decision panel (screen G2, EPIC-F §6). Shows
 * the reported content/handle and the reporter — all pseudonymous handle names. Real
 * identity is never shown here; it's the separately-audited reveal action (S11e).
 */
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const token = await requireAdmin();
  let report: ReportQueueItem;
  try {
    report = await fetchReport(token, reportId);
  } catch (err) {
    if (err instanceof Error && err.message === 'not-found') notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{CATEGORY_LABELS[report.category] ?? report.category}</h2>
          {report.priority && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-warn) 15%, transparent)', color: 'var(--color-warn)' }}
            >
              Priority
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Reported by {report.reporterHandle ?? 'unknown'} ·{' '}
          {new Date(report.createdAt).toLocaleString('en-GB')}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Field label="Target" value={TARGET_LABELS[report.targetType]} />
        <Field label="Author / handle" value={report.target.handleName ?? '—'} />
        <Field
          label="Content status"
          value={report.target.contentStatus ?? (report.targetType === 'handle' ? 'n/a' : '—')}
        />
        <Field label="Report status" value={report.status} />
      </section>

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border-strong)' }}>
        <p className="mb-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          Reported {TARGET_LABELS[report.targetType].toLowerCase()}
        </p>
        <p className="whitespace-pre-wrap text-sm">{report.target.snippet}</p>
        {report.targetType !== 'handle' && report.target.handleId && (
          <Link
            href={`/admin/members`}
            className="mt-2 inline-block text-xs underline"
            style={{ color: 'var(--color-muted)' }}
          >
            handle: {report.target.handleName}
          </Link>
        )}
      </div>

      {report.comment && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border-strong)' }}>
          <p className="mb-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Reporter's note
          </p>
          <p className="whitespace-pre-wrap text-sm">{report.comment}</p>
        </div>
      )}

      <ModerationActions reportId={report.id} targetType={report.targetType} status={report.status} />

      {/* The audited exception (screen G3): the one place a handle is linked to a real
          person, and only via this explicit, separately-logged action (EPIC-F §5). */}
      {report.target.handleId && report.target.handleName && (
        <RevealIdentity handleId={report.target.handleId} handleName={report.target.handleName} />
      )}

      <Link href="/admin/reports" className="text-sm underline" style={{ color: 'var(--color-muted)' }}>
        ← Back to queue
      </Link>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
