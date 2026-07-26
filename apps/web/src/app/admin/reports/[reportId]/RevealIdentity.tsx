'use client';

import { useState, useTransition } from 'react';
import type { RevealedIdentity } from '@/lib/admin';
import { type RevealReasonCode, revealIdentityAction } from './actions';

const REASONS: { code: RevealReasonCode; label: string }[] = [
  { code: 'reported_violation', label: 'Investigating a reported policy violation' },
  { code: 'legal_request', label: 'Responding to a lawful legal request' },
  { code: 'safety_escalation', label: 'Acting on a credible safety escalation' },
];

/**
 * The audited reveal-identity flow (screen G3, EPIC-F §5). The one place a handle is ever
 * linked to a real person. Collapsed by default behind a warning; expanding requires a
 * reason code and a written note, and every reveal is logged server-side before the
 * identity comes back. Rendered only when a handle can be resolved.
 */
export function RevealIdentity({ handleId, handleName }: { handleId: string; handleName: string }) {
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<RevealReasonCode>('reported_violation');
  const [note, setNote] = useState('');
  const [identity, setIdentity] = useState<RevealedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reveal() {
    if (note.trim().length < 3) {
      setError('A written justification is required — it is what the audit log records.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revealIdentityAction(handleId, reasonCode, note);
      if (result.ok) setIdentity(result.identity);
      else setError(result.message);
    });
  }

  if (identity) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-bad)' }}>
        <h3 className="text-sm font-medium">Real identity of {handleName}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <Field label="Legal name" value={identity.legalName} />
          <Field label="Email" value={identity.email} />
          <Field label="Professional body" value={identity.professionalBody.toUpperCase()} />
          <Field label="Registration" value={identity.registrationNumber} />
          <Field label="Country" value={identity.registrationCountry} />
        </dl>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          This access has been logged against your account.
        </p>
      </section>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: 'var(--color-bad)', color: 'var(--color-bad)' }}
      >
        Reveal real identity…
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-bad)' }}>
      <div>
        <h3 className="text-sm font-medium">Reveal real identity</h3>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          This links {handleName} to a real person and is <strong>logged against your account</strong>{' '}
          with the reason below. Use only for a reported violation, a lawful request, or a safety escalation.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: 'var(--color-muted)' }}>Reason</span>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as RevealReasonCode)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        >
          {REASONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: 'var(--color-muted)' }}>Justification (recorded)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        />
      </label>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-bad)' }} role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-bad)' }}
        >
          {pending ? 'Revealing…' : 'Reveal & log'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-sm underline"
          style={{ color: 'var(--color-muted)' }}
        >
          Cancel
        </button>
      </div>
    </section>
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
