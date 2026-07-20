import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchPosts } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';

/**
 * The Discussions list (screen C1), chronological. The personalised feed and trending
 * fallback are S7 — until then newest-first is the whole ordering, which at seed-period
 * volumes is also the most useful one.
 */
export default async function DiscussionsPage() {
  const token = await requireAccessToken();
  const [t, { posts }] = await Promise.all([getTranslations('discussions'), fetchPosts(token)]);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('empty')}
          </p>
          <Link
            href="/create"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </main>
  );
}
