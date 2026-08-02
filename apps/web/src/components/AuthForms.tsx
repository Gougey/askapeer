'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { registerAction, requestLinkAction, type AuthState } from '@/app/actions';

const initial: AuthState = { status: 'idle' };

const field = 'w-full rounded-lg border px-3 py-2 text-sm';
const button =
  'w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60';

function SentNotice({ devLink }: { devLink?: string }) {
  const t = useTranslations('auth');
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{t('checkEmailTitle')}</p>
      <p style={{ color: 'var(--color-muted)' }}>{t('checkEmailBody')}</p>
      {devLink && (
        <a
          href={devLink}
          className={button}
          style={{ background: 'var(--color-accent)', display: 'inline-block', textAlign: 'center' }}
        >
          {t('devOpenLink')}
        </a>
      )}
    </div>
  );
}

export function SignInForm() {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState(requestLinkAction, initial);
  if (state.status === 'sent') return <SentNotice devLink={state.devLink} />;
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>{t('email')}</span>
        {/*
          `type="email"` alone is not enough on a phone: several Android keyboards still
          auto-capitalise the first letter, and predictive text will happily "correct" an
          address. The value is lower-cased server-side regardless (see the API's
          NormaliseEmail), so this is about not showing the member a capital they did not
          ask for — not about correctness.

          Not `text-transform: lowercase`: that restyles the display and leaves the
          submitted value untouched, which is the worst of both — it looks fixed and isn't.
        */}
        <input
          name="email"
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="email"
          required
          className={field}
        />
      </label>
      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{state.message}</p>
      )}
      <button type="submit" disabled={pending} className={button} style={{ background: 'var(--color-accent)' }}>
        {pending ? t('sending') : t('sendLink')}
      </button>
      <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('noAccount')} <Link href="/register" className="underline">{t('register')}</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState(registerAction, initial);
  if (state.status === 'sent') return <SentNotice devLink={state.devLink} />;
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>{t('legalName')}</span>
        <input name="legalName" required className={field} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('email')}</span>
        {/*
          `type="email"` alone is not enough on a phone: several Android keyboards still
          auto-capitalise the first letter, and predictive text will happily "correct" an
          address. The value is lower-cased server-side regardless (see the API's
          NormaliseEmail), so this is about not showing the member a capital they did not
          ask for — not about correctness.

          Not `text-transform: lowercase`: that restyles the display and leaves the
          submitted value untouched, which is the worst of both — it looks fixed and isn't.
        */}
        <input
          name="email"
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="email"
          required
          className={field}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('professionalBody')}</span>
        <select name="professionalBody" required className={field} defaultValue="hcpc">
          <option value="hcpc">HCPC</option>
          <option value="gmc">GMC</option>
          <option value="basrat">BASRAT</option>
          <option value="sst">SST</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('registrationNumber')}</span>
        <input name="registrationNumber" required className={field} />
      </label>
      <p className="rounded-lg p-3 text-xs" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
        {t('anonymityNotice')}
      </p>
      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{state.message}</p>
      )}
      <button type="submit" disabled={pending} className={button} style={{ background: 'var(--color-accent)' }}>
        {pending ? t('registering') : t('createAccount')}
      </button>
      <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('haveAccount')} <Link href="/" className="underline">{t('signIn')}</Link>
      </p>
    </form>
  );
}
