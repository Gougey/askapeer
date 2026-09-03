'use server';

import { ArticleCard } from '@/components/ArticleCard';
import type { InfinitePage } from '@/components/InfiniteList';
import { fetchFeed } from '@/lib/research-feed';
import { getAccessToken } from '@/lib/session';

/**
 * Next page, already rendered — same pattern as the Discussions list.
 *
 * `evidence` is bound by the page rather than read here, because a server action has no
 * access to the URL that invoked it: without it, scrolling past the first page would quietly
 * return the unfiltered feed.
 */
export async function loadMoreArticles(
  evidence: string | undefined,
  cursor: string,
): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { articles, nextCursor } = await fetchFeed(token, cursor, evidence);
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
