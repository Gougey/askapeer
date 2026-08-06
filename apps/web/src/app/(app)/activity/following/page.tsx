import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PostCard } from '@/components/PostCard';
import { InfiniteList } from '@/components/InfiniteList';
import { fetchFollowedPosts } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { loadMoreFollowed } from './load-more';

/**
 * E3 — discussions I follow (S15 §8).
 *
 * **Threads I did not write in.** Authoring auto-follows, so without that exclusion this
 * pane would list every thread in My Q&A as well, fill up with the member's own content —
 * the content least in need of a watch-list, since it already has a pane — and the two
 * would stop answering different questions. Mine is *how did my contributions land*; this
 * is *what am I watching*. The API draws the line, so the panes cannot drift apart.
 *
 * It exists so a subscription can be revoked. Without a list, a followed thread is
 * reachable only through a notification, and once that notification is read there is no
 * way back to it and no way to turn it off.
 */
export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const token = await requireAccessToken();
  const [t, { posts, nextCursor }] = await Promise.all([
    getTranslations('activity'),
    fetchFollowedPosts(token, cursor),
  ]);

  if (posts.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-16 text-center"
        style={{ gap: 'var(--space-3)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('empty.following')}
        </p>
        <Link
          href="/discussions"
          className="px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-pill)' }}
        >
          {t('empty.followingCta')}
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
      <InfiniteList
        initialCursor={nextCursor}
        loadMore={loadMoreFollowed}
        storageKey="ap:list:following"
        fallbackHref={
          nextCursor ? `/activity/following?cursor=${encodeURIComponent(nextCursor)}` : null
        }
      >
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </InfiniteList>
    </ul>
  );
}
