import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { discussionFilterParams, parseDiscussionFilters, type RawDiscussionParams } from '@/lib/discussion-filters';
import { fetchPosts, fetchSearch, fetchTags, type Tag } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';
import { BackToStart } from '@/components/LoadMore';
import { InfiniteList } from '@/components/InfiniteList';
import { loadMorePosts, loadMoreResults } from './load-more';
import { SearchPanel } from './SearchPanel';

/**
 * The Discussions list (screen C1), chronological, and the search over it.
 *
 * Paginated on the API's keyset cursor. It always returned one; this screen used to drop
 * it, which was invisible at 13 seeded posts and hid 45 of 65 the moment the corpus was
 * rebuilt.
 *
 * **One page, two questions.** With nothing asked it is the list, newest first; with criteria
 * in the URL (`SearchPanel`) it is the search, with an offset cursor rather than the keyset,
 * because relevance is not a stable sort key.
 */
export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<RawDiscussionParams>;
}) {
  const params = await searchParams;
  const token = await requireAccessToken();
  // Parsed, not read: see `lib/discussion-filters.ts`. A bad value would be an error page.
  const { asked, ...filters } = parseDiscussionFilters(params);
  // A search pages by offset and the API caps its cursor at 20 characters, so a list cursor
  // carried onto a search URL would be refused rather than ignored.
  const cursor = asked && !/^\d{1,20}$/.test(params.cursor ?? '') ? undefined : params.cursor;

  const [t, list, found, tags] = await Promise.all([
    getTranslations('discussions'),
    asked ? null : fetchPosts(token, cursor),
    asked ? fetchSearch(token, { ...filters, cursor }) : null,
    // Only for a page already showing a search: its panel and summary line need the names.
    asked ? fetchTags(token) : null,
  ]);
  const posts = found?.posts ?? list?.posts ?? [];
  const nextCursor = found?.nextCursor ?? list?.nextCursor ?? null;

  /*
   * ⚠️ The infinite-scroll history is keyed by the criteria, as on My Research. A cursor means
   * something in one result set only, and replaying one search's offsets against another
   * splices in pages from a different list.
   */
  const filterKey = discussionFilterParams(filters).toString();
  const base = filterKey ? `/discussions?${filterKey}` : '/discussions';
  const moreHref = (next: string) =>
    `${base}${filterKey ? '&' : '?'}cursor=${encodeURIComponent(next)}`;

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      {/* Keyed so that tapping the tab, which drops the criteria, gets an empty panel: the
          page's server render changes, but client state would otherwise survive it. A search
          that found nothing opens the panel, since amending it is the only thing left to do. */}
      <SearchPanel
        key={filterKey}
        filters={filters}
        initialTags={tags}
        open={asked && posts.length === 0}
      />

      {/* Paging does not change the pathname, so the app bar's back control is hidden here
          (it treats the tabs as roots). Past page one, this is the way back to the top. */}
      {cursor && <BackToStart href={base} />}

      {found && !cursor && (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }} aria-live="polite">
          {[
            found.total === 0
              ? t('noMatches')
              : found.correctedQuery && filters.q
                ? t('resultsCorrected', {
                    count: found.total,
                    query: filters.q,
                    corrected: found.correctedQuery,
                  })
                : found.didYouMean && filters.q
                  ? t('resultsClose', { count: found.total, query: filters.q })
                  : filters.q
                    ? t('resultsFor', { count: found.total, query: filters.q })
                    : t('resultsAll', { count: found.total }),
            ...tagNames(filters.tags, tags),
            filters.type ? t(`type.${filters.type}`) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {found ? (
        posts.length > 0 && (
          <InfiniteList
            listClassName="flex flex-col gap-3"
            initialCursor={nextCursor}
            loadMore={loadMoreResults.bind(null, filters)}
            storageKey={`ap:list:discussions?${filterKey}`}
            fallbackHref={nextCursor ? moreHref(nextCursor) : null}
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </InfiniteList>
        )
      ) : posts.length === 0 ? (
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
        <InfiniteList
          listClassName="flex flex-col gap-3"
          initialCursor={nextCursor}
          loadMore={loadMorePosts}
          storageKey="ap:list:discussions"
          fallbackHref={nextCursor ? moreHref(nextCursor) : null}
        >
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </InfiniteList>
      )}
    </main>
  );
}

function tagNames(ids: string[], tags: Tag[] | null): string[] {
  return ids.flatMap((id) => tags?.find((tag) => tag.id === id)?.name ?? []);
}
