'use client';

import { useState, useTransition } from 'react';
import type { ReportTargetType } from '@/lib/admin';
import { type ModerationAction, moderationActionAction } from './actions';

type ActionDef = { key: ModerationAction; label: string; color: string; hint: string };

const ALL_ACTIONS: ActionDef[] = [
  {
    key: 'remove_content',
    label: 'Remove content',
    color: 'var(--color-bad)',
    hint: 'Hides the post/answer and claws back the kudos it earned. Irreversible reputation change.',
  },
  {
    key: 'warn',
    label: 'Warn',
    color: 'var(--color-warn)',
    hint: 'Logs a formal warning against the handle. Content is left in place.',
  },
  {
    key: 'rename_handle',
    label: 'Rename handle',
    color: 'var(--color-warn)',
    hint: 'Force a new handle name when the name itself identifies or impersonates. The old name is retired and can never be reused.',
  },
  {
    key: 'suspend',
    label: 'Suspend',
    color: 'var(--color-bad)',
    hint: 'Suspends the handle — the member is routed to the holding page. Reversible; does not touch their registration status.',
  },
  {
    key: 'expel',
    label: 'Expel',
    color: 'var(--color-bad)',
    hint: 'Permanent. Expels the handle and the member; blocks re-registration with the same credentials. Cannot be undone.',
  },
  {
    key: 'dismiss',
    label: 'Dismiss',
    color: 'var(--color-muted)',
    hint: 'Close this report with no action — nothing is recorded against the handle.',
  },
];

/**
 * The moderation decision panel (EPIC-F §6, screen G2). Renders only for an open report;
 * a resolved one shows its outcome. Each action asks for confirmation — and an optional
 * reason recorded on the immutable action row — before it writes, since removal and
 * warnings are consequential and audited. `remove_content` is offered only for content
 * targets; a handle can't be "removed" (that's suspend/expel, S11d).
 */
export function ModerationActions({
  reportId,
  targetType,
  status,
}: {
  reportId: string;
  targetType: ReportTargetType;
  status: string;
}) {
  const [chosen, setChosen] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status !== 'open') {
    return (
      <p className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--color-border-strong)' }}>
        This report is <span className="font-medium">{status}</span>. No further action.
      </p>
    );
  }

  const actions = ALL_ACTIONS.filter((a) => a.key !== 'remove_content' || targetType !== 'handle');
  const action = actions.find((a) => a.key === chosen);

  function choose(key: ModerationAction) {
    setChosen(key);
    setReason('');
    setNewName('');
    setError(null);
  }

  function submit() {
    if (!action) return;
    if (action.key === 'rename_handle' && !newName.trim()) {
      setError('Enter the new handle name.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await moderationActionAction(reportId, action.key, reason, newName);
      if (result.ok) {
        setChosen(null);
        setReason('');
        setNewName('');
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-accent)' }}>
      <h3 className="text-sm font-medium">Take action</h3>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
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
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {action.hint}
          </p>
          {action.key === 'rename_handle' && (
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: 'var(--color-muted)' }}>New handle name (3–30 chars: letters, numbers, _ or -)</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                minLength={3}
                maxLength={30}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--color-muted)' }}>Reason (optional, recorded on the action)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={1000}
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
              onClick={submit}
              disabled={pending}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: action.color }}
            >
              {pending ? 'Working…' : `Confirm: ${action.label}`}
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
