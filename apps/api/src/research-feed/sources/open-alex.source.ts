import { Injectable, Logger } from '@nestjs/common';
import type { ArticleSource, FetchResult, RawArticle } from './article-source';

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
