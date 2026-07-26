'use client';

import { useState, useTransition } from 'react';
import { type ReviewAction, verificationDecisionAction } from './actions';

const REVIEWABLE = ['pending', 'needs_more_info'];

const ACTIONS: { key: ReviewAction; label: string; color: string; needsReason: 'required' | 'optional' }[] = [
  { key: 'approve', label: 'Approve', color: 'var(--color-ok)', needsReason: 'optional' },
  { key: 'request_more_info', label: 'Request more info', color: 'var(--color-warn)', needsReason: 'required' },
  { key: 'reject', label: 'Reject', color: 'var(--color-bad)', needsReason: 'optional' },
];

/**
 * The manual verification decision panel (EPIC-A §6). Renders only for a reviewable
 * member (pending / needs-more-info); everything else is out of the queue. Each action
 * asks for confirmation — and a reason where the applicant will be shown it — before it
 * writes, since a verification decision is consequential and audit-logged.
 */
export function VerificationActions({ memberId, status }: { memberId: string; status: string }) {
  const [chosen, setChosen] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!REVIEWABLE.includes(status)) return null;
  const action = ACTIONS.find((a) => a.key === chosen);

  function choose(key: ReviewAction) {
    setChosen(key);
    setReason('');
    setError(null);
  }

  function submit() {
    if (!action) return;
    setError(null);
    startTransition(async () => {
      const result = await verificationDecisionAction(memberId, action.key, reason);
      if (result.ok) {
        setChosen(null);
        setReason('');
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-accent)' }}>
      <h3 className="text-sm font-medium">Review decision</h3>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => choose(a.key)}
            disabled={pending}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{
              borderColor: a.color,
              color: chosen === a.key ? '#fff' : a.color,
              background: chosen === a.key ? a.color : 'transparent',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {action && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--color-muted)' }}>
              Reason{action.needsReason === 'required' ? ' (required — shown to the applicant)' : ' (optional)'}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-lg border px-3 py-2"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
            />
          </label>
          {error && (
            <p className="text-sm" style={{ color: 'var(--color-bad)' }} role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: action.color }}
            >
              {pending ? 'Working…' : `Confirm ${action.label.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={() => setChosen(null)}
              disabled={pending}
              className="text-sm underline"
              style={{ color: 'var(--color-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
