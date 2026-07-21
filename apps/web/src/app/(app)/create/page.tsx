import { getTranslations } from 'next-intl/server';
import { requireAccessToken } from '@/lib/session';
import { fetchVocabulary } from '@/lib/forum';
import { ComposeQuestionForm } from './ComposeQuestionForm';

/**
 * Compose a question (screens D1/D2). Case discussions get their own gated composer in
 * S9 — this screen deliberately only offers the immediate-publish path.
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
      <ComposeQuestionForm categories={categories} tags={tags} />
    </main>
  );
}
