'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createHandleAction, type HandleState } from '../actions';

type Reason = 'taken' | 'invalid_format' | 'blocklisted';

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'unavailable'; reason: Reason };

/** Long enough that a typist isn't firing a request per keystroke, short enough to feel live. */
const DEBOUNCE_MS = 350;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('onboarding.handle');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg px-3 py-2 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

export function ChooseHandleForm() {
  const t = useTranslations('onboarding.handle');
  const [state, formAction] = useActionState<HandleState, FormData>(createHandleAction, {
    status: 'idle',
  });
  const [name, setName] = useState('');
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });

  useEffect(() => {
    if (name.length === 0) {
      setAvailability({ state: 'idle' });
      return;
    }
    setAvailability({ state: 'checking' });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle-availability?name=${encodeURIComponent(name)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { available: boolean; reason?: Reason };
        setAvailability(
          data.available
            ? { state: 'available' }
            : { state: 'unavailable', reason: data.reason ?? 'taken' },
        );
      } catch {
        // Aborted by the next keystroke, or offline — leave the last state alone rather
        // than flashing an error the member can't act on. Submit re-validates anyway.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  // The server's answer is authoritative — if it rejected the name, say so even though
  // the advisory check may have said otherwise a moment earlier.
  const rejection = state.status === 'error' ? state.reason : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-left">
        <span className="text-sm font-medium">{t('label')}</span>
        <input
          name="handleName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('placeholder')}
          className="rounded-lg border px-3 py-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        />
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('rules')}</span>
      </label>

      <p className="min-h-5 text-sm" aria-live="polite">
        {rejection ? (
          <span style={{ color: 'var(--color-bad)' }}>{t(`unavailable.${rejection}`)}</span>
        ) : availability.state === 'checking' ? (
          <span style={{ color: 'var(--color-muted)' }}>{t('checking')}</span>
        ) : availability.state === 'available' ? (
          <span style={{ color: 'var(--color-ok)' }}>{t('available', { name })}</span>
        ) : availability.state === 'unavailable' ? (
          <span style={{ color: 'var(--color-bad)' }}>{t(`unavailable.${availability.reason}`)}</span>
        ) : null}
      </p>

      {state.status === 'error' && !rejection && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{t('error')}</p>
      )}

      <SubmitButton disabled={availability.state !== 'available'} />
    </form>
  );
}
