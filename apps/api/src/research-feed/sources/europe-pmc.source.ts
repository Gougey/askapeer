import { Injectable, Logger } from '@nestjs/common';
import type { ArticleSource, FetchResult, RawArticle } from './article-source';

const ENDPOINT = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const PAGE_SIZE = 100;
const TIMEOUT_MS = 20_000;
/**
 * How far back the first run reaches, and how much every later run re-covers.
 *
 * The overlap is not redundancy — it is correctness. A paper's `FIRST_PDATE` is its
 * *publication* date, but it enters the index whenever the source gets round to it, which
 * is routinely days later. A cursor set to "yesterday" with no overlap would skip every
 * paper indexed after the run that should have caught it, and nothing downstream would
 * ever notice the gap. Re-covering a fortnight costs nothing, because the upsert is
 * idempotent by design.
 */
const INITIAL_WINDOW_DAYS = 120;
const OVERLAP_DAYS = 14;

type EuropePmcResult = {
  title?: string;
  abstractText?: string;
  journalTitle?: string;
  journalInfo?: { journal?: { title?: string } };
  pubYear?: string;
  firstPublicationDate?: string;
  electronicPublicationDate?: string;
  doi?: string;
  pmid?: string;
  id?: string;
  isOpenAccess?: string;
  pubTypeList?: { pubType?: string[] };
};

/**
 * Europe PMC. Free, no API key, and the richer of the two sources for our purposes:
 * `resultType=core` returns the abstract, the publication types that drive the evidence
 * ladder, open-access status, DOI and PMID in a single call.
 *
 * **Queries are field-scoped to `TITLE_ABS`, and that is load-bearing.** Europe PMC
 * searches full text by default, and because an incremental ingest sorts by date rather
 * than relevance, an unscoped query returns the newest *incidental* mention rather than
 * the newest relevant paper. Measured 2026-08-03: `"achilles tendinopathy"` unscoped
 * returns 4,919 hits whose newest is a paper on chikungunya virus differentiation that
 * merely contains the phrase somewhere; `TITLE_ABS:"achilles tendinopathy"` returns 1,914
 * and a clean first page.
 */
@Injectable()
export class EuropePmcSource implements ArticleSource {
  readonly name = 'europe-pmc';
  private readonly log = new Logger(EuropePmcSource.name);

  async fetchSince(cursor: string | null, queries: string[]): Promise<FetchResult> {
    const seen = new Map<string, RawArticle>();
    const from = windowStart(cursor);

    for (const query of queries) {
      const url = new URL(ENDPOINT);
      // Field-scoped, and date-bounded by the cursor so a run asks only for what is new.
      const scoped = `TITLE_ABS:"${query.replace(/"/g, '')}"`;
      const dated = `${scoped} AND FIRST_PDATE:[${from} TO ${today()}]`;
      url.searchParams.set('query', dated);
      url.searchParams.set('format', 'json');
      url.searchParams.set('resultType', 'core');
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      url.searchParams.set('sort', 'P_PDATE_D desc');

      const results = await this.get(url, query);
      for (const raw of results) {
        const article = this.normalise(raw);
        if (!article) continue;
        // Within a run the same paper turns up under several corpus queries; keyed here so
        // the expensive cross-run dedupe downstream sees each paper once.
        const key = article.doi ?? article.pmid ?? article.title.toLowerCase();
        if (!seen.has(key)) seen.set(key, article);
      }
    }

    return { articles: [...seen.values()], nextCursor: today() };
  }

  private async get(url: URL, query: string): Promise<EuropePmcResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': userAgent() },
      });
      if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
      const body = (await res.json()) as { resultList?: { result?: EuropePmcResult[] } };
      return body.resultList?.result ?? [];
    } catch (err) {
      // One failing query must not lose the whole run — the other queries, and the other
      // source, still have useful work to do.
      this.log.warn(`Europe PMC query "${query}" failed: ${(err as Error).message}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private normalise(r: EuropePmcResult): RawArticle | null {
    const title = (r.title ?? '').trim();
    if (!title) return null;
    const doi = r.doi ? r.doi.trim().toLowerCase() : null;
    const pmid = r.pmid?.trim() || null;
    const date = r.firstPublicationDate ?? r.electronicPublicationDate ?? null;
    return {
      doi,
      pmid,
      otherIds: r.id ? { 'europe-pmc': r.id } : {},
      title,
      abstract: r.abstractText?.trim() || null,
      journal: (r.journalTitle ?? r.journalInfo?.journal?.title ?? '').trim() || null,
      publishedDate: date ? new Date(date) : null,
      publishedYear: r.pubYear ? Number(r.pubYear) : null,
      pubTypes: r.pubTypeList?.pubType ?? [],
      openAccess: r.isOpenAccess === 'Y',
      url: doi
        ? `https://doi.org/${doi}`
        : pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          : null,
    };
  }
}

/** `YYYY-MM-DD`, the only date format Europe PMC's range syntax accepts. */
function today(): string {
  return isoDay(new Date());
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Where this run starts reading: the last run less the overlap, or the initial window. */
function windowStart(cursor: string | null): string {
  const back = cursor ? OVERLAP_DAYS : INITIAL_WINDOW_DAYS;
  const from = cursor ? new Date(cursor) : new Date();
  if (Number.isNaN(from.getTime())) return isoDay(daysAgo(INITIAL_WINDOW_DAYS));
  from.setDate(from.getDate() - back);
  return isoDay(from);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function userAgent(): string {
  return 'askapeer/0.1 (+https://askapeer.com; research-feed ingestion)';
}
