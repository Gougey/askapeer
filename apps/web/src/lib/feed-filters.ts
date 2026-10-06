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
 * That is not hypothetical. `?tag=` — an empty clinical-tag parameter — reached the API as
 * `each value in tag must be a UUID` and took the feed down, because `tag` was the one field
 * passed through unchecked while the rest were all filtered. The tag row has since been
 * removed from the panel altogether, but the rule it taught is the reason this module exists.
 */

/** The three orderings the panel offers. Relevance needs a keyword; the API falls back. */
export const FEED_SORTS = ['recommended', 'newest', 'relevance'] as const;
export type FeedSortValue = (typeof FEED_SORTS)[number];

/** The evidence ladder, as the API names it. Kept in step with `lib/evidence.ts`. */
export const FEED_EVIDENCE = [
  'systematic_review',
  'randomised_trial',
  'cohort_study',
  'case_report',
  'other',
] as const;

/**
 * The periods the panel offers, in years back from now. Relative, never a pair of dates.
 *
 * 1 / 5 / 10 / 15 since the 25-year backfill. The old 1–5 was generous when the whole corpus
 * was four months old; it became the thing standing between a member and the depth they asked
 * for the moment the history started landing.
 */
export const FEED_PERIODS = [1, 5, 10, 15] as const;

/** The shape Next hands a page. */
export type RawFeedParams = {
  cursor?: string;
  q?: string;
  evidence?: string;
  years?: string;
  sort?: string;
  f?: string;
};

export type ParsedFeedFilters = {
  q?: string;
  evidence?: (typeof FEED_EVIDENCE)[number];
  years?: number;
  sort?: FeedSortValue;
  /**
   * Has this URL asked a question?
   *
   * ⚠️ **This is what decides whether My Research shows anything at all.** The screen starts
   * empty with the panel open; only an Apply fills it. `f` alone counts, because an Apply
   * with every field left empty is still a request — for the whole corpus — and must not be
   * mistaken for an untouched visit.
   */
  asked: boolean;
};

export function parseFeedFilters(params: RawFeedParams): ParsedFeedFilters {
  const q = params.q?.trim() || undefined;
  const evidence = FEED_EVIDENCE.find((value) => value === params.evidence);
  const sort = FEED_SORTS.find((value) => value === params.sort);
  const years = Number(params.years);
  // Any whole number in range, not only the four the panel offers — an older bookmark
  // asking for 4 years is a perfectly good question, and the API accepts 1 to 15.
  const period = Number.isInteger(years) && years >= 1 && years <= 15 ? years : undefined;

  /*
   * ⚠️ Deliberately asks whether the *raw* parameters were present, not whether they
   * survived. A URL carrying only rubbish has still asked a question, and answering it with
   * an empty screen that looks untouched would silently ignore what the member typed.
   */
  const asked = Boolean(params.f || q || params.evidence || params.years || params.sort);

  return { q, evidence, years: period, sort, asked };
}
