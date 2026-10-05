import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { InfiniteList } from '@/components/InfiniteList';
import { parseFeedFilters, type RawFeedParams } from '@/lib/feed-filters';
import {
  fetchFeed,
  fetchFeedCriteria,
  feedFilterParams,
  type FeedFilters,
} from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { FilterPanel } from './FilterPanel';
import { loadMoreArticles } from './load-more';

/**
 * My Research (screen B1) — the literature, answering the criteria you set.
 *
 * ⚠️ **No personalisation, by decision.** This screen was built around a member's stored
 * clinical interests: it ranked on them, the panel carried a tag row that overrode them, and
 * saving the panel wrote the tags back as interests. Testing changed that thinking. Interests
 * now play **no part** in what appears here. Two members asking the same question get the
 * same page.
 *
 * The taxonomy is untouched and still earns its keep — articles are classified against it on
 * ingest, which is what puts the chips on a card, what the magnifier search narrows by, and
 * what the "placeable at all" bonus in the default ordering rewards. What has gone is the
 * member-relative half.
 *
 * ⚠️ **Nothing is shown until something is asked.** An untouched visit is an empty screen with
 * the panel open, which is the whole shape of the redesign: say what you want, press Apply.
 * The feed is not even fetched until then — `asked` is what gates it.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<RawFeedParams>;
}) {
  const params = await searchParams;
  const token = await requireAccessToken();

  /*
   * ⚠️ **Parsed, not read.** The API validates its query parameters strictly and answers a
   * bad one with a 400, which `apiGet` throws and Next renders as an error page — so a value
   * it would refuse must never leave here. The rule is pinned by
   * `npm run verify:feed-filters -w apps/web` rather than relearned on live.
   */
  const url = parseFeedFilters(params);
  const { asked } = url;

  const [t, saved] = await Promise.all([
    getTranslations('feed'),
    // Standing criteria seed the panel; they never run themselves. Only worth a round trip
    // when the URL has not already said what to ask.
    asked ? Promise.resolve(null) : fetchFeedCriteria(token),
  ]);

  const filters: FeedFilters = asked
    ? { q: url.q, evidence: url.evidence, years: url.years, sort: url.sort, applied: true }
    : {
        q: saved?.query || undefined,
        evidence: saved?.evidence,
        years: saved?.periodYears,
        sort: saved?.sort,
      };

  const page = asked ? await fetchFeed(token, params.cursor, filters) : null;

  /*
   * ⚠️ **The infinite-scroll history is keyed by the criteria.** `InfiniteList` replays the
   * cursors it saved under `storageKey`, and a cursor is only an offset into one particular
   * result set — replaying one search's offsets against another splices in pages of a
   * different list. A change of criteria therefore starts a fresh history, and going back to
   * an earlier search finds its own.
   */
  const filterKey = feedFilterParams(filters).toString();
  const moreHref = (cursor: string) => {
    const next = feedFilterParams(filters);
    next.set('cursor', cursor);
    return `/feed?${next.toString()}`;
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      {/*
        Open until a question has been asked, closed once it has. Arriving is the moment the
        controls matter and there is nothing else on screen to look at; after Apply the
        results are what was wanted, and the panel folds back to its summary line.
      */}
      <FilterPanel filters={filters} open={!asked} />

      {page === null ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('setCriteria')}
        </p>
      ) : page.articles.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('noMatches')}
        </p>
      ) : (
        <InfiniteList
          initialCursor={page.nextCursor}
          loadMore={loadMoreArticles.bind(null, filters)}
          storageKey={filterKey ? `feed?${filterKey}` : 'feed'}
          fallbackHref={page.nextCursor ? moreHref(page.nextCursor) : null}
        >
          <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            {page.articles.map((article) => (
              <ArticleCard key={article.id} article={article} showTags={false} />
            ))}
          </ul>
        </InfiniteList>
      )}
    </main>
  );
}
