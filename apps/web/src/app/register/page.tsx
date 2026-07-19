import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/components/AuthForms';

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
        <p style={{ color: 'var(--color-muted)' }}>{t('auth.registerTitle')}</p>
      </header>
      <section className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--color-surface)' }}>
        <RegisterForm />
      </section>
    </main>
  );
}
