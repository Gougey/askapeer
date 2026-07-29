import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { PostCard } from '@/components/PostCard';
import { fetchMyContributions, type MyCommentCard } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';

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
export default async function MyActivityPage() {
  const token = await requireAccessToken();
  const [t, { posts, comments }] = await Promise.all([
    getTranslations('activity'),
    fetchMyContributions(token),
  ]);

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
        </section>
      )}
    </div>
  );
}
