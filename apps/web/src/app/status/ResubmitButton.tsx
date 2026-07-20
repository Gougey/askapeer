'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { resubmitAction, type VerifyState } from '../verify/actions';

const initial: VerifyState = { status: 'idle' };

/** EPIC-A §12.1 (G-1) — restarts the automated pipeline from `needs_more_info`. */
export function ResubmitButton() {
  const t = useTranslations('holding');
  const [state, action, pending] = useActionState(() => resubmitAction(), initial);

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: 'var(--color-accent)' }}
      >
        {pending ? t('resubmitting') : t('resubmit')}
      </button>
      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{state.message}</p>
      )}
    </form>
  );
}
