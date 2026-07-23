import Link from 'next/link';
import { fetchReviewQueue, requireAdmin } from '@/lib/admin';
import { StageBadge, Table } from '../ui';

/**
 * Everyone in-flight, stage-annotated: who's waiting on the applicant, who's waiting on a
 * human reviewer, who's mid-automated-run. Read-only for now — the approve/reject actions
 * that clear this queue are the next slice.
 */
export default async function ReviewQueuePage() {
  const token = await requireAdmin();
  const queue = await fetchReviewQueue(token);

  const needsHuman = queue.filter(
    (m) => m.stage === 'awaiting_manual_review' || m.stage === 'needs_more_info',
  );
  const waiting = queue.filter((m) => !needsHuman.includes(m));

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Needs a human"
        hint="Routed to manual review, or sent back for more info."
        members={needsHuman}
      />
      <Section
        title="In progress"
        hint="Waiting on the applicant's ID check, or still processing automatically."
        members={waiting}
      />
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Read-only. Approve / reject actions arrive in the next slice.
      </p>
    </div>
  );
}

function Section({
  title,
  hint,
  members,
}: {
  title: string;
  hint: string;
  members: Awaited<ReturnType<typeof fetchReviewQueue>>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-medium">
          {title} <span style={{ color: 'var(--color-muted)' }}>· {members.length}</span>
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {hint}
        </p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Nothing here.
        </p>
      ) : (
        <Table head={['Name', 'Body / Reg', 'Stage', 'Waiting since']}>
          {members.map((m) => (
            <tr key={m.id}>
              <td className="px-2 py-2">
                <Link href={`/admin/members/${m.id}`} className="underline" style={{ color: 'var(--color-accent)' }}>
                  {m.legalName}
                </Link>
              </td>
              <td className="px-2 py-2">
                {m.professionalBody.toUpperCase()} · {m.registrationNumber}
              </td>
              <td className="px-2 py-2">
                <StageBadge stage={m.stage} />
              </td>
              <td className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                {new Date(m.statusUpdatedAt).toLocaleString('en-GB')}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
