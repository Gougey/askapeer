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
  tags: { id: string; name: string }[];
};

/** A structured abstract's blocks. Parsed server-side — never markup. */
export type AbstractSection = { heading: string | null; body: string };

export type ArticleDetail = FeedArticle & {
  abstract: string | null;
  abstractSections: AbstractSection[];
  doi: string | null;
};

/** How the page was ranked — see `mode` on the API. */
export type FeedMode = 'personalised' | 'general' | 'fallback';

export type FeedPage = { articles: FeedArticle[]; nextCursor: string | null; mode: FeedMode };

/** Search has no ranking `mode` — relevance is the ordering, and it carries a real total. */
export type FeedSearchPage = {
  articles: FeedArticle[];
  nextCursor: string | null;
  total: number;
};


export async function fetchFeed(
  token: string,
  cursor?: string,
  evidence?: string,
): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (evidence) params.set('evidence', evidence);
  const query = params.toString() ? `?${params}` : '';
  const page = await apiGet<FeedPage>(`/research-feed${query}`, token);
  return page ?? { articles: [], nextCursor: null, mode: 'general' };
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
