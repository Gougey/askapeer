import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PostCard } from '@/components/PostCard';
import { fetchSearch, fetchVocabulary } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { SearchForm } from './SearchForm';

/**
 * Search (screen C3, EPIC-C §4).
 *
 * State lives in the URL rather than in the component: the form is a GET form, so a search
 * is a link — bookmarkable, shareable, and survivable across a reload. That also makes the
 * page a server component with no client state to reconcile.
 *
 * Results reuse the Discussions card, so a result looks like what it is rather than like a
 * second, subtly different kind of row.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string | string[]; cursor?: string }>;
}) {
  const params = await searchParams;
  const token = await requireAccessToken();
  const q = (params.q ?? '').trim();
  const category = params.category ?? '';
  // Express gives one repeated param as a string and several as an array; Next does the
  // same, so both shapes have to be handled or a single tag filter silently vanishes.
  const tagIds = params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];

  // Any one of the three controls counts as a search. Gating on `q` alone left the two
  // filters unable to act on their own — a category or a tag subtree is a perfectly good
  // thing to ask for, and there are no words that would express it better.
  const searched = q !== '' || category !== '' || tagIds.length > 0;

  const [t, { categories, tags }, results] = await Promise.all([
    getTranslations('search'),
    fetchVocabulary(token),
    searched
      ? fetchSearch(token, { q, category, tags: tagIds, cursor: params.cursor })
      : Promise.resolve(null),
  ]);

  const nextHref = () => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (category) next.set('category', category);
    for (const tag of tagIds) next.append('tag', tag);
    if (results?.nextCursor) next.set('cursor', results.nextCursor);
    return `/search?${next.toString()}`;
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>

      <SearchForm
        categories={categories}
        tags={tags}
        initialQuery={q}
        initialCategory={category}
        initialTagIds={tagIds}
      />

      {results === null ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('idle')}
        </p>
      ) : (
        <section className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }} aria-live="polite">
            {results.posts.length === 0
              ? t('noResults')
              : results.didYouMean
                ? /* Trigram fallback: nothing matched the words as typed. Saying so is the
                     difference between a helpful near-miss and results that look wrong. */
                  t('didYouMean', { count: results.posts.length, query: q })
                : t('resultCount', { count: results.posts.length })}
          </p>

          {results.posts.length > 0 && (
            <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
              {results.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </ul>
          )}

          {results.nextCursor && (
            <Link
              href={nextHref()}
              className="w-full border px-3 py-2 text-center text-sm font-medium"
              style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
            >
              {t('more')}
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
