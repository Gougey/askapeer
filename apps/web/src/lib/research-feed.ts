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

/** How the page was ranked — see `mode` on the API. */
export type FeedMode = 'personalised' | 'general' | 'fallback' | 'filtered';

/** The three orderings the filter panel offers. Relevance needs a keyword. */
export type FeedSort = 'for_you' | 'newest' | 'relevance';

/**
 * What the filter panel asks for (Andrew's review item 6).
 *
 * `tags` **replace** the member's clinical interests for that view rather than narrowing
 * within them; everything else narrows.
 */
export type FeedFilters = {
  q?: string;
  tags?: string[];
  evidence?: string;
  /** Years back from now, 1–5. Relative, never a pair of dates. */
  years?: number;
  sort?: FeedSort;
  /**
   * "This URL is the whole truth" — set by Apply, including when the panel was cleared.
   * Without it the API cannot tell *nothing asked for* from *deliberately cleared*, and a
   * member who cleared the panel would watch their saved criteria come straight back.
   */
  applied?: boolean;
};

/** The criteria a member has saved as their standing settings. Tags live in the interests. */
export type FeedCriteria = {
  tagIds: string[];
  query?: string;
  evidence?: EvidenceType;
  periodYears?: number;
  sort?: FeedSort;
};

export type FeedPage = { articles: FeedArticle[]; nextCursor: string | null; mode: FeedMode };

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
  // Repeated rather than comma-joined, matching search and the API's own contract.
  for (const tag of filters.tags ?? []) params.append('tag', tag);
  if (filters.evidence) params.set('evidence', filters.evidence);
  if (filters.years) params.set('years', String(filters.years));
  if (filters.sort && filters.sort !== 'for_you') params.set('sort', filters.sort);
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
  return page ?? { articles: [], nextCursor: null, mode: 'general' };
}

/** The standing criteria, used to seed the panel when the URL carries none. */
export async function fetchFeedCriteria(token: string): Promise<FeedCriteria> {
  const res = await apiGet<FeedCriteria>('/research-feed/preferences', token);
  return res ?? { tagIds: [], sort: 'for_you' };
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
