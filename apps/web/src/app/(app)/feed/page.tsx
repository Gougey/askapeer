import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { InfiniteList } from '@/components/InfiniteList';
import { fetchFeed } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { loadMoreArticles } from './load-more';

/**
 * The Feed (screen B1) — research and news scored against the clinical taxonomy.
 *
 * **Unfiltered, deliberately.** How a member picks interests is still open — reuse the
 * 588-node taxonomy, or offer a shorter curated list? — and the honest way to settle that
 * is to look at which tags a real corpus actually produces rather than to guess in advance.
 * So everyone sees the same ranking for now: evidence quality, recency, and a nudge for
 * being placeable in the taxonomy at all. The personalised version replaces one term in
 * that ordering and nothing else on this screen.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const token = await requireAccessToken();
  const [t, { articles, nextCursor }] = await Promise.all([
    getTranslations('feed'),
    fetchFeed(token, cursor),
  ]);

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <h1 className="text-xl font-semibold">{t('heading')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('subheading')}
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('empty')}
        </p>
      ) : (
        <InfiniteList
          initialCursor={nextCursor}
          loadMore={loadMoreArticles}
          storageKey="feed"
          fallbackHref={nextCursor ? `/feed?cursor=${nextCursor}` : null}
        >
          <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </ul>
        </InfiniteList>
      )}
    </main>
  );
}
