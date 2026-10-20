import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchThread, type ThreadComment } from '@/lib/forum';
import { fetchCasePolicy, formatOnset } from '@/lib/cases';
import { requireAccessToken } from '@/lib/session';
import { PostedAt } from '@/components/PostedAt';
import { AuthorLine, TagList } from '@/components/PostCard';
import { CaseCross } from '@/components/StatIcons';
import { CaseBody } from './CaseBody';
import { EditableCommentBody, EditableQuestionBody } from './EditAffordance';
import { EditableCaseBody } from './EditCaseAffordance';
import { AnswerComposer, ReplyAffordance } from './AnswerComposer';
import { OwnThreadUpdate } from './OwnThreadUpdate';
import { DeleteCommentButton } from './DeleteCommentButton';
import { AwardButton } from './AwardButton';
import { FollowButton } from './FollowButton';
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

  const [t, casePolicy] = await Promise.all([
    getTranslations('discussions'),
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
        {/*
          A case discussion's `title` is a truncation of its presenting condition, derived
          for list surfaces — printing it here would state the first field twice, once cut
          short. So the heading carries the two structural facts instead, which are what a
          clinician frames the rest of the case against, and the presenting condition
          appears once, in full, directly beneath.
        */}
        {/*
          Heading, author and body are wrapped together, because editing replaces all three:
          a question's title *is* the heading, and a case's heading is derived from the age
          band and onset the form edits. Swapping only the body left the old title sitting
          above a form containing a title field.
        */}
        {thread.caseDetail ? (
          <EditableCaseBody
            postId={post.id}
            detail={thread.caseDetail}
            policy={casePolicy ?? null}
            canEdit={viewerContext.canEditPost}
          >
            {/* The teal cross marks a case here as on its card (Option B, 20 October). */}
            <h1 className="flex items-start gap-2 text-xl font-semibold">
              <CaseCross label={t('clinicalCase')} />
              <span>
                {t('caseHeading', {
                  age: t(`caseAge.${thread.caseDetail.ageBand}`),
                  onset: formatOnset(thread.caseDetail.onsetDays),
                })}
              </span>
            </h1>
            <AuthorAndDate author={post.author} createdAt={post.createdAt} editedAt={post.editedAt} />
            {/* A case discussion renders its structured template (EPIC-E §7), not `post.body`
                — that column is the flattened projection built for the search index. */}
            <CaseBody detail={thread.caseDetail} disclaimer={casePolicy?.disclaimer ?? ''} />
          </EditableCaseBody>
        ) : (
          <EditableQuestionBody
            postId={post.id}
            title={post.title}
            body={post.body}
            canEdit={viewerContext.canEditPost}
          >
            <h1 className="text-xl font-semibold">{post.title}</h1>
            <AuthorAndDate author={post.author} createdAt={post.createdAt} editedAt={post.editedAt} />
            {/* Member-authored prose: rendered as text, newlines preserved. No HTML or
                markdown is interpreted, so a post can't inject markup into anyone's page. */}
            <p className="whitespace-pre-wrap text-sm">{post.body}</p>
          </EditableQuestionBody>
        )}
        <TagList tags={post.tags} />
        {/*
          The question's three pills (Option B, 20 October 2026): Insightful, Useful and
          Follow, each with icon, count and word. They fit on one line at 390px and wrap
          cleanly when they do not. The author sees the two awards as counts, not buttons —
          a handle cannot award itself — but Follow stays a button, so a busy thread of your
          own can still be muted.
        */}
        <div className="flex flex-wrap items-center gap-2">
          <AwardButton
            kind="insightful"
            target="post"
            targetId={post.id}
            initialCount={post.insightfulCount}
            initialAwarded={viewerContext.hasInsightfulPost}
            own={viewerContext.isAuthor}
          />
          <AwardButton
            kind="useful"
            target="post"
            targetId={post.id}
            initialCount={post.usefulCount}
            initialAwarded={viewerContext.hasUsefulPost}
            own={viewerContext.isAuthor}
          />
          <FollowButton
            postId={post.id}
            initialFollowing={viewerContext.isFollowing}
            initialCount={post.watcherCount}
            countsMe={!viewerContext.isAuthor}
          />
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
        {/*
          No "2 answers" heading and no "No answers yet" line (Adrian, 20 October 2026): with no
          answers the two read "No answers" twice, and the count is already on the card. The
          answers simply follow the rule; an empty thread goes straight to the composer.
        */}
        {answers.length > 0 && (
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

        {/*
          The author gets a link, not an open box. Answering your own thread is allowed and
          useful — a case earns its keep by saying how it turned out — but being prompted to
          "share what you would do, and why" on the question you just asked reads as a
          mistake, and an empty composer under the question looks like an unfinished task.
        */}
        {viewerContext.isAuthor ? (
          <OwnThreadUpdate postId={post.id} />
        ) : (
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-muted)' }}>
            <h3 className="mb-2 text-sm font-medium">{t('yourAnswer')}</h3>
            <AnswerComposer postId={post.id} />
          </div>
        )}
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
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
    >
      {/* Author and date on one line: on a thread it matters whether an answer arrived an
          hour after the question or a year later — clinical advice reads differently either
          side of a guideline change, and without a date there was no way to tell. */}
      <AuthorAndDate author={comment.author} createdAt={comment.createdAt} editedAt={comment.editedAt} />
      {/* Same rule as the post: editing replaces the text rather than appearing beneath it. */}
      <EditableCommentBody
        postId={postId}
        commentId={comment.id}
        body={comment.body}
        canEdit={comment.canEdit}
      >
        <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
      </EditableCommentBody>
      {/* The two awards, then every text link on its own line beneath (Option B). */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AwardButton
          kind="insightful"
          target="comment"
          targetId={comment.id}
          initialCount={comment.insightfulCount}
          initialAwarded={comment.hasInsightful}
          own={comment.isMine}
        />
        <AwardButton
          kind="useful"
          target="comment"
          targetId={comment.id}
          initialCount={comment.usefulCount}
          initialAwarded={comment.hasUseful}
          own={comment.isMine}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* Reply and the two reports all expand in place into this row, so they are grouped:
            while one is open the others' triggers are hidden rather than squeezed alongside. */}
        <ExclusivePanels>
          {/* Replies are chronological conversation, so they don't sprout further nesting
              controls in S5 — only top-level answers can be replied to. */}
          {!isReply && <ReplyAffordance postId={postId} parentCommentId={comment.id} />}
          {!comment.isMine && <ReportButton target="comment" targetId={comment.id} />}
          {!comment.isMine && <ReportButton target="handle" targetId={comment.author.handleId} />}
        </ExclusivePanels>
        {comment.isMine && <DeleteCommentButton postId={postId} commentId={comment.id} />}
      </div>
    </div>
  );
}

/**
 * The handle with its grey standing, and the date on the right. On a thread it matters
 * whether an answer arrived an hour after the question or a year later — clinical advice
 * reads differently either side of a guideline change.
 */
function AuthorAndDate({
  author,
  createdAt,
  editedAt,
}: {
  author: ThreadComment['author'];
  createdAt: string;
  editedAt: string | null;
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      <AuthorLine author={author} />
      <PostedAt iso={createdAt} editedIso={editedAt} className="shrink-0 text-xs" />
    </span>
  );
}
