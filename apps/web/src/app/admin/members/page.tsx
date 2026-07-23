import Link from 'next/link';
import { fetchMembers, requireAdmin } from '@/lib/admin';
import { StageBadge, Table } from '../ui';

const STATUSES = [
  'pending',
  'needs_more_info',
  'approved_verified',
  'rejected',
  'suspended',
  'expelled',
];

/** Everyone, newest first, filterable by status. Identity is visible — this is the
 *  verification admin's remit; the community handle name deliberately is not. */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const token = await requireAdmin();
  const members = await fetchMembers(token, status);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5 text-xs">
        <FilterLink label="All" href="/admin/members" active={!status} />
        {STATUSES.map((s) => (
          <FilterLink key={s} label={s} href={`/admin/members?status=${s}`} active={status === s} />
        ))}
      </div>

      {members.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          No members{status ? ` with status “${status}”` : ''}.
        </p>
      ) : (
        <Table head={['Name', 'Body / Reg', 'Country', 'Stage', 'Handle', 'Joined']}>
          {members.map((m) => (
            <tr key={m.id} className="align-top">
              <td className="px-2 py-2">
                <Link href={`/admin/members/${m.id}`} className="underline" style={{ color: 'var(--color-accent)' }}>
                  {m.legalName}
                </Link>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {m.email}
                </div>
              </td>
              <td className="px-2 py-2">
                {m.professionalBody.toUpperCase()}
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {m.registrationNumber}
                </div>
              </td>
              <td className="px-2 py-2">{m.registrationCountry}</td>
              <td className="px-2 py-2">
                <StageBadge stage={m.stage} />
              </td>
              <td className="px-2 py-2">{m.hasHandle ? 'Yes' : '—'}</td>
              <td className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                {new Date(m.createdAt).toLocaleDateString('en-GB')}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-full border px-2.5 py-1"
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--color-muted)',
        color: active ? 'var(--color-accent)' : 'var(--color-fg)',
      }}
    >
      {label}
    </Link>
  );
}
