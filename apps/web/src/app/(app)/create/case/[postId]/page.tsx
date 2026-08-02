import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchCasePolicy } from '@/lib/cases';
import { fetchThread, fetchVocabulary } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { ComposeCaseForm } from '../ComposeCaseForm';

/**
 * Resume a saved draft, or fix a case a moderator sent back (EPIC-E §3 step 2).
 *
 * The thread read is the access check: `GET /v1/posts/:id` 404s an unattested draft to
 * everyone but its author, so there is no separate ownership test to get wrong here.
 */
export default async function EditCasePage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const token = await requireAccessToken();
  const [t, thread, { tags }, policy] = await Promise.all([
    getTranslations('caseCompose'),
    fetchThread(postId, token),
    fetchVocabulary(token),
    fetchCasePolicy(token),
  ]);

  if (!thread?.caseDetail || !thread.viewerContext.isAuthor) notFound();
  // A published case is not editable — the attestation describes the text as published,
  // so changing it would leave the record describing something that no longer exists.
  if (thread.post.status !== 'draft' && thread.post.status !== 'needs_correction') notFound();

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">
        {thread.post.status === 'needs_correction' ? t('headingCorrection') : t('headingResume')}
      </h1>
      <ComposeCaseForm
        tags={tags}
        policy={policy}
        draft={{
          postId,
          status: thread.post.status,
          detail: thread.caseDetail,
          tagIds: thread.post.tags.map((tag) => tag.id),
        }}
      />
    </main>
  );
}
