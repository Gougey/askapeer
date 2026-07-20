import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/lib/onboarding';
import { ChooseHandleForm } from './ChooseHandleForm';

// A6 — choose handle. The first post-verification step (EPIC-B §3).
export default async function ChooseHandlePage() {
  await requireSession('/onboarding/handle');
  const t = await getTranslations('onboarding.handle');

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p style={{ color: 'var(--color-muted)' }}>{t('body')}</p>
      </div>

      <ChooseHandleForm />

      {/* Permanence stated before the choice, not after — it's the part members regret. */}
      <p
        className="rounded-lg p-3 text-sm"
        style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
      >
        {t('permanentWarning')}
      </p>
    </main>
  );
}
