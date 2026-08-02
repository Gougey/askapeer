import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { PostCard } from '@/components/PostCard';
import { fetchMyContributions, type MyCommentCard } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';
import { BackToStart, LoadMore } from '@/components/LoadMore';

/**
 * One of my answers. Deliberately lighter than a `PostCard`: this list is about what I
 * wrote and how it landed, so the row leads with the answer and names the thread beneath
 * it — and carries no author line, since the author is always the reader.
 */
async function MyAnswerCard({ comment }: { comment: MyCommentCard }) {
  const t = await getTranslations('activity');
  const format = await getFormatter();

  return (
    <li
      className="border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Link href={`/discussions/${comment.post.id}`} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        <p className="text-sm">{comment.snippet}</p>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('mine.onThread', { title: comment.post.title })}
        </span>
        <span className="flex items-center justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span
            className="flex items-center gap-1 font-semibold"
            style={{ color: 'var(--color-kudos-text)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              className="size-[15px]"
              style={{ color: 'var(--color-kudos)' }}
            >
              <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
            </svg>
            {comment.kudosCount}
          </span>
          <span>{format.relativeTime(new Date(comment.createdAt))}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * E2 — my questions and answers, published only. Drafts and corrections are a different
 * screen with a different job (D4, EPIC-E) and deliberately do not appear here.
 */
/**
 * E2 — my questions and my answers.
 *
 * Two lists, two cursors (`q` and `a`). Paging one must not reset the other, so each keeps
 * its own place in the URL — a single shared `cursor` would silently send the other list
 * back to its first page.
 */
export default async function MyActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; a?: string }>;
}) {
  const { q: postsCur, a: commentsCur } = await searchParams;
  const token = await requireAccessToken();
  const [t, { posts, comments, postsCursor, commentsCursor }] = await Promise.all([
    getTranslations('activity'),
    fetchMyContributions(token, { posts: postsCur, comments: commentsCur }),
  ]);

  // Preserve the other list's position when paging this one.
  const href = (next: { q?: string | null; a?: string | null }) => {
    const params = new URLSearchParams();
    const qv = next.q === undefined ? postsCur : next.q;
    const av = next.a === undefined ? commentsCur : next.a;
    if (qv) params.set('q', qv);
    if (av) params.set('a', av);
    const s = params.toString();
    return s ? `/activity/mine?${s}` : '/activity/mine';
  };

  if (posts.length === 0 && comments.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center" style={{ gap: 'var(--space-3)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('empty.mine')}
        </p>
        <Link
          href="/create"
          className="px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-pill)' }}
        >
          {t('empty.mineCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      {(postsCur || commentsCur) && <BackToStart href="/activity/mine" />}
      {posts.length > 0 && (
        <section className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
            {t('mine.questions')}
          </h2>
          <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ul>
          {postsCursor && <LoadMore href={href({ q: postsCursor })} labelKey="older" />}
        </section>
      )}

      {comments.length > 0 && (
        <section className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
            {t('mine.answers')}
          </h2>
          <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            {comments.map((comment) => (
              <MyAnswerCard key={comment.id} comment={comment} />
            ))}
          </ul>
          {commentsCursor && <LoadMore href={href({ a: commentsCursor })} labelKey="older" />}
        </section>
      )}
    </div>
  );
}
