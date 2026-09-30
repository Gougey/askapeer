/**
 * Reading the Research feed's filters off a URL.
 *
 * **A plain module with no imports, importable from both sides**, for the reason
 * `lib/evidence.ts` already documents — and because it is checked by
 * `npm run verify:feed-filters -w apps/web`, which imports it directly.
 *
 * ⚠️ **Everything here has to be sanitised, not just narrowed.** The API validates its own
 * query parameters strictly — `whitelist` plus `forbidNonWhitelisted`, and every filter
 * typed — and a rejected parameter comes back as a 400 that `apiGet` turns into a thrown
 * error and Next turns into an error page. So a value the API would refuse must never leave
 * this function: the cost of one bad character in a URL is the whole screen.
 *
 * That is not hypothetical. `?tag=` — a `tag` parameter with an empty value — reached the
 * API as `each value in tag must be a UUID` and took the feed down, because `tag` was the
 * one field passed through unchecked while `q`, `evidence`, `years` and `sort` were all
 * filtered.
 */

/** The three orderings the panel offers. Relevance needs a keyword; the API falls back. */
export const FEED_SORTS = ['for_you', 'newest', 'relevance'] as const;
export type FeedSortValue = (typeof FEED_SORTS)[number];

/** The evidence ladder, as the API names it. Kept in step with `lib/evidence.ts`. */
export const FEED_EVIDENCE = [
  'systematic_review',
  'randomised_trial',
  'cohort_study',
  'case_report',
  'other',
] as const;

/** The periods the panel offers, in years back from now. Relative, never a pair of dates. */
export const FEED_PERIODS = [1, 2, 3, 5] as const;

/**
 * Any UUID version — the taxonomy is seeded with deterministic uuid5 ids, so a version check
 * would reject every real tag.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The shape Next hands a page: a repeated parameter arrives as an array, one as a string. */
export type RawFeedParams = {
  cursor?: string;
  q?: string;
  tag?: string | string[];
  evidence?: string;
  years?: string;
  sort?: string;
  f?: string;
};

export type ParsedFeedFilters = {
  q?: string;
  tags: string[];
  evidence?: (typeof FEED_EVIDENCE)[number];
  years?: number;
  sort?: FeedSortValue;
  /**
   * Did this URL ask for anything?
   *
   * `f` alone counts: it is how Apply says "this URL is the whole truth", so clearing the
   * panel clears the feed rather than silently restoring the member's saved settings.
   */
  asked: boolean;
};

export function parseFeedFilters(params: RawFeedParams): ParsedFeedFilters {
  // Express gives one repeated parameter as a string and several as an array; Next does the
  // same, so both shapes have to be handled or a single tag filter silently vanishes.
  const raw = params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];
  // Deduplicated as well as filtered: a repeated tag is harmless to the query and noise in
  // the URL, and it would inflate the "n on" count the panel shows.
  const tags = [...new Set(raw.filter((value) => UUID.test(value)))];

  const q = params.q?.trim() || undefined;
  const evidence = FEED_EVIDENCE.find((value) => value === params.evidence);
  const sort = FEED_SORTS.find((value) => value === params.sort);
  const years = Number(params.years);
  // Any whole number in range, not only the four the panel offers — an older bookmark
  // asking for 4 years is a perfectly good question, and the API accepts 1 to 5.
  const period = Number.isInteger(years) && years >= 1 && years <= 5 ? years : undefined;

  /*
   * ⚠️ Deliberately asks whether the *raw* parameters were present, not whether they
   * survived. A URL carrying only rubbish has still asked to be filtered, and answering it
   * with the member's saved settings would silently ignore what they typed.
   */
  const asked = Boolean(
    params.f || q || raw.length > 0 || params.evidence || params.years || params.sort,
  );

  return { q, tags, evidence, years: period, sort, asked };
}
