import { Injectable, Logger } from '@nestjs/common';
import type { ArticlePage, ArticleSource, FetchResult, RawArticle } from './article-source';

const ENDPOINT = 'https://api.openalex.org/works';
const PAGE_SIZE = 100;
const TIMEOUT_MS = 20_000;
const INITIAL_WINDOW_DAYS = 120;
const OVERLAP_DAYS = 14;

/**
 * The polite-pool contact address. OpenAlex gives requests carrying one predictable
 * throughput and throttles anonymous traffic; it is the difference between an ingest that
 * completes and one that half-completes for no visible reason.
 */
const CONTACT = 'mailto:hello@askapeer.com';

/**
 * How many times a rate-limited page is re-asked before the slice gives up.
 *
 * With `BACKOFF_MS` doubling each time, five attempts wait about two minutes in total — long
 * enough to ride out a burst, short enough that a genuinely closed door is reported rather
 * than hidden.
 */
const RATE_LIMIT_RETRIES = 5;
const BACKOFF_MS = 2_000;

/**
 * The longest `Retry-After` worth sitting out inside a request.
 *
 * ⚠️ **OpenAlex asked for 9,051 seconds — two and a half hours — and the first version
 * obeyed.** The worker has one slot, so that single sleep stopped the entire backfill,
 * Europe PMC included, and would have outlived its BullMQ lock many times over and been
 * judged stalled.
 *
 * A short wait is a pause worth taking inside the request. A long one is not a wait at all,
 * it is a daily quota: the honest response is to report it, let the slice go back in the
 * queue, and stop asking this source until it says otherwise.
 */
const MAX_BACKOFF_MS = 60_000;

/**
 * How long to leave the source alone once it has run out of patience with us.
 *
 * Fifteen minutes is a guess at "long enough for a load spike to pass", chosen to be clearly
 * longer than the in-request backoff and clearly shorter than a daily quota.
 */
const SOURCE_REST_S = 900;

/**
 * The gap left between backfill pages.
 *
 * OpenAlex's polite pool allows ten requests a second; this asks for about six, because the
 * limit is a ceiling to stay under rather than a target to hit. It costs nothing — the store
 * and classify behind each page already takes longer than this.
 */
/**
 * ⚠️ **Two seconds a page — deliberately slow.**
 *
 * The backfill is a one-off and Adrian was explicit that it can take as long as it likes, so
 * there is nothing to buy by hurrying. What hurrying cost was real: a burst at full speed
 * exhausted the daily quota, and the source then spent the night answering 503 to 80 of our
 * slices while Europe PMC beside it took 92 without a murmur.
 *
 * Half a request a second is far under any published limit, and the store-and-classify behind
 * each page is doing useful work throughout — so this is latency, not idleness.
 */
export const OPEN_ALEX_PAGE_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type OpenAlexWork = {
  id?: string;
  doi?: string;
  title?: string;
  display_name?: string;
  abstract_inverted_index?: Record<string, number[]>;
  publication_date?: string;
  publication_year?: number;
  type?: string;
  open_access?: { is_oa?: boolean };
  primary_location?: {
    source?: { display_name?: string; type?: string };
    raw_type?: string;
  };
};

/**
 * OpenAlex. Free, no key, and much broader than Europe PMC — which is its value and its
 * risk: it indexes repositories and grey literature alongside journals.
 *
 * Two quirks the prototype learned and this keeps:
 *
 * 1. **Abstracts arrive as an inverted index** (word → positions) rather than text, and
 *    have to be reconstructed.
 * 2. **`type: 'article'` lies about theses.** OpenAlex's top-level type calls repository
 *    deposits and dissertations "article"; the source type and raw type reveal the truth.
 *    These are not peer-reviewed literature and do not belong in a clinical feed.
 */
@Injectable()
export class OpenAlexSource implements ArticleSource {
  readonly name = 'open-alex';
  /** Deliberately slow — see `OPEN_ALEX_PAGE_DELAY_MS`. */
  readonly pageDelayMs = OPEN_ALEX_PAGE_DELAY_MS;
  private readonly log = new Logger(OpenAlexSource.name);

  async fetchSince(cursor: string | null, queries: string[]): Promise<FetchResult> {
    const seen = new Map<string, RawArticle>();
    const from = windowStart(cursor);

    for (const query of queries) {
      const url = new URL(ENDPOINT);
      // `title_and_abstract.search` is OpenAlex's equivalent of Europe PMC's TITLE_ABS,
      // and matters for the same reason: a full-text match plus a date sort surfaces the
      // newest incidental mention rather than the newest relevant paper.
      url.searchParams.set(
        'filter',
        `title_and_abstract.search:${query},from_publication_date:${from}`,
      );
      url.searchParams.set('per-page', String(PAGE_SIZE));
      url.searchParams.set('sort', 'publication_date:desc');
      url.searchParams.set('mailto', CONTACT.replace('mailto:', ''));

      for (const work of await this.get(url, query)) {
        const article = this.normalise(work);
        if (!article) continue;
        const key = article.doi ?? article.title.toLowerCase();
        if (!seen.has(key)) seen.set(key, article);
      }
    }

    return { articles: [...seen.values()], nextCursor: isoDay(new Date()) };
  }

  /**
   * One page of a bounded window, paged with OpenAlex's `cursor`.
   *
   * ⚠️ **The query is quoted here and is not in `fetchSince`.** OpenAlex's
   * `title_and_abstract.search` tokenises an unquoted phrase, so "return to play" matches
   * anything containing all three words anywhere — 97,390 works against 9,681 for the phrase.
   * At incremental scale that extra noise is a handful of papers a day and the classifier
   * discards most of it; across 25 years it is a hundred thousand irrelevant records that
   * every future reclassify would have to walk.
   */
  async fetchWindow(
    from: string,
    to: string,
    query: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<ArticlePage> {
    const url = new URL(ENDPOINT);
    const phrase = `"${query.replace(/"/g, '')}"`;
    url.searchParams.set(
      'filter',
      `title_and_abstract.search:${phrase},from_publication_date:${from},to_publication_date:${to}`,
    );
    url.searchParams.set('per-page', String(pageSize));
    url.searchParams.set('cursor', cursor ?? '*');
    url.searchParams.set('mailto', CONTACT.replace('mailto:', ''));

    const body = await this.getPage(url);
    const articles: RawArticle[] = [];
    for (const work of body.results) {
      const article = this.normalise(work);
      if (article) articles.push(article);
    }
    return { articles, nextCursor: body.results.length === 0 ? null : body.nextCursor };
  }

  /**
   * ⚠️ **429 is a wait, not a failure**, and learning that cost 67 slices.
   *
   * The first live backfill asked OpenAlex for pages as fast as it could store them and was
   * rate-limited within minutes — every one of those slices was marked permanently failed,
   * while Europe PMC beside it did not drop a single request. A public API we are using for
   * free, at a volume it has every right to object to, will say "slow down", and the only
   * correct response is to slow down.
   *
   * So: honour `Retry-After` when it is given, back off exponentially when it is not, and
   * only give up after `RATE_LIMIT_RETRIES`. A slice is then failed by something real.
   */
  private async getPage(
    url: URL,
  ): Promise<{ results: OpenAlexWork[]; nextCursor: string | null }> {
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json', 'User-Agent': `askapeer/0.1 (${CONTACT})` },
        });
        /*
         * ⚠️ **5xx is the source struggling, not this slice being wrong.** 503 and 504 are
         * load-shedding; a 500 from a public API under pressure is the same thing wearing a
         * different number. The first version wrote all of them off as permanent failures and
         * collected 80 dead slices overnight, which nothing retries.
         */
        if (res.status >= 500) {
          if (attempt < RATE_LIMIT_RETRIES) {
            const waitMs = BACKOFF_MS * 2 ** attempt;
            this.log.warn(`OpenAlex HTTP ${res.status}; waiting ${waitMs}ms (attempt ${attempt + 1})`);
            clearTimeout(timer);
            await sleep(waitMs);
            continue;
          }
          // Out of patience here — hand back a rest period so the *source* is left alone and
          // Europe PMC carries on, rather than every remaining slice meeting the same wall.
          throw new Error(`OpenAlex HTTP ${res.status} retry-after ${SOURCE_REST_S}s`);
        }
        if (res.status === 429) {
          const after = Number(res.headers.get('retry-after'));
          const asked = Number.isFinite(after) && after > 0 ? after * 1000 : 0;
          // Too long to hold the worker for — hand it back with the number, so the caller can
          // stop asking this source rather than every slice rediscovering the same quota.
          if (asked > MAX_BACKOFF_MS || attempt >= RATE_LIMIT_RETRIES) {
            throw new Error(
              `OpenAlex HTTP 429 retry-after ${Math.round((asked || MAX_BACKOFF_MS) / 1000)}s`,
            );
          }
          const waitMs = asked || BACKOFF_MS * 2 ** attempt;
          this.log.warn(`OpenAlex rate-limited; waiting ${waitMs}ms (attempt ${attempt + 1})`);
          clearTimeout(timer);
          await sleep(waitMs);
          continue;
        }
        if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
        const body = (await res.json()) as {
          results?: OpenAlexWork[];
          meta?: { next_cursor?: string | null };
        };
        return { results: body.results ?? [], nextCursor: body.meta?.next_cursor ?? null };
      } finally {
        clearTimeout(timer);
      }
    }
  }

  private async get(url: URL, query: string): Promise<OpenAlexWork[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': `askapeer/0.1 (${CONTACT})` },
      });
      if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
      const body = (await res.json()) as { results?: OpenAlexWork[] };
      return body.results ?? [];
    } catch (err) {
      this.log.warn(`OpenAlex query "${query}" failed: ${(err as Error).message}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private normalise(w: OpenAlexWork): RawArticle | null {
    if (!this.isPeerReviewed(w)) return null;
    const title = (w.title ?? w.display_name ?? '').trim();
    if (!title) return null;
    const doi = w.doi ? w.doi.replace('https://doi.org/', '').trim().toLowerCase() : null;
    return {
      doi,
      pmid: null,
      otherIds: w.id ? { 'open-alex': w.id } : {},
      title,
      abstract: reconstructAbstract(w.abstract_inverted_index),
      journal: w.primary_location?.source?.display_name?.trim() || null,
      publishedDate: w.publication_date ? new Date(w.publication_date) : null,
      publishedYear: w.publication_year ?? null,
      pubTypes: w.type ? [w.type] : [],
      openAccess: w.open_access?.is_oa === true,
      url: doi ? `https://doi.org/${doi}` : (w.id ?? null),
    };
  }

  private isPeerReviewed(w: OpenAlexWork): boolean {
    if (w.primary_location?.source?.type === 'repository') return false;
    const raw = (w.primary_location?.raw_type ?? '').toLowerCase();
    return !raw.includes('thesis') && !raw.includes('dissertation');
  }
}

/**
 * OpenAlex ships abstracts as `{ word: [positions] }` for licensing reasons. Rebuilding
 * loses the original punctuation, which is fine — the classifier tokenises anyway, and a
 * reader gets prose rather than a word cloud.
 */
export function reconstructAbstract(index: Record<string, number[]> | undefined): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words[position] = word;
  }
  const text = words.join(' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowStart(cursor: string | null): string {
  const back = cursor ? OVERLAP_DAYS : INITIAL_WINDOW_DAYS;
  const from = cursor ? new Date(cursor) : new Date();
  if (Number.isNaN(from.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - INITIAL_WINDOW_DAYS);
    return isoDay(fallback);
  }
  from.setDate(from.getDate() - back);
  return isoDay(from);
}
