import { redirect } from 'next/navigation';

/**
 * The combined search screen is gone (November 2026): each tab now searches its own corpus,
 * from a panel at the top. This stays as a redirect because a search was always a URL, so
 * members may have one bookmarked or sent to a colleague.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[]; in?: string }>;
}) {
  const { q, tag, in: scope } = await searchParams;
  const params = new URLSearchParams();
  if (scope === 'papers') {
    // `f` is what tells My Research this URL is a search: see `lib/feed-filters.ts`.
    params.set('f', '1');
    if (q) params.set('q', q);
    redirect(`/feed?${params.toString()}`);
  }
  if (q) params.set('q', q);
  // Anything malformed is dropped by the page it lands on (`lib/discussion-filters.ts`).
  for (const id of [tag ?? []].flat()) params.append('tag', id);
  const query = params.toString();
  redirect(query ? `/discussions?${query}` : '/discussions');
}
