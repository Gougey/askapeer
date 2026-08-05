import { getTranslations } from 'next-intl/server';
import { fetchVocabulary } from '@/lib/forum';
import { fetchMyInterests } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { InterestPicker } from './InterestPicker';

/**
 * F5 — the clinical interests that shape the research feed.
 *
 * Under settings rather than on the Feed tab: it is configuration you set occasionally, not
 * something you do while reading. The Feed links here when it has nothing personalised to
 * show, which is the moment a member actually wants it.
 */
export default async function InterestsPage() {
  const token = await requireAccessToken();
  const [t, { tags }, selected] = await Promise.all([
    getTranslations('interests'),
    fetchVocabulary(token),
    fetchMyInterests(token),
  ]);

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <h1 className="text-xl font-semibold">{t('heading')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('body')}
        </p>
      </div>

      <InterestPicker tags={tags} initialSelected={selected} />
    </main>
  );
}
