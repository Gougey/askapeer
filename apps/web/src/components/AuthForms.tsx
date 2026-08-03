'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  registerAction,
  requestLinkAction,
  verifyCodeAction,
  type AuthState,
} from '@/app/actions';

const initial: AuthState = { status: 'idle' };

const field = 'w-full rounded-lg border px-3 py-2 text-sm';
const button =
  'w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60';

/**
 * After the email is sent: the code form, and the dev link when the API exposes one.
 *
 * The code is not a fallback here, it is the primary route for an installed app. Tapping
 * the emailed link on iOS opens the default browser, and a home-screen web app keeps a
 * storage container separate from that browser — so the link signs you in somewhere the
 * installed app cannot see, and it still shows you signed out. Confirmed on a real device.
 * Typing the code keeps sign-in in the context that asked for it.
 */
function SentNotice({ devLink, email }: { devLink?: string; email?: string }) {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState(verifyCodeAction, { status: 'sent', email });

  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{t('checkEmailTitle')}</p>
      <p style={{ color: 'var(--color-muted)' }}>{t('checkEmailBody')}</p>

      <form action={action} className="space-y-3">
        <input type="hidden" name="email" value={state.email ?? email ?? ''} />
        <label className="block space-y-1">
          <span>{t('codeLabel')}</span>
          <input
            name="code"
            /*
             * `inputMode` rather than `type="number"`: a number input strips a leading zero
             * and offers spinner arrows, neither of which a six-digit code wants.
             * `one-time-code` is what makes iOS and Android offer the code straight from
             * the notification, so this is usually one tap rather than any typing.
             */
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            // 16px minimum, or iOS zooms the page on focus — the same trap the tag picker hit.
            className={`${field} text-center tracking-[0.4em]`}
            style={{ fontSize: '16px' }}
          />
        </label>
        {state.message && (
          <p className="text-sm" style={{ color: 'var(--color-bad)' }}>{state.message}</p>
        )}
        <button type="submit" disabled={pending} className={button} style={{ background: 'var(--color-accent)' }}>
          {pending ? t('verifying') : t('verifyCode')}
        </button>
      </form>

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
  if (state.status === 'sent') return <SentNotice devLink={state.devLink} email={state.email} />;
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
  if (state.status === 'sent') return <SentNotice devLink={state.devLink} email={state.email} />;
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
