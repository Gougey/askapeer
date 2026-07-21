import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { fetchThread } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { AuthorLine, TagList } from '@/components/PostCard';

/**
 * A question thread (screen C4), read-only in S4 — answering, kudos and the ranked
 * ordering are S5, which is where the thread becomes the thesis rather than a page.
 */
export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const token = await requireAccessToken();
  const thread = await fetchThread(postId, token);
  // Covers a removed post and an author-private draft alike — the API returns 404 for
  // both, deliberately, since "this exists but isn't for you" is itself a disclosure.
  if (!thread) notFound();

  const [t, format] = await Promise.all([getTranslations('discussions'), getFormatter()]);
  const { post } = thread;

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <article className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
          {post.category.name}
        </span>
        <h1 className="text-xl font-semibold">{post.title}</h1>
        <AuthorLine author={post.author} />
        {/* Member-authored prose: rendered as text, with newlines preserved. No HTML or
            markdown is interpreted, so a post can't inject markup into anyone's page. */}
        <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        <TagList tags={post.tags} />
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {format.relativeTime(new Date(post.createdAt))}
          {post.editedAt && ` · ${t('edited')}`}
        </span>
      </article>

      <section className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--color-muted)' }}>
        <h2 className="text-sm font-medium">{t('answers', { count: post.answerCount })}</h2>
        {thread.comments.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('noAnswers')}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {thread.comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-xl border p-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
              >
                <AuthorLine author={comment.author} />
                <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
