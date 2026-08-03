'use server';

import { ArticleCard } from '@/components/ArticleCard';
import type { InfinitePage } from '@/components/InfiniteList';
import { fetchFeed } from '@/lib/research-feed';
import { getAccessToken } from '@/lib/session';

/** Next page, already rendered — same pattern as the Discussions list. */
export async function loadMoreArticles(cursor: string): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { articles, nextCursor } = await fetchFeed(token, cursor);
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
