'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { signOutEverywhereAction } from './actions';

/**
 * Sign out on every device (F8, security).
 *
 * Behind a confirmation because it is irreversible from the member's side and lands on
 * *other* devices they cannot see — the phone in their bag is signed out too, and there is
 * no undo. Not a destructive-red control though: this is the safe thing to do when you have
 * lost a device, and colouring it like a mistake discourages exactly the person who most
 * needs to press it.
 */
export function SignOutEverywhere() {
  const t = useTranslations('settings.security');
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      className="flex flex-col border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-4)',
        gap: 'var(--space-2)',
      }}
    >
      <h2 className="text-sm font-semibold">{t('heading')}</h2>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('body')}
      </p>

      {confirming ? (
        <form action={signOutEverywhereAction} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <p className="text-sm font-medium">{t('confirm')}</p>
          <div className="flex" style={{ gap: 'var(--space-2)' }}>
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
            >
              {t('confirmCta')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--color-border-strong)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-accent)',
          }}
        >
          {t('cta')}
        </button>
      )}
    </section>
  );
}
