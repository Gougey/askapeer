import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/components/AuthForms';
import { BrandLockup } from '@/components/Brand';

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <BrandLockup className="h-24 w-auto" />
        <p style={{ color: 'var(--color-muted)' }}>{t('auth.registerTitle')}</p>
      </header>
      <section className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--color-surface)' }}>
        <RegisterForm />
      </section>
    </main>
  );
}
