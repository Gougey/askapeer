import { notFound } from 'next/navigation';
import { fetchMember, type MemberDetail, requireAdmin } from '@/lib/admin';
import { StageBadge } from '../../ui';

/**
 * One member's verification journey — register lookup → identity check → decision →
 * status — so a registration can be followed through to success, review, or fail.
 * Shows identity (the admin's remit); shows only whether a handle exists, never its name.
 */
export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await requireAdmin();
  let member: MemberDetail;
  try {
    member = await fetchMember(token, id);
  } catch (err) {
    if (err instanceof Error && err.message === 'not-found') notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{member.legalName}</h2>
          <StageBadge stage={member.stage} />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {member.email}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Field label="Professional body" value={member.professionalBody.toUpperCase()} />
        <Field label="Registration" value={member.registrationNumber} />
        <Field label="Country" value={member.registrationCountry} />
        <Field label="Status" value={member.verificationStatus} />
        <Field label="Has handle" value={member.hasHandle ? 'Yes' : 'No'} />
        <Field label="Anonymity acknowledged" value={member.anonymityAcknowledged ? 'Yes' : 'No'} />
        <Field label="Joined" value={new Date(member.createdAt).toLocaleString('en-GB')} />
        <Field label="Status updated" value={new Date(member.statusUpdatedAt).toLocaleString('en-GB')} />
        {member.reapplicationAttempts > 0 && (
          <Field label="Reapplication attempts" value={String(member.reapplicationAttempts)} danger />
        )}
      </section>

      {member.needsMoreInfoReason && (
        <p className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-bad)' }}>
          <span className="font-medium">Needs more info:</span> {member.needsMoreInfoReason}
        </p>
      )}

      <Timeline title="Automated checks (evidence)">
        {member.evidence.length === 0 ? (
          <Empty>No checks recorded yet.</Empty>
        ) : (
          member.evidence.map((e) => (
            <Row key={e.id} when={e.createdAt}>
              <span className="font-medium">{e.evidenceType}</span> · {e.source} →{' '}
              <Outcome outcome={e.outcome} />
              {e.reason && <span style={{ color: 'var(--color-muted)' }}> · {e.reason}</span>}
            </Row>
          ))
        )}
      </Timeline>

      <Timeline title="Identity checks">
        {member.identityChecks.length === 0 ? (
          <Empty>None opened.</Empty>
        ) : (
          member.identityChecks.map((c) => (
            <Row key={c.id} when={c.createdAt}>
              <span className="font-medium">{c.provider}</span> · {c.state}
            </Row>
          ))
        )}
      </Timeline>

      <Timeline title="Status decisions (audit)">
        {member.decisions.length === 0 ? (
          <Empty>No transitions yet — still at its first status.</Empty>
        ) : (
          member.decisions.map((d) => (
            <Row key={d.id} when={d.createdAt}>
              {d.fromStatus} → <span className="font-medium">{d.toStatus}</span> · by {d.decidedBy}
              {d.reason && <span style={{ color: 'var(--color-muted)' }}> · {d.reason}</span>}
            </Row>
          ))
        )}
      </Timeline>
    </div>
  );
}

function Field({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
      <span style={{ color: danger ? 'var(--color-bad)' : 'var(--color-fg)' }}>{value}</span>
    </div>
  );
}

function Timeline({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function Row({ when, children }: { when: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-muted)' }}>
      <span>{children}</span>
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {new Date(when).toLocaleString('en-GB')}
      </span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm" style={{ color: 'var(--color-muted)' }}>
      {children}
    </li>
  );
}

function Outcome({ outcome }: { outcome: string }) {
  const color = outcome === 'pass' ? 'var(--color-ok)' : outcome === 'fail' ? 'var(--color-bad)' : '#d97706';
  return <span style={{ color, fontWeight: 500 }}>{outcome}</span>;
}
