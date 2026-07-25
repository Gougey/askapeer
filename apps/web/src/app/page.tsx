import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/AuthForms';

export default async function SignInPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <picture>
          <source srcSet="/brand/askapeer-lockup-dark.png" media="(prefers-color-scheme: dark)" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/askapeer-lockup.png" alt={t('home.title')} className="h-24 w-auto" />
        </picture>
        <p style={{ color: 'var(--color-muted)' }}>{t('home.tagline')}</p>
      </header>
      <section className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--color-surface)' }}>
        <h2 className="mb-3 text-sm font-medium">{t('auth.signInTitle')}</h2>
        <SignInForm />
      </section>
    </main>
  );
}
