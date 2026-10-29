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
  /**
   * Set when some of the run's queries failed but not all — recorded as the source's
   * `last_error`, so the admin feed page shows it. See `queryFailureOutcome`.
   */
  partialError?: string | null;
};

export type QueryFailure = { query: string; message: string };

/**
 * What a run should make of the queries that failed.
 *
 * ⚠️ **Every query failing is a failed run, not an empty one.** Each source used to catch a
 * failed request, log a warning and carry on with nothing, so a run in which *every* request
 * failed recorded "0 seen", no error, and moved its cursor on as if it had worked. Europe PMC
 * did exactly that on 29 October 2026, while the same window returned 56 papers for
 * "physiotherapy" alone, and the warnings were gone from Fly's 100-line log buffer before
 * anyone looked. The 14-day overlap re-covers a missed run, so the danger was a source
 * failing for a fortnight with nobody told.
 *
 * - All failed: `fatal`. The source throws, so the run records the error and **keeps the
 *   cursor** (`IngestionService.recordFailure`).
 * - Some failed: the run keeps what it got and records which failed. The cursor advances,
 *   since the next run re-covers the overlap.
 * - None: nothing to record, which also clears an earlier error.
 */
export function queryFailureOutcome(
  total: number,
  failures: QueryFailure[],
): { fatal: boolean; message: string | null } {
  if (failures.length === 0) return { fatal: false, message: null };
  const [first] = failures;
  const example = `first: "${first.query}": ${first.message}`;
  return failures.length >= total
    ? { fatal: true, message: `all ${total} queries failed; ${example}` }
    : { fatal: false, message: `${failures.length} of ${total} queries failed; ${example}` };
}

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

  /**
   * How long the backfill waits between pages of this source, in milliseconds.
   *
   * Per source because they are not alike: Europe PMC has taken 92 slices without dropping a
   * request, while OpenAlex rate-limited us and then shed load outright. Absent means the
   * backfill's own default.
   */
  readonly pageDelayMs?: number;
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
