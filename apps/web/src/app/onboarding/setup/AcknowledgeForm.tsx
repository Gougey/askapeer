'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { acknowledgeAction, type SetupState } from '../actions';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('onboarding.setup');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg px-3 py-2 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {pending ? t('submitting') : t('continue')}
    </button>
  );
}

/**
 * The acknowledgement is an explicit, unticked-by-default action. It is recorded against
 * the member's verified identity (gap G-13), so it has to be a deliberate act — a
 * pre-ticked box would make the record worthless as evidence they read it.
 */
export function AcknowledgeForm() {
  const t = useTranslations('onboarding.setup');
  const [state, formAction] = useActionState<SetupState, FormData>(acknowledgeAction, {
    status: 'idle',
  });
  const [agreed, setAgreed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-left text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-4 shrink-0"
        />
        <span>{t('acknowledge')}</span>
      </label>
      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{t('error')}</p>
      )}
      <SubmitButton disabled={!agreed} />
    </form>
  );
}
