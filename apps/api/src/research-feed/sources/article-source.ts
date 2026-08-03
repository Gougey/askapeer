/**
 * One article as a source described it, before deduplication or classification.
 *
 * Deliberately source-agnostic: everything downstream — dedupe, classify, score — works on
 * this shape and must never learn which adapter produced it. Adding Semantic Scholar or
 * Crossref later is then a new adapter, not a pipeline change (architecture spec §8).
 */
export type RawArticle = {
  /** Bare and lowercased, never a `https://doi.org/…` URL. */
  doi: string | null;
  pmid: string | null;
  otherIds: Record<string, string>;
  title: string;
  abstract: string | null;
  journal: string | null;
  publishedDate: Date | null;
  publishedYear: number | null;
  /** The source's own publication-type strings, normalised later against one ladder. */
  pubTypes: string[];
  openAccess: boolean;
  url: string | null;
};

export type FetchResult = {
  articles: RawArticle[];
  /** Where the next run should resume. Null means "start from the window again". */
  nextCursor: string | null;
};

/**
 * A literature source. The same shape as `PaymentProvider` and the identity-check
 * provider: the pipeline depends on the interface, never on a concrete source.
 */
export interface ArticleSource {
  /** Stable key — also the primary key of its `research.ingestion_cursors` row. */
  readonly name: string;
  fetchSince(cursor: string | null, queries: string[]): Promise<FetchResult>;
}

export const ARTICLE_SOURCES = Symbol('ARTICLE_SOURCES');
