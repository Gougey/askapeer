import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { articleTags, articles, ingestionCursors } from '../db/schema';
import { SettingsService } from '../settings/settings.service';
import { parseAbstract, stripInline } from './abstract';
import { classify, type ClassifiableTag } from './classifier';
import { intrinsicScore, normaliseEvidenceType } from './scoring';
import { ARTICLE_SOURCES, type ArticleSource, type RawArticle } from './sources/article-source';

/**
 * The corpus queries, if an administrator has not set any.
 *
 * These decide what the feed is *about*, which makes them the highest-leverage setting in
 * the slice and the one most needing Andrew's eye — so they live in `config.settings`
 * (`research_feed.corpus_queries`, comma-separated) and can be retuned without a deploy.
 * Broad and domain-bounded on purpose: the classifier does the narrowing against 588 tags,
 * and a query per tag would be 588 requests a run for no gain.
 */
const DEFAULT_QUERIES = [
  'sports medicine',
  'sports injury',
  'sports physiotherapy',
  'musculoskeletal rehabilitation',
  'return to play',
  'tendinopathy',
  'muscle strain injury',
  'anterior cruciate ligament',
  'rotator cuff',
  'low back pain rehabilitation',
  'exercise therapy',
  'physiotherapy',
];

export const CORPUS_QUERIES_KEY = 'research_feed.corpus_queries';

export type IngestionReport = {
  source: string;
  seen: number;
  stored: number;
  classified: number;
  error?: string;
};

@Injectable()
export class IngestionService {
  private readonly log = new Logger(IngestionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(ARTICLE_SOURCES) private readonly sources: ArticleSource[],
    private readonly settings: SettingsService,
  ) {}

  /**
   * Run every source. One failing source degrades to "that source's new articles are
   * late" rather than failing the run — the corpus is already stored, so the feed is
   * unaffected either way.
   */
  async runAll(): Promise<IngestionReport[]> {
    const queries = await this.corpusQueries();
    const taxonomy = await this.taxonomy();
    const reports: IngestionReport[] = [];

    for (const source of this.sources) {
      try {
        reports.push(await this.runSource(source, queries, taxonomy));
      } catch (err) {
        const message = (err as Error).message;
        this.log.error(`Ingestion failed for ${source.name}: ${message}`);
        await this.recordFailure(source.name, message);
        reports.push({ source: source.name, seen: 0, stored: 0, classified: 0, error: message });
      }
    }
    return reports;
  }

  private async runSource(
    source: ArticleSource,
    queries: string[],
    taxonomy: ClassifiableTag[],
  ): Promise<IngestionReport> {
    const [cursorRow] = await this.db
      .select()
      .from(ingestionCursors)
      .where(eq(ingestionCursors.sourceName, source.name));

    const { articles: fetched, nextCursor } = await source.fetchSince(
      cursorRow?.lastCursor ?? null,
      queries,
    );

    let stored = 0;
    let classified = 0;
    for (const raw of fetched) {
      const result = await this.upsert(raw, taxonomy);
      if (result.stored) stored += 1;
      classified += result.tagsWritten;
    }

    // Only now — the cursor advancing before the batch commits would silently drop a
    // window of literature that nothing downstream would ever notice was missing.
    await this.db
      .insert(ingestionCursors)
      .values({
        sourceName: source.name,
        lastCursor: nextCursor,
        lastRunAt: new Date(),
        lastError: null,
        articlesSeen: fetched.length,
        articlesStored: stored,
      })
      .onConflictDoUpdate({
        target: ingestionCursors.sourceName,
        set: {
          lastCursor: nextCursor,
          lastRunAt: new Date(),
          lastError: null,
          articlesSeen: fetched.length,
          articlesStored: stored,
        },
      });

    this.log.log(`${source.name}: ${fetched.length} seen, ${stored} new, ${classified} tag matches`);
    return { source: source.name, seen: fetched.length, stored, classified };
  }

  /**
   * Store one article, or merge it into the one already there.
   *
   * Idempotent by construction, which is what makes the overlapping ingest window in the
   * adapters safe: every run re-presents a fortnight of articles it has already seen.
   *
   * **Merging is upward, never overwriting.** The same paper arrives from two sources with
   * different completeness — one has the abstract, the other knows it is open access.
   * Taking whichever arrived last would lose information at random.
   */
  private async upsert(
    input: RawArticle,
    taxonomy: ClassifiableTag[],
  ): Promise<{ stored: boolean; tagsWritten: number }> {
    // Markup is stripped here rather than in each adapter: both sources emit it, the rule
    // is identical, and one place means a third adapter inherits the fix for free.
    const parsed = parseAbstract(input.abstract);
    const raw: RawArticle = { ...input, title: stripInline(input.title), abstract: parsed.text };
    const sections = parsed.sections;
    const existing = await this.findExisting(raw);
    const evidenceType = normaliseEvidenceType(raw.pubTypes, raw.title);
    const openAccess = raw.openAccess || (existing?.openAccess ?? false);

    if (existing) {
      const abstract = existing.abstract ?? raw.abstract;
      // Only worth a write if this source actually added something.
      const improved =
        (!existing.abstract && raw.abstract) ||
        (!existing.doi && raw.doi) ||
        (!existing.pmid && raw.pmid) ||
        (!existing.url && raw.url) ||
        openAccess !== existing.openAccess;
      if (!improved) return { stored: false, tagsWritten: 0 };

      await this.db
        .update(articles)
        .set({
          abstract,
          ...(existing.abstract ? {} : { abstractSections: sections }),
          doi: existing.doi ?? raw.doi,
          pmid: existing.pmid ?? raw.pmid,
          url: existing.url ?? raw.url,
          journal: existing.journal ?? raw.journal,
          openAccess,
          intrinsicScore: intrinsicScore({ evidenceType, openAccess }),
          updatedAt: new Date(),
        })
        .where(eq(articles.id, existing.id));

      // A late-arriving abstract is new evidence for the classifier, so reclassify.
      const written = existing.abstract
        ? 0
        : await this.writeTags(existing.id, { title: existing.title, abstract }, taxonomy);
      return { stored: false, tagsWritten: written };
    }

    const [row] = await this.db
      .insert(articles)
      .values({
        doi: raw.doi,
        pmid: raw.pmid,
        otherIds: raw.otherIds,
        title: raw.title,
        abstract: raw.abstract,
        abstractSections: sections,
        journal: raw.journal,
        publishedDate: raw.publishedDate,
        publishedYear: raw.publishedYear ?? raw.publishedDate?.getFullYear() ?? null,
        evidenceType,
        openAccess,
        url: raw.url,
        sourceRefs: [raw.otherIds],
        intrinsicScore: intrinsicScore({ evidenceType, openAccess }),
      })
      // A concurrent run may have inserted the same DOI between the lookup and here; the
      // partial unique indexes make that a no-op rather than a crash.
      .onConflictDoNothing()
      .returning({ id: articles.id });

    if (!row) return { stored: false, tagsWritten: 0 };
    const written = await this.writeTags(row.id, raw, taxonomy);
    return { stored: true, tagsWritten: written };
  }

  /** DOI, then PMID, then normalised title + year (EPIC-I §5's order). */
  private async findExisting(raw: RawArticle) {
    if (raw.doi) {
      const [byDoi] = await this.db.select().from(articles).where(eq(articles.doi, raw.doi));
      if (byDoi) return byDoi;
    }
    if (raw.pmid) {
      const [byPmid] = await this.db.select().from(articles).where(eq(articles.pmid, raw.pmid));
      if (byPmid) return byPmid;
    }
    const year = raw.publishedYear ?? raw.publishedDate?.getFullYear() ?? null;
    if (!year) return undefined;
    const [byTitle] = await this.db
      .select()
      .from(articles)
      .where(
        and(
          sql`lower(${articles.title}) = ${raw.title.toLowerCase()}`,
          eq(articles.publishedYear, year),
        ),
      );
    return byTitle;
  }

  private async writeTags(
    articleId: string,
    article: { title: string; abstract: string | null },
    taxonomy: ClassifiableTag[],
  ): Promise<number> {
    const matches = classify(article, taxonomy);
    if (matches.length === 0) return 0;
    await this.db
      .insert(articleTags)
      .values(
        matches.map((m) => ({
          articleId,
          tagId: m.tagId,
          confidence: m.confidence,
          matchedIn: m.matchedIn,
        })),
      )
      .onConflictDoNothing();
    return matches.length;
  }

  /**
   * The taxonomy, flattened with each node's depth.
   *
   * Read once per run rather than per article: 588 rows joined against every article would
   * be the pipeline's whole cost. Depth comes from a recursive walk of `parent_id`, the
   * same shape the tag picker and search subtree expansion already use.
   */
  private async taxonomy(): Promise<ClassifiableTag[]> {
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      synonyms: string[] | null;
      depth: number;
    }>(sql`
      with recursive walk as (
        select id, name, synonyms, 0 as depth
        from community.tags where parent_id is null
        union all
        select t.id, t.name, t.synonyms, w.depth + 1
        from community.tags t join walk w on t.parent_id = w.id
      )
      select id, name, synonyms, depth from walk
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      synonyms: r.synonyms ?? [],
      depth: Number(r.depth),
    }));
  }

  private async corpusQueries(): Promise<string[]> {
    const configured = await this.settings.get(CORPUS_QUERIES_KEY);
    const parsed = (configured ?? '')
      .split(',')
      .map((q) => q.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_QUERIES;
  }

  private async recordFailure(sourceName: string, error: string): Promise<void> {
    await this.db
      .insert(ingestionCursors)
      .values({ sourceName, lastRunAt: new Date(), lastError: error })
      .onConflictDoUpdate({
        target: ingestionCursors.sourceName,
        // The cursor is deliberately untouched, so the next run re-covers the same window.
        set: { lastRunAt: new Date(), lastError: error },
      });
  }

  /**
   * Re-run classification over the stored corpus, replacing every match.
   *
   * The tuning loop this slice will actually live in: the classifier's rules, the
   * confidence floor and — when Andrew's list lands — the tag synonyms all change what
   * an article should be tagged with, and none of them should mean re-fetching 1,300
   * papers from two public APIs to find out whether the change helped.
   *
   * Deletes and rewrites rather than merging, so a rule that *removes* a bad match is
   * visible. A merge would only ever add, which would hide exactly the improvement being
   * tested.
   */
  async reclassifyAll(): Promise<{ articles: number; matches: number }> {
    const taxonomy = await this.taxonomy();
    const rows = await this.db
      .select({ id: articles.id, title: articles.title, abstract: articles.abstract })
      .from(articles);

    await this.db.delete(articleTags);
    let matches = 0;
    for (const row of rows) {
      matches += await this.writeTags(row.id, row, taxonomy);
    }
    this.log.log(`Reclassified ${rows.length} articles → ${matches} tag matches`);
    return { articles: rows.length, matches };
  }

  /**
   * Re-parse stored abstracts into clean text plus sections.
   *
   * The corpus ingested before markup handling existed has JATS tags sitting in `abstract`,
   * where they render as literal `<h4>` on the card. `parseAbstract` is idempotent — clean
   * text comes back as one unheaded section — so this is safe to run repeatedly and safe to
   * run on rows that never needed it.
   *
   * Reclassification is deliberately *not* chained on: the flattened text differs from the
   * marked-up original only by tags the tokeniser was already discarding, so tag matches do
   * not move. Run reclassify separately if that ever stops being true.
   */
  async normaliseAbstracts(): Promise<{ scanned: number; rewritten: number }> {
    const rows = await this.db
      .select({ id: articles.id, title: articles.title, abstract: articles.abstract })
      .from(articles);

    let rewritten = 0;
    for (const row of rows) {
      const parsed = parseAbstract(row.abstract);
      const title = stripInline(row.title);
      if (parsed.text === row.abstract && title === row.title) continue;
      await this.db
        .update(articles)
        .set({ title, abstract: parsed.text, abstractSections: parsed.sections })
        .where(eq(articles.id, row.id));
      rewritten += 1;
    }
    this.log.log(`Normalised ${rewritten} of ${rows.length} abstracts`);
    return { scanned: rows.length, rewritten };
  }

  /** How much corpus exists — used by the admin read and the "is it working" check. */
  async stats(): Promise<{ articles: number; classified: number; cursors: unknown[] }> {
    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles);
    const [{ count: classified }] = await this.db
      .select({ count: sql<number>`count(distinct ${articleTags.articleId})::int` })
      .from(articleTags);
    const cursors = await this.db.select().from(ingestionCursors);
    return { articles: Number(total), classified: Number(classified), cursors };
  }
}
