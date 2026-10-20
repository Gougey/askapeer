import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/lib/onboarding';
import { BrandLockup } from '@/components/Brand';
import { AcknowledgeForm } from './AcknowledgeForm';

// A7 — onboarding setup: the anonymity acknowledgement (mandated surface, screen spec
// §1.4) plus the interests step.
export default async function OnboardingSetupPage() {
  await requireSession('/onboarding/setup');
  const t = await getTranslations('onboarding.setup');

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <BrandLockup className="mx-auto h-14 w-auto" />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <section className="space-y-3 rounded-lg p-4" style={{ background: 'var(--color-surface)' }}>
        <h2 className="font-semibold">{t('ruleHeading')}</h2>
        <p className="text-sm">{t('rule')}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--color-bad)' }}>
          {t('ruleConsequence')}
        </p>
      </section>

      {/* No clinical-interests block: interests play no part in the app any more (My Research
          answers the criteria a member sets), so promising them here was a promise to nothing. */}
      <AcknowledgeForm />
    </main>
  );
}
