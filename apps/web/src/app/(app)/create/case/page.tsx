import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchCasePolicy, fetchDrafts } from '@/lib/cases';
import { fetchVocabulary } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { ComposeTypeSwitch } from '../ComposeTypeSwitch';
import { ComposeCaseForm } from './ComposeCaseForm';

/**
 * Compose a case discussion (screens D3/D4) — EPIC-E's gated route.
 *
 * The checklist and attestation wording come from the API rather than this app's own
 * catalog: they are policy the publish route gates on, and a second copy here would be a
 * copy that could disagree with the one being enforced.
 */
export default async function CreateCasePage() {
  const token = await requireAccessToken();
  const [t, { tags }, policy, drafts] = await Promise.all([
    getTranslations('caseCompose'),
    fetchVocabulary(token),
    fetchCasePolicy(token),
    fetchDrafts(token),
  ]);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">{t('heading')}</h1>
      <ComposeTypeSwitch active="case" />
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('intro')}
      </p>

      {drafts.length > 0 && (
        <Link
          href="/activity/drafts"
          className="border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius)' }}
        >
          {t('resumeDrafts', { count: drafts.length })}
        </Link>
      )}

      <ComposeCaseForm tags={tags} policy={policy} />
    </main>
  );
}
