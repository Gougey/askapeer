'use client';

import { useState, useTransition } from 'react';
import { reclassifyAction, type ReclassifyState } from './actions';

/**
 * Confirms before running, because this rebuilds `article_tags` from scratch and the feed
 * carries fewer matches for the minute or so it takes. Not destructive — the table is derived
 * and re-running restores it — but it is slow and visible, which is enough to be worth asking.
 */
export function ReclassifyButton() {
  const [state, setState] = useState<ReclassifyState>({ status: 'idle' });
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = () => {
    setConfirming(false);
    start(async () => setState(await reclassifyAction()));
  };

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Re-tag every stored article? Takes about a minute.
          </span>
          <button
            type="button"
            onClick={run}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            Yes, reclassify
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg px-3 py-1.5 text-sm underline"
            style={{ color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className="w-fit rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-fg)' }}
        >
          {pending ? 'Reclassifying…' : 'Reclassify the corpus'}
        </button>
      )}
      {state.message ? (
        <p
          className="text-sm"
          style={{ color: state.status === 'error' ? 'var(--color-bad)' : 'var(--color-ok)' }}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
