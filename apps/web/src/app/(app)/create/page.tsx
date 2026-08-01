import { getTranslations } from 'next-intl/server';
import { requireAccessToken } from '@/lib/session';
import { fetchVocabulary } from '@/lib/forum';
import { ComposeQuestionForm } from './ComposeQuestionForm';
import { ComposeTypeSwitch } from './ComposeTypeSwitch';

/**
 * Compose a question (screens D1/D2) — the immediate-publish path. A case discussion is
 * the other kind of post and lives at `/create/case`, behind EPIC-E's checklist and
 * attestation gate; the switch above the form is the only route between them.
 */
export default async function CreatePage() {
  const token = await requireAccessToken();
  const [t, { categories, tags }] = await Promise.all([
    getTranslations('compose'),
    fetchVocabulary(token),
  ]);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">{t('heading')}</h1>
      <ComposeTypeSwitch active="question" />
      <ComposeQuestionForm categories={categories} tags={tags} />
    </main>
  );
}
