import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { InfiniteList } from '@/components/InfiniteList';
import { isEvidence } from '@/lib/evidence';
import { fetchVocabulary } from '@/lib/forum';
import {
  fetchFeed,
  fetchFeedCriteria,
  feedFilterParams,
  type FeedFilters,
  type FeedSort,
} from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { FilterPanel } from './FilterPanel';
import { loadMoreArticles } from './load-more';

const SORTS: FeedSort[] = ['for_you', 'newest', 'relevance'];

/**
 * My Research (screen B1) — research scored against the clinical taxonomy, and since
 * Andrew's review item 6, filterable in place.
 *
 * **The filters live in the URL, not in component state.** A filtered feed is then a real
 * link: bookmarkable, shareable, and undone by the back button — and this stays a server
 * component with no client copy of the results to drift from the server's. It is the same
 * choice search made.
 *
 * ⚠️ **An empty URL is not the same as no filters.** A member can save standing criteria,
 * so arriving with nothing asked for means "give me my settings", while `?f=1` means "this
 * URL is the whole truth, including the parts of it that are empty". Without that
 * distinction, clearing the panel would silently restore the saved criteria.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    q?: string;
    tag?: string | string[];
    evidence?: string;
    years?: string;
    sort?: string;
    f?: string;
  }>;
}) {
  const params = await searchParams;
  const token = await requireAccessToken();

  // Express gives one repeated param as a string and several as an array; Next does the
  // same, so both shapes have to be handled or a single tag filter silently vanishes.
  const urlTags =
    params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];
  const years = Number(params.years);
  const sort = SORTS.find((value) => value === params.sort);
  const asked = Boolean(
    params.f || params.q?.trim() || urlTags.length > 0 || params.evidence || params.years || sort,
  );

  const [t, { tags }, saved] = await Promise.all([
    getTranslations('feed'),
    fetchVocabulary(token),
    // Only worth a round trip when the URL has not already answered the question.
    asked ? Promise.resolve(null) : fetchFeedCriteria(token),
  ]);

  const filters: FeedFilters = asked
    ? {
        q: params.q?.trim() || undefined,
        tags: urlTags,
        evidence: isEvidence(params.evidence) ? params.evidence : undefined,
        years: Number.isInteger(years) && years >= 1 && years <= 5 ? years : undefined,
        sort,
        applied: true,
      }
    : {
        q: saved?.query || undefined,
        evidence: saved?.evidence,
        years: saved?.periodYears,
        sort: saved?.sort,
      };

  /*
   * ⚠️ **The saved tags are shown but not sent.** They *are* the member's clinical interests,
   * which the feed already applies — resending them as a tag *override* would produce the
   * same articles under the wrong name: the API would call the page `filtered`, and the
   * screen would stop offering "choose your interests" to the very people who have none set
   * up properly. The panel shows them because they are genuinely what is shaping the page.
   */
  const panelFilters: FeedFilters = asked ? filters : { ...filters, tags: saved?.tagIds ?? [] };

  const { articles, nextCursor, mode } = await fetchFeed(token, params.cursor, filters);

  /*
   * ⚠️ **The infinite-scroll history is per filter set.** `InfiniteList` replays the cursors
   * it saved under `storageKey`, and a cursor is only an offset into one particular result
   * set — replaying yesterday's offsets against a newly filtered feed splices pages of a
   * different list into this one. Keying the store by the filters means a change starts a
   * fresh history and going back to a previous filter finds its own.
   */
  const filterKey = feedFilterParams(filters).toString();
  // Counted from what is *sent*, not from what the panel shows — see `active` on the panel.
  const active =
    (filters.q ? 1 : 0) +
    (filters.tags?.length ? 1 : 0) +
    (filters.evidence ? 1 : 0) +
    (filters.years ? 1 : 0) +
    (filters.sort && filters.sort !== 'for_you' ? 1 : 0);
  const storageKey = filterKey ? `feed?${filterKey}` : 'feed';
  const moreHref = (cursor: string) => {
    const next = feedFilterParams(filters);
    next.set('cursor', cursor);
    return `/feed?${next.toString()}`;
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      <FilterPanel
        tags={tags}
        filters={panelFilters}
        active={active}
        /*
         * Open whenever this visit is about filtering at all, for the reason the search form
         * opens: arriving on a feed that has been narrowed — by a bookmark, a link, the back
         * button or your own saved settings — and seeing a short list with no control on
         * screen explaining why is the confusing case worth the vertical space. It stays open
         * after Clear too, which is where the next thing a member does is filter again.
         */
        defaultOpen={filterKey !== ''}
      />

      {/*
        Say which feed this is, and only when it is not the one the member chose. A
        personalised feed needs no explanation; a general or fallback one does, or it looks
        like the interests were ignored. A *filtered* one needs none either — the panel above
        is the explanation, and it is open.
      */}
      {(mode === 'general' || mode === 'fallback') && (
        <div
          className="flex flex-col border"
          style={{
            gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-navy-tint-2)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {mode === 'fallback' ? t('fallbackNote') : t('generalNote')}
          </p>
          <Link
            href="/settings/interests"
            className="self-start text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('personalise')}
          </Link>
        </div>
      )}

      {articles.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {/* A filtered feed that matches nothing has a different answer from an empty one:
              the corpus is fine, the question was narrow. */}
          {mode === 'filtered' ? t('noMatches') : t('empty')}
        </p>
      ) : (
        <InfiniteList
          initialCursor={nextCursor}
          loadMore={loadMoreArticles.bind(null, filters)}
          storageKey={storageKey}
          fallbackHref={nextCursor ? moreHref(nextCursor) : null}
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
