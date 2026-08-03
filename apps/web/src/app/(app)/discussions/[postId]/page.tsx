import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { fetchThread, type ThreadComment } from '@/lib/forum';
import { fetchCasePolicy, formatOnset } from '@/lib/cases';
import { requireAccessToken } from '@/lib/session';
import { categoryColour } from '@/lib/category-colour';
import { AuthorLine, TagList } from '@/components/PostCard';
import { CaseBody } from './CaseBody';
import { AnswerComposer, ReplyAffordance } from './AnswerComposer';
import { DeleteCommentButton } from './DeleteCommentButton';
import { KudosButton } from './KudosButton';
import { ExclusivePanels } from './ExclusivePanels';
import { ReportButton } from './ReportButton';

/**
 * A question thread (screen C4). Answers are kudos-ranked (EPIC-D §4); replies sit
 * chronologically beneath their answer. Kudos and answering are the S5 loop — "ideas
 * win on merit, not rank" — working end to end.
 */
export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const token = await requireAccessToken();
  const thread = await fetchThread(postId, token);
  // Covers a removed post and an author-private draft alike — the API returns 404 for
  // both, deliberately, since "this exists but isn't for you" is itself a disclosure.
  if (!thread) notFound();

  const [t, format, casePolicy] = await Promise.all([
    getTranslations('discussions'),
    getFormatter(),
    // Only a case discussion needs the disclaimer, and only the API has the canonical
    // wording — so it is fetched for a case and skipped entirely for a question.
    thread.caseDetail ? fetchCasePolicy(token) : Promise.resolve(null),
  ]);
  const { post, viewerContext } = thread;

  // The ranked list is flat; group replies under their parent for indentation.
  const answers = thread.comments.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<string, ThreadComment[]>();
  for (const c of thread.comments) {
    if (c.parentCommentId) {
      repliesByParent.set(c.parentCommentId, [...(repliesByParent.get(c.parentCommentId) ?? []), c]);
    }
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <article className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: categoryColour(post.category.colour) }}>
          {post.category.name}
        </span>
        {/*
          A case discussion's `title` is a truncation of its presenting condition, derived
          for list surfaces — printing it here would state the first field twice, once cut
          short. So the heading carries the two structural facts instead, which are what a
          clinician frames the rest of the case against, and the presenting condition
          appears once, in full, directly beneath.
        */}
        <h1 className="text-xl font-semibold">
          {thread.caseDetail
            ? t('caseHeading', {
                age: t(`caseAge.${thread.caseDetail.ageBand}`),
                onset: formatOnset(thread.caseDetail.onsetDays),
              })
            : post.title}
        </h1>
        <AuthorLine author={post.author} />
        {thread.caseDetail ? (
          // A case discussion renders its structured template (EPIC-E §7), not `post.body`
          // — that column is the flattened projection built for the search index.
          <CaseBody detail={thread.caseDetail} disclaimer={casePolicy?.disclaimer ?? ''} />
        ) : (
          /* Member-authored prose: rendered as text, newlines preserved. No HTML or
             markdown is interpreted, so a post can't inject markup into anyone's page. */
          <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        )}
        <TagList tags={post.tags} />
        <div className="flex items-center gap-3">
          {viewerContext.isAuthor ? (
            <StaticKudos label={t('kudos', { count: post.kudosCount })} />
          ) : (
            <KudosButton
              target="post"
              targetId={post.id}
              initialCount={post.kudosCount}
              initialHasKudosed={viewerContext.hasKudosedPost}
            />
          )}
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {format.relativeTime(new Date(post.createdAt))}
            {post.editedAt && ` · ${t('edited')}`}
          </span>
        </div>
        {/* Reporting the question and — for the anonymity/off-platform case that may not
            attach to any one post — its author's handle (EPIC-F §2, screen X1). Not shown
            on your own content. */}
        {!viewerContext.isAuthor && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Both expand in place, so only one may hold the row at a time. */}
            <ExclusivePanels>
              <ReportButton target="post" targetId={post.id} />
              <ReportButton target="handle" targetId={post.author.handleId} />
            </ExclusivePanels>
          </div>
        )}
      </article>

      <section
        className="flex flex-col gap-4 border-t pt-4"
        style={{ borderColor: 'var(--color-muted)' }}
      >
        <h2 className="text-sm font-medium">{t('answers', { count: post.answerCount })}</h2>

        {answers.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('noAnswers')}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {answers.map((answer) => (
              <li key={answer.id}>
                <Answer postId={post.id} comment={answer} />
                {(repliesByParent.get(answer.id) ?? []).length > 0 && (
                  <ul
                    className="mt-2 flex flex-col gap-2 border-l pl-3"
                    style={{ borderColor: 'var(--color-muted)' }}
                  >
                    {(repliesByParent.get(answer.id) ?? []).map((reply) => (
                      <li key={reply.id}>
                        <Answer postId={post.id} comment={reply} isReply />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-muted)' }}>
          <h3 className="mb-2 text-sm font-medium">{t('yourAnswer')}</h3>
          <AnswerComposer postId={post.id} />
        </div>
      </section>
    </main>
  );
}

/** A single answer or reply row: author + badge, body, kudos, and own-content actions. */
async function Answer({
  postId,
  comment,
  isReply = false,
}: {
  postId: string;
  comment: ThreadComment;
  isReply?: boolean;
}) {
  const t = await getTranslations('discussions');
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
    >
      <AuthorLine author={comment.author} />
      <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {comment.isMine ? (
          <StaticKudos label={t('kudos', { count: comment.kudosCount })} />
        ) : (
          <KudosButton
            target="comment"
            targetId={comment.id}
            initialCount={comment.kudosCount}
            initialHasKudosed={comment.hasKudosed}
          />
        )}
        {/* Reply and Report both expand in place into this row, so they are grouped: while
            one is open the other's trigger is hidden rather than squeezed alongside it. */}
        <ExclusivePanels>
          {/* Replies are chronological conversation, so they don't sprout further nesting
              controls in S5 — only top-level answers can be replied to. */}
          {!isReply && <ReplyAffordance postId={postId} parentCommentId={comment.id} />}
          {!comment.isMine && <ReportButton target="comment" targetId={comment.id} />}
        </ExclusivePanels>
        {comment.isMine && <DeleteCommentButton postId={postId} commentId={comment.id} />}
      </div>
    </div>
  );
}

/** Own content shows the count but no toggle — a handle can't kudos itself. */
function StaticKudos({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-muted)' }}
    >
      {/* Kudos gold is the one status colour (style guide §2.1); the static own-content
          count matches the un-kudosed KudosButton so a thread reads uniformly — just
          without the toggle, since a handle can't kudos itself. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-[15px]"
        style={{ color: 'var(--color-kudos)' }}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
