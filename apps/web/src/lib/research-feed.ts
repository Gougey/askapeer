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

export type FeedPage = { articles: FeedArticle[]; nextCursor: string | null };

export async function fetchFeed(token: string, cursor?: string): Promise<FeedPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const page = await apiGet<FeedPage>(`/research-feed${query}`, token);
  return page ?? { articles: [], nextCursor: null };
}

export async function fetchArticle(token: string, articleId: string): Promise<ArticleDetail | null> {
  return apiGet<ArticleDetail>(`/research-feed/${articleId}`, token);
}
