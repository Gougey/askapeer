import { getTranslations } from 'next-intl/server';
import { signOutAction } from '@/app/actions';
import { SettingsPanel } from './SettingsPanel';

/**
 * Sign out on this device (F8, security).
 *
 * Its own panel beside "sign out everywhere" rather than a stray link, because the two are
 * easy to confuse and the difference matters: this ends the session in front of you and
 * leaves every other device alone. Said in the copy, not left to be inferred from which
 * word is missing.
 *
 * No confirmation step, unlike its neighbour — signing out here costs a member one sign-in
 * on one device, and a dialogue guarding something that cheap trains people to dismiss the
 * one that guards something expensive.
 */
export async function SignOutDevice() {
  const t = await getTranslations('settings.signOutDevice');

  return (
    <SettingsPanel heading={t('heading')} body={t('body')}>
      {/* A form POST, never a link — see signOutAction for why a GET would sign members
          out as a side effect of a prefetch. */}
      <form action={signOutAction}>
        <button
          type="submit"
          className="self-start border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--color-border-strong)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-accent)',
          }}
        >
          {t('cta')}
        </button>
      </form>
    </SettingsPanel>
  );
}
