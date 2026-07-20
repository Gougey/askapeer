import { getTranslations } from 'next-intl/server';

/**
 * Placeholder for a tab whose slice hasn't landed yet. The shell is proven end-to-end in
 * S3; the tabs fill in behind it. Discussions and Create landed with S4; the two left are
 * feed (S8) and activity (S10).
 */
export async function ComingSoon({ tab }: { tab: 'feed' | 'activity' }) {
  const t = await getTranslations(`shell.comingSoon.${tab}`);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('body')}</p>
    </main>
  );
}
