'use server';

import { ArticleCard } from '@/components/ArticleCard';
import type { InfinitePage } from '@/components/InfiniteList';
import { fetchFeed, type FeedFilters } from '@/lib/research-feed';
import { getAccessToken } from '@/lib/session';

/**
 * Next page, already rendered — same pattern as the Discussions list.
 *
 * ⚠️ **The criteria are bound in by the page**, not read from the URL here: a server action
 * has no URL. Without them page two of a search is page two of the *whole corpus*, which is
 * worse than no filtering at all — it looks like the criteria stopped working halfway down.
 */
export async function loadMoreArticles(
  filters: FeedFilters,
  cursor: string,
): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { articles, nextCursor } = await fetchFeed(token, cursor, filters);
  return {
    node: (
      <>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </>
    ),
    nextCursor,
  };
}
