import { apiGet } from './api';

/** The evidence ladder, as the API normalises it. Drives the pill on every card. */
export type EvidenceType =
  | 'systematic_review'
  | 'randomised_trial'
  | 'cohort_study'
  | 'case_report'
  | 'other';

export type FeedArticle = {
  id: string;
  title: string;
  snippet: string | null;
  journal: string | null;
  publishedDate: string | null;
  evidenceType: EvidenceType;
  openAccess: boolean;
  url: string | null;
  /** What the classifier matched. Empty is normal — not every article is placeable. */
  tags: { id: string; name: string; region: string }[];
};

/** A structured abstract's blocks. Parsed server-side — never markup. */
export type AbstractSection = { heading: string | null; body: string };

export type ArticleDetail = FeedArticle & {
  abstract: string | null;
  abstractSections: AbstractSection[];
  doi: string | null;
};

/** The three orderings the filter panel offers. Relevance needs a keyword. */
export type FeedSort = 'recommended' | 'newest' | 'relevance';

/**
 * What the filter panel asks for.
 *
 * ⚠️ **No clinical tags.** The panel used to carry a tag row that overrode the member's
 * stored interests; after testing, interests were taken out of My Research entirely. The
 * corpus is still classified against the taxonomy — that is what puts the chips on a card
 * and what the magnifier search narrows by — but this screen asks only these questions.
 */
export type FeedFilters = {
  q?: string;
  evidence?: string;
  /** Years back from now, 1–5. Relative, never a pair of dates. */
  years?: number;
  sort?: FeedSort;
  /**
   * "This URL is a search" — set by Apply, even when every field was left empty.
   *
   * ⚠️ My Research shows nothing until something is asked, so this is what separates a
   * deliberate Apply with no criteria (the whole corpus) from an untouched visit (an empty
   * screen with the panel open).
   */
  applied?: boolean;
};

/** The criteria a member has saved as their standing settings. They seed the panel only. */
export type FeedCriteria = {
  query?: string;
  evidence?: EvidenceType;
  periodYears?: number;
  sort?: FeedSort;
};

export type FeedPage = { articles: FeedArticle[]; nextCursor: string | null };

/** Search has no ranking `mode` — relevance is the ordering, and it carries a real total. */
export type FeedSearchPage = {
  articles: FeedArticle[];
  nextCursor: string | null;
  total: number;
};


/** The panel's state as URL parameters — the one place the shape is written down. */
export function feedFilterParams(filters: FeedFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.evidence) params.set('evidence', filters.evidence);
  if (filters.years) params.set('years', String(filters.years));
  // Always carried, never omitted as "the default": the default moved once already, and a
  // URL that leaves it out silently re-reads whatever the default happens to be that week.
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.applied) params.set('f', '1');
  return params;
}

export async function fetchFeed(
  token: string,
  cursor?: string,
  filters: FeedFilters = {},
): Promise<FeedPage> {
  const params = feedFilterParams(filters);
  if (cursor) params.set('cursor', cursor);
  const query = params.toString() ? `?${params}` : '';
  const page = await apiGet<FeedPage>(`/research-feed${query}`, token);
  return page ?? { articles: [], nextCursor: null };
}

/**
 * How far back the corpus reaches — for the period control's "Any time" label.
 *
 * ⚠️ Read from the data rather than written down. Andrew asked for the control to say that
 * older articles will not be found and suggested a fixed "2000 onwards"; a fixed year was
 * wrong on the day, and would be wrong again every January.
 */
export async function fetchFeedCoverage(token: string): Promise<number | null> {
  const res = await apiGet<{ oldestYear: number | null }>('/research-feed/coverage', token);
  return res?.oldestYear ?? null;
}

/** The standing criteria, used to seed the panel when the URL carries none. */
export async function fetchFeedCriteria(token: string): Promise<FeedCriteria> {
  const res = await apiGet<FeedCriteria>('/research-feed/preferences', token);
  return res ?? { sort: 'newest' };
}

/** S16 — full-text search over the corpus, independent of the member's interests. */
export async function fetchFeedSearch(
  token: string,
  params: { q: string; tags?: string[]; evidence?: string; cursor?: string },
): Promise<FeedSearchPage> {
  const search = new URLSearchParams({ q: params.q });
  // Repeated rather than comma-joined, matching the forum search and the API's own contract.
  for (const tag of params.tags ?? []) search.append('tag', tag);
  if (params.evidence) search.set('evidence', params.evidence);
  if (params.cursor) search.set('cursor', params.cursor);
  const res = await apiGet<FeedSearchPage>(`/research-feed/search?${search.toString()}`, token);
  return res ?? { articles: [], nextCursor: null, total: 0 };
}

export async function fetchArticle(token: string, articleId: string): Promise<ArticleDetail | null> {
  return apiGet<ArticleDetail>(`/research-feed/${articleId}`, token);
}

export async function fetchMyInterests(token: string): Promise<string[]> {
  const res = await apiGet<{ tagIds: string[] }>('/research-feed/interests', token);
  return res?.tagIds ?? [];
}
