import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { InfiniteList } from '@/components/InfiniteList';
import { parseFeedFilters, type RawFeedParams } from '@/lib/feed-filters';
import {
  fetchFeed,
  fetchFeedCoverage,
  fetchFeedCriteria,
  fetchSavedCount,
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
 * ⚠️ **Coming back resumes; arriving with nothing prompts.** Returning to this tab reapplies
 * the criteria you last used, so leaving to answer something in Discussions and coming back
 * does not throw away what you were reading. Only a member with *no* criteria at all gets the
 * empty screen, and for them the panel opens itself, because there is nothing else on the page
 * to do.
 *
 * An earlier build cleared on every arrival. Adrian's own words after using it: "you may well
 * want to enter criteria and start browsing the content but need to do something else and
 * return later."
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

  const [t, saved, oldestYear, savedCount] = await Promise.all([
    getTranslations('feed'),
    // Only worth a round trip when the URL has not already said what to ask.
    url.asked ? Promise.resolve(null) : fetchFeedCriteria(token),
    // Needed on every visit, including the ones that fetch no articles: the period control
    // shows its coverage either way. Cached server-side, so this is cheap.
    fetchFeedCoverage(token),
    // Shown even at zero: fifteen strangers have to discover this exists, and a count that
    // only appears once you have used the feature cannot advertise anything.
    fetchSavedCount(token),
  ]);

  const filters: FeedFilters = url.asked
    ? { q: url.q, evidence: url.evidence, years: url.years, sort: url.sort, applied: true }
    : {
        q: saved?.query || undefined,
        evidence: saved?.evidence,
        years: saved?.periodYears,
        sort: saved?.sort,
      };

  /*
   * **What counts as a criterion**, used in three places that must agree: whether to run a
   * search on arrival, whether the panel opens itself, and what the summary line is called.
   * `newest` is the baseline sort, so choosing it is not asking for anything.
   */
  const anyCriteria = Boolean(
    filters.q || filters.evidence || filters.years || (filters.sort && filters.sort !== 'newest'),
  );

  /*
   * ⚠️ A bare `/feed` **with remembered criteria still runs them** — that is what makes coming
   * back feel like coming back. It is not a write: the API only records criteria when `f=1` is
   * present, which only Apply sets, so resuming cannot overwrite what it is resuming.
   */
  const page = url.asked || anyCriteria ? await fetchFeed(token, params.cursor, filters) : null;

  /*
   * ⚠️ **The infinite-scroll history is keyed by the criteria.** `InfiniteList` replays the
   * cursors it saved under `storageKey`, and a cursor is only an offset into one particular
   * result set — replaying one search's offsets against another splices in pages of a
   * different list. A change of criteria therefore starts a fresh history, and going back to
   * an earlier search finds its own.
   */
  /*
   * ⚠️ `f` is stripped from the key on purpose. The same criteria have to produce the same key
   * whether they arrived through Apply (`?f=1&q=…`) or through resuming a bare `/feed` —
   * otherwise leaving the tab and coming back lands on a *different* history and the pages the
   * member had scrolled through are not replayed, which is the thing this change is for.
   */
  const key = feedFilterParams(filters);
  key.delete('f');
  const filterKey = key.toString();
  const moreHref = (cursor: string) => {
    const next = feedFilterParams(filters);
    next.set('cursor', cursor);
    return `/feed?${next.toString()}`;
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <div className="flex items-baseline justify-between" style={{ gap: 'var(--space-3)' }}>
          <h1 className="text-xl font-semibold">{t('heading')}</h1>
          <Link
            href="/feed/saved"
            className="shrink-0 text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('savedLink', { count: savedCount })}
          </Link>
        </div>
        {/*
          Andrew's words, near enough verbatim. A standing description lived here once and was
          removed as saying what the screen already demonstrated — true when the page was a
          feed of articles, and false the moment it began starting empty. A first visit is now
          a heading, a panel and nothing else, which explains itself to nobody.
        */}
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('intro')}
        </p>
      </div>

      {/*
        Open only when there is nothing to show and nothing to resume — then the panel is the
        page, and it should prompt rather than wait to be found. An explicit Apply always
        closes it, even one with no criteria, because folding away is what Apply means.
      */}
      <FilterPanel
        filters={filters}
        open={!url.asked && !anyCriteria}
        anyCriteria={anyCriteria}
        oldestYear={oldestYear}
      />

      {/* No prompt when nothing is set: the line under the heading says what the page is for,
          and the open panel is the instruction. */}
      {page === null ? null : page.articles.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('noMatches')}
        </p>
      ) : (
        <InfiniteList
          listClassName="flex flex-col"
          listStyle={{ gap: 'var(--space-3)' }}
          initialCursor={page.nextCursor}
          loadMore={loadMoreArticles.bind(null, filters)}
          storageKey={filterKey ? `feed?${filterKey}` : 'feed'}
          fallbackHref={page.nextCursor ? moreHref(page.nextCursor) : null}
        >
          {page.articles.map((article) => (
            <ArticleCard key={article.id} article={article} showTags={false} />
          ))}
        </InfiniteList>
      )}
    </main>
  );
}
