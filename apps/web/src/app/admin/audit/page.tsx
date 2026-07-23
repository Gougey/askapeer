import Link from 'next/link';
import { fetchAuditLog, requireAdmin } from '@/lib/admin';
import { Table } from '../ui';

/**
 * The immutable verification decision trail (EPIC-A §3) — every status transition, newest
 * first. The moderation-action and identity-access logs join this view when their tables
 * land in the full S11.
 */
export default async function AuditPage() {
  const token = await requireAdmin();
  const entries = await fetchAuditLog(token);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Verification decisions. Moderation &amp; identity-access logs join here in S11.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          No decisions recorded yet.
        </p>
      ) : (
        <Table head={['When', 'Member', 'Transition', 'By', 'Reason']}>
          {entries.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                {new Date(e.createdAt).toLocaleString('en-GB')}
              </td>
              <td className="px-2 py-2">
                <Link
                  href={`/admin/members/${e.member.id}`}
                  className="underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {e.member.legalName}
                </Link>
              </td>
              <td className="px-2 py-2">
                {e.fromStatus} → <span className="font-medium">{e.toStatus}</span>
              </td>
              <td className="px-2 py-2">{e.decidedByLabel}</td>
              <td className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                {e.reason ?? '—'}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
