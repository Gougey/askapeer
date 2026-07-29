import { getTranslations } from 'next-intl/server';

/**
 * Placeholder for a tab whose slice hasn't landed yet. The shell is proven end-to-end in
 * S3; the tabs fill in behind it. Discussions and Create landed with S4, Activity with
 * S10; the last one is feed (S8).
 *
 * Style guide §8.16: calm, centred, one line of plain copy saying what *will* be here.
 * No illustration — this is the pattern the real empty states follow too.
 */
export async function ComingSoon({ tab }: { tab: 'feed' }) {
  const t = await getTranslations(`shell.comingSoon.${tab}`);
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center text-center"
      style={{ gap: 'var(--space-2)', padding: 'var(--space-6)' }}
    >
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('body')}</p>
    </main>
  );
}
