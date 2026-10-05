import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { backfillSlices } from '../db/schema';
import { IngestionService } from './ingestion.service';
import { ARTICLE_SOURCES, type ArticleSource } from './sources/article-source';

/** Results per request. The ceiling both sources accept, so fewer round trips per year. */
const PAGE_SIZE = 100;

/**
 * Pages per slice run before the job hands back.
 *
 * A slice is a year of one query and can be thousands of articles. Capping the pages per run
 * keeps any single job short, so the queue stays responsive and a restart loses a page rather
 * than a year — the slice is re-enqueued with its cursor committed.
 */
const PAGES_PER_RUN = 25;

/**
 * Articles between yields to the event loop.
 *
 * ⚠️ **Not decoration.** On 2026-09-23 a batched reclassify held the loop for a minute at a
 * time; BullMQ could not renew the job lock, judged the job stalled, retried it, and took the
 * API off the air for ninety minutes. Classification is per-token work and this does far more
 * of it than that job did, so it yields often and on purpose.
 */
const YIELD_EVERY = 5;

/**
 * How long a slice may sit in `running` before another run may take it.
 *
 * ⚠️ **Found by killing a run mid-slice**, which is exactly how this will end in practice —
 * a deploy, a Fly autostop, an operator draining the queue. The slice stayed `running` and
 * nothing would ever pick it up again, so the year was silently abandoned with its cursor
 * committed and no error anywhere. Resumability that only survives a *clean* stop is not
 * resumability.
 *
 * Generous, because a slice legitimately holds `running` while it works: the status is
 * touched after every page, so ten minutes of silence means gone, not busy.
 */
const STALE_AFTER_MINUTES = 10;

/**
 * The historical backfill (Andrew: 25 years).
 *
 * ⚠️ **Why this cannot be a setting on the existing ingest.** `fetchSince` asks each source
 * for *one page of 100 per query* and moves a cursor forward. That is right for "what is new
 * since yesterday" and useless for history: widening its window returns the newest 100 papers
 * of 25 years, nineteen times over — about 1,900 articles against the hundreds of thousands
 * that are actually there. History needs deep paging, and deep paging needs somewhere to
 * remember how far it got.
 *
 * So: **a slice is one source × one query × one year**, its page cursor committed as each page
 * lands. A run that dies resumes from the cursor; a slice that fails is one year of one query
 * rather than the whole exercise.
 *
 * Newest year first, deliberately. A backfill that is stopped early — because it is too big,
 * too slow, or simply not wanted after all — has then collected the years a member is most
 * likely to ask for, rather than 2001.
 */
@Injectable()
export class BackfillService {
  private readonly log = new Logger(BackfillService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(ARTICLE_SOURCES) private readonly sources: ArticleSource[],
    private readonly ingestion: IngestionService,
  ) {}

  /**
   * Lay out the work without doing any of it.
   *
   * Separate from running on purpose: the plan is a row count you can look at and a cost you
   * can decide about before a single request goes out. `onConflictDoNothing` makes replanning
   * safe — it adds what is missing and never resets a slice that has already run.
   */
  async plan(fromYear: number, toYear: number): Promise<{ slices: number }> {
    const queries = await this.ingestion.corpusQueries();
    const rows: (typeof backfillSlices.$inferInsert)[] = [];
    for (const source of this.sources) {
      for (const query of queries) {
        for (let year = toYear; year >= fromYear; year -= 1) {
          rows.push({
            sourceName: source.name,
            query,
            windowStart: `${year}-01-01`,
            windowEnd: `${year}-12-31`,
          });
        }
      }
    }
    if (rows.length > 0) {
      await this.db.insert(backfillSlices).values(rows).onConflictDoNothing();
    }
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(backfillSlices);
    return { slices: count };
  }

  /** What the admin screen needs to answer "is it working, and how far has it got?". */
  async status() {
    const byStatus = await this.db
      .select({
        status: backfillSlices.status,
        slices: sql<number>`count(*)::int`,
        seen: sql<number>`coalesce(sum(${backfillSlices.articlesSeen}), 0)::int`,
        stored: sql<number>`coalesce(sum(${backfillSlices.articlesStored}), 0)::int`,
      })
      .from(backfillSlices)
      .groupBy(backfillSlices.status);
    const failures = await this.db
      .select({
        source: backfillSlices.sourceName,
        query: backfillSlices.query,
        windowStart: backfillSlices.windowStart,
        lastError: backfillSlices.lastError,
      })
      .from(backfillSlices)
      .where(eq(backfillSlices.status, 'failed'))
      .orderBy(asc(backfillSlices.windowStart))
      .limit(20);
    return { byStatus, failures };
  }

  /**
   * Take the next slice and work at it for a bounded number of pages.
   *
   * Returns whether there is more to do, so the worker can enqueue itself again rather than
   * looping here — one job, one bounded piece of work, which is what keeps a stall to a page.
   */
  async runNext(): Promise<{ done: boolean; slice?: string; seen: number; stored: number }> {
    const [slice] = await this.db
      .select()
      .from(backfillSlices)
      .where(
        or(
          eq(backfillSlices.status, 'pending'),
          // A slice abandoned mid-run — see STALE_AFTER_MINUTES. Safe to re-take: its cursor
          // was committed per page, and the upsert behind it is idempotent either way.
          and(
            eq(backfillSlices.status, 'running'),
            sql`${backfillSlices.updatedAt} < now() - (${STALE_AFTER_MINUTES} * interval '1 minute')`,
          ),
        ),
      )
      .orderBy(
        /*
         * **Finish what was abandoned before starting something new.** A stale slice is
         * already part-paid for — its cursor is committed and its pages are stored — so
         * picking it up costs one page to resume and leaves no half-done year lying around.
         * Starting a fresh slice instead would strand it until every other slice was done.
         */
        desc(sql`${backfillSlices.status} = 'running'`),
        // Then newest first: a backfill stopped early should have collected the useful years.
        desc(backfillSlices.windowStart),
      )
      .limit(1);
    if (!slice) return { done: true, seen: 0, stored: 0 };

    const source = this.sources.find((s) => s.name === slice.sourceName);
    const label = `${slice.sourceName} ${slice.query} ${slice.windowStart.slice(0, 4)}`;
    if (!source) {
      await this.fail(slice, `no such source: ${slice.sourceName}`);
      return { done: false, slice: label, seen: 0, stored: 0 };
    }

    await this.db
      .update(backfillSlices)
      .set({ status: 'running', startedAt: slice.startedAt ?? new Date(), updatedAt: new Date() })
      .where(this.key(slice));

    const taxonomy = await this.ingestion.taxonomy();
    let cursor = slice.pageCursor;
    let seen = 0;
    let stored = 0;
    let since = 0;

    try {
      for (let page = 0; page < PAGES_PER_RUN; page += 1) {
        const result = await source.fetchWindow(
          slice.windowStart,
          slice.windowEnd,
          slice.query,
          cursor,
          PAGE_SIZE,
        );
        for (const raw of result.articles) {
          const outcome = await this.ingestion.upsert(raw, taxonomy);
          seen += 1;
          if (outcome.stored) stored += 1;
          // See YIELD_EVERY: the loop must breathe or the queue decides this job is stuck.
          if ((since += 1) >= YIELD_EVERY) {
            since = 0;
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
        cursor = result.nextCursor;

        /*
         * Committed per page, not per run. The cursor is the only thing standing between an
         * interruption and repeating the year, and it is cheap to write.
         */
        await this.db
          .update(backfillSlices)
          .set({
            pageCursor: cursor,
            pagesDone: sql`${backfillSlices.pagesDone} + 1`,
            articlesSeen: sql`${backfillSlices.articlesSeen} + ${result.articles.length}`,
            articlesStored: sql`${backfillSlices.articlesStored} + ${stored}`,
            updatedAt: new Date(),
          })
          .where(this.key(slice));
        stored = 0;

        if (!cursor) break;
      }
    } catch (err) {
      await this.fail(slice, (err as Error).message);
      this.log.warn(`backfill ${label} failed: ${(err as Error).message}`);
      return { done: false, slice: label, seen, stored };
    }

    await this.db
      .update(backfillSlices)
      .set({
        // No cursor left means the year is exhausted; otherwise it goes back in the queue.
        status: cursor ? 'pending' : 'done',
        finishedAt: cursor ? null : new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(this.key(slice));

    this.log.log(`backfill ${label}: ${seen} seen${cursor ? ' (more to come)' : ' — complete'}`);
    return { done: false, slice: label, seen, stored };
  }

  private key(slice: { sourceName: string; query: string; windowStart: string }) {
    return and(
      eq(backfillSlices.sourceName, slice.sourceName),
      eq(backfillSlices.query, slice.query),
      eq(backfillSlices.windowStart, slice.windowStart),
    );
  }

  private async fail(
    slice: { sourceName: string; query: string; windowStart: string },
    message: string,
  ): Promise<void> {
    await this.db
      .update(backfillSlices)
      .set({ status: 'failed', lastError: message.slice(0, 500), updatedAt: new Date() })
      .where(this.key(slice));
  }
}
