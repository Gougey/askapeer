'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { submitCaptureAction, type VerifyState } from '../actions';

const initial: VerifyState = { status: 'idle' };

const OUTCOMES = [
  // Onfido's own vocabulary — `clear` is the only one that auto-approves (EPIC-A §5).
  { value: 'clear', tone: 'var(--color-accent)' },
  { value: 'consider', tone: 'var(--color-muted)' },
  { value: 'fail', tone: 'var(--color-bad)' },
] as const;

/**
 * The stand-in for the Onfido SDK capture. Deliberately looks like a test harness
 * rather than a real capture step — nobody should mistake this for the finished
 * screen, and it is unreachable unless VERIFICATION_SIMULATE=true on the API.
 */
export function SimulatedCapture({ captureToken }: { captureToken: string }) {
  const t = useTranslations('identityCheck.simulated');
  const router = useRouter();
  const [state, action, pending] = useActionState(submitCaptureAction, initial);

  useEffect(() => {
    if (state.status === 'done') router.push('/status');
  }, [state.status, router]);

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-dashed p-4"
      style={{ borderColor: 'var(--color-muted)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
        {t('banner')}
      </p>
      <p className="text-sm">{t('prompt')}</p>
      <input type="hidden" name="captureToken" value={captureToken} />
      <div className="space-y-2">
        {OUTCOMES.map(({ value, tone }) => (
          <button
            key={value}
            type="submit"
            name="outcome"
            value={value}
            disabled={pending}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: tone }}
          >
            {t(`outcome.${value}`)}
          </button>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('abandonHint')}</p>
      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{state.message}</p>
      )}
    </form>
  );
}
