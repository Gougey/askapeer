import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchPosts } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';
import { BackToStart } from '@/components/LoadMore';
import { InfiniteList } from '@/components/InfiniteList';
import { loadMorePosts } from './load-more';

/**
 * The Discussions list (screen C1), chronological. The personalised feed and trending
 * fallback are the rest of S7 — until then newest-first is the whole ordering.
 *
 * Paginated on the API's keyset cursor. It always returned one; this screen used to drop
 * it, which was invisible at 13 seeded posts and hid 45 of 65 the moment the corpus was
 * rebuilt.
 */
export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const token = await requireAccessToken();
  const [t, { posts, nextCursor }] = await Promise.all([
    getTranslations('discussions'),
    fetchPosts(token, cursor),
  ]);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      {/* Search moved to the app bar in S17, where it reaches both corpora rather than
          only this one; a second control here would be the same action twice. */}
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      {/* Paging does not change the pathname, so the app bar's back control is hidden here
          (it treats the tabs as roots). Past page one, this is the way back to the top. */}
      {cursor && <BackToStart href="/discussions" />}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('empty')}
          </p>
          <Link
            href="/create"
            // §8.1 — a primary button is a navy pill, 700.
            className="px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-pill)' }}
          >
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {/*
            The <ul> owns the list and the loader appends into it, so every card — page one
            and every page after — is a sibling <li>. Wrapping the extra pages in their own
            container would nest lists and change what a screen reader announces.
          */}
          <InfiniteList
            initialCursor={nextCursor}
            loadMore={loadMorePosts}
            storageKey="ap:list:discussions"
            fallbackHref={
              nextCursor ? `/discussions?cursor=${encodeURIComponent(nextCursor)}` : null
            }
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </InfiniteList>
        </ul>
      )}
    </main>
  );
}
