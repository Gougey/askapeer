import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { PostCard } from '@/components/PostCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EVIDENCE_TYPES, isEvidence } from '@/lib/evidence';
import { fetchSearch, fetchVocabulary } from '@/lib/forum';
import { fetchFeedSearch } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { categoryColour } from '@/lib/category-colour';
import { ResultFilter } from './ResultFilter';
import { SearchForm } from './SearchForm';

type Scope = 'discussions' | 'papers';

/**
 * Search (screen C3, EPIC-C §4 and S16/S17).
 *
 * State lives in the URL rather than in the component: the form is a GET form, so a search
 * is a link — bookmarkable, shareable, and survivable across a reload. That also makes the
 * page a server component with no client state to reconcile.
 *
 * **Both corpora are searched, and the tabs are the scope control.** There is no "search
 * discussions / papers / both" selector before the fact, because a count is a better
 * answer than a question: the tabs say where the results are, which a control asked
 * beforehand cannot. The scope rides in the URL as `?in=`, so a result stays shareable and
 * the back button moves between panes.
 *
 * The two searches run in parallel and are counted independently — relevance scores from
 * member-written posts and from academic abstracts are not comparable, so they are never
 * merged into one ranked list.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    evidence?: string;
    tag?: string | string[];
    cursor?: string;
    in?: string;
  }>;
}) {
  const params = await searchParams;
  const token = await requireAccessToken();
  const q = (params.q ?? '').trim();
  const category = params.category ?? '';
  // Express gives one repeated param as a string and several as an array; Next does the
  // same, so both shapes have to be handled or a single tag filter silently vanishes.
  const tagIds = params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];
  // Post-search refinements. Each belongs to one tab, is applied to that tab's results, and
  // is simply not sent to the corpus that cannot answer it.
  const evidence = isEvidence(params.evidence) ? params.evidence : '';

  // Any one of these counts as a search. Gating on `q` alone left the filters unable to act
  // on their own — a category or a tag subtree is a perfectly good thing to ask for, and
  // there are no words that would express it better.
  const searched = q !== '' || category !== '' || tagIds.length > 0;

  const [t, tFeed, { categories, tags }, posts, papers] = await Promise.all([
    getTranslations('search'),
    getTranslations('feed'),
    fetchVocabulary(token),
    searched
      ? fetchSearch(token, { q, category, tags: tagIds, cursor: params.cursor })
      : Promise.resolve(null),
    /*
     * Papers take the query and the tags — a tag is *clinical* vocabulary and articles carry
     * the same taxonomy — but never the category, which is forum vocabulary with no meaning
     * here. So a tag-only search now reaches both corpora, where before it silently reached
     * one; only a category-only search is still a discussions-only question.
     */
    searched && (q !== '' || tagIds.length > 0)
      ? fetchFeedSearch(token, { q, tags: tagIds, evidence: evidence || undefined, cursor: params.cursor })
      : Promise.resolve(null),
  ]);

  /*
   * Which pane opens. Landing on an empty tab while the other holds twenty results makes
   * the search look broken, so an explicit `?in=` wins, and otherwise the tab with
   * something in it does. Discussions leads on a tie: it is what the community is for.
   */
  const requested = params.in === 'papers' ? 'papers' : params.in === 'discussions' ? 'discussions' : null;
  const scope: Scope =
    requested ?? ((posts?.total ?? 0) === 0 && (papers?.total ?? 0) > 0 ? 'papers' : 'discussions');

  /*
   * Every link out of this screen rebuilds the whole query, so a refinement survives paging
   * and tab switching. `cursor` is deliberately *not* carried by default: changing a filter
   * or a tab is a new first page, and only the pager asks for an offset.
   */
  const href = (next: { in?: Scope; cursor?: string; category?: string; evidence?: string }) => {
    const url = new URLSearchParams();
    if (q) url.set('q', q);
    const nextCategory = next.category ?? category;
    const nextEvidence = next.evidence ?? evidence;
    if (nextCategory) url.set('category', nextCategory);
    if (nextEvidence) url.set('evidence', nextEvidence);
    for (const tag of tagIds) url.append('tag', tag);
    if (next.in) url.set('in', next.in);
    if (next.cursor) url.set('cursor', next.cursor);
    return `/search?${url.toString()}`;
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      <SearchForm tags={tags} initialQuery={q} initialTagIds={tagIds} />

      {!searched ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('idle')}
        </p>
      ) : (
        <section className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          {/* A zero is shown rather than hidden: "Papers 0" is an answer, an absent tab is
              a member wondering whether it searched at all. */}
          <SegmentedControl
            label={t('tabsLabel')}
            segments={[
              {
                href: href({ in: 'discussions' }),
                label: t('tabDiscussions', { count: posts?.total ?? 0 }),
                active: scope === 'discussions',
              },
              {
                href: href({ in: 'papers' }),
                label: t('tabPapers', { count: papers?.total ?? 0 }),
                active: scope === 'papers',
              },
            ]}
          />

          {scope === 'discussions' ? (
            <>
              {/* Refines these results, and appears only here — a category cannot narrow a
                  paper, so it is not offered on the tab where it would do nothing. */}
              <ResultFilter
                name="category"
                label={t('categoryLabel')}
                value={category}
                allLabel={t('anyCategory')}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  colour: categoryColour(c.colour),
                  href: href({ in: 'discussions', category: c.id }),
                }))}
                allHref={href({ in: 'discussions', category: '' })}
              />

              <p className="text-sm" style={{ color: 'var(--color-muted)' }} aria-live="polite">
                {(posts?.total ?? 0) === 0
                  ? t('noResultsDiscussions')
                  : posts?.didYouMean
                    ? /* Trigram fallback: nothing matched the words as typed. Saying so is
                         the difference between a helpful near-miss and results that look
                         wrong — and the count is of close matches, not exact ones. */
                      t('didYouMean', { count: posts.total, query: q })
                    : t('resultCount', { count: posts?.total ?? 0 })}
              </p>

              {(posts?.posts.length ?? 0) > 0 && (
                <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  {posts!.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </ul>
              )}

              {posts?.nextCursor && (
                <Link
                  href={href({ in: 'discussions', cursor: posts.nextCursor })}
                  className="w-full border px-3 py-2 text-center text-sm font-medium"
                  style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
                >
                  {t('more')}
                </Link>
              )}
            </>
          ) : (
            <>
              {/* The counterpart to the category control on the other tab: evidence type is
                  a property of a paper and means nothing to a discussion. */}
              <ResultFilter
                name="evidence"
                label={t('evidenceLabel')}
                value={evidence}
                allLabel={t('anyEvidence')}
                options={EVIDENCE_TYPES.map((type) => ({
                  value: type,
                  label: tFeed(`evidence.${type}`),
                  href: href({ in: 'papers', evidence: type }),
                }))}
                allHref={href({ in: 'papers', evidence: '' })}
              />

              <p className="text-sm" style={{ color: 'var(--color-muted)' }} aria-live="polite">
                {(papers?.total ?? 0) === 0
                  ? t('noResultsPapers')
                  : t('papersCount', { count: papers?.total ?? 0 })}
              </p>

              {/* A category is the one thing that still cannot cross, so it is the one thing
                  still worth saying — and only when it is actually set. */}
              {category !== '' && (
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {t('categoryDiscussionsOnly')}
                </p>
              )}

              {(papers?.articles.length ?? 0) > 0 && (
                <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  {papers!.articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </ul>
              )}

              {papers?.nextCursor && (
                <Link
                  href={href({ in: 'papers', cursor: papers.nextCursor })}
                  className="w-full border px-3 py-2 text-center text-sm font-medium"
                  style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
                >
                  {t('morePapers')}
                </Link>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
