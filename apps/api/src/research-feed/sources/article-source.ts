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
/** One page of a historical backfill, plus where to resume. */
export type ArticlePage = {
  articles: RawArticle[];
  /** The source's own opaque paging token. Null means this was the last page. */
  nextCursor: string | null;
};

export interface ArticleSource {
  /** Stable key — also the primary key of its `research.ingestion_cursors` row. */
  readonly name: string;
  fetchSince(cursor: string | null, queries: string[]): Promise<FetchResult>;

  /**
   * One page of a **bounded** historical window, for the backfill.
   *
   * ⚠️ **Separate from `fetchSince`, and it has to be.** That one asks "what is new?" and
   * answers with a single page of 100 — right for a twice-daily ingest, useless for history,
   * because widening its window just returns the newest 100 papers of 25 years. This pages
   * properly, through the source's own deep-paging token, and is bounded at both ends so a
   * year can be taken as a unit of work.
   *
   * One page per call rather than an array of everything: a 25-year window is hundreds of
   * thousands of articles, and accumulating them before storing any would exhaust the
   * machine long before it finished.
   */
  fetchWindow(
    from: string,
    to: string,
    query: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<ArticlePage>;
}

export const ARTICLE_SOURCES = Symbol('ARTICLE_SOURCES');
