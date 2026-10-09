import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { articles, savedArticles } from '../db/schema';
import { FeedService, type FeedArticle } from './feed.service';

/**
 * A member's private list of articles to come back to (design doc 2026-10-09).
 *
 * ⚠️ **Every method derives the handle from the caller's session; none takes one as an
 * argument.** A reading list is close to a record of what a clinician is treating, and on a
 * pseudonymous platform that deserves to be structurally impossible to ask for rather than
 * merely not asked for. There is no endpoint that returns another handle's list, no count on a
 * public profile, and no aggregate that could be narrowed to one person. Moderators have no
 * view of it either: identity access is logged and justified, and a reading list is not
 * evidence of a policy violation.
 *
 * Saving produces **no notification and no activity entry**, to the member or to anyone else.
 */
@Injectable()
export class SavedArticlesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly feed: FeedService,
  ) {}

  /**
   * Save, idempotently.
   *
   * The article is checked first so that saving something that does not exist is a 404 rather
   * than a foreign-key error surfacing as a 500 — a stale list held open while an article is
   * cleaned up is ordinary, not exceptional.
   */
  async save(handleId: string, articleId: string): Promise<{ saved: true }> {
    const [exists] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, articleId));
    if (!exists) throw new NotFoundException('That article is not in the feed.');

    await this.db
      .insert(savedArticles)
      .values({ handleId, articleId })
      // The primary key is the uniqueness rule, so a second save is a no-op rather than an
      // error the caller has to distinguish from a real one.
      .onConflictDoNothing();
    return { saved: true };
  }

  /** Unsave, idempotently. Removing something that was never saved is not a failure. */
  async unsave(handleId: string, articleId: string): Promise<{ saved: false }> {
    await this.db
      .delete(savedArticles)
      .where(and(eq(savedArticles.handleId, handleId), eq(savedArticles.articleId, articleId)));
    return { saved: false };
  }

  /** Is this one saved? Folded into the article detail response rather than a second request. */
  async isSaved(handleId: string, articleId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ articleId: savedArticles.articleId })
      .from(savedArticles)
      .where(and(eq(savedArticles.handleId, handleId), eq(savedArticles.articleId, articleId)));
    return Boolean(row);
  }

  /**
   * Which of these articles this member has saved.
   *
   * **A second query rather than a join into the feed's ranking SQL, deliberately.** That query
   * is the one that went from 160ms to five seconds in October and had to be rebuilt (migration
   * 0052); it is also the one place in the product that must stay free of anything about the
   * member — `FeedService` takes no handle at all, which is what makes "two members asking the
   * same question see the same page" structural rather than a convention. Twenty primary-key
   * lookups after the page is already in hand cost nothing and risk nothing.
   */
  async savedIds(handleId: string, articleIds: string[]): Promise<Set<string>> {
    if (articleIds.length === 0) return new Set();
    const rows = await this.db
      .select({ articleId: savedArticles.articleId })
      .from(savedArticles)
      .where(
        and(eq(savedArticles.handleId, handleId), inArray(savedArticles.articleId, articleIds)),
      );
    return new Set(rows.map((row) => row.articleId));
  }

  /**
   * Stamp a page of articles with whether this member has saved each one.
   *
   * Lives here rather than in the controller so that every list which renders a card gets the
   * flag the same way — the feed, search and the saved list all need it now that the control is
   * on the card itself, and three hand-rolled versions is how one of them ends up always
   * reading "not saved".
   */
  async mark<T extends { id: string }>(
    handleId: string,
    page: T[],
  ): Promise<(T & { saved: boolean })[]> {
    const ids = await this.savedIds(
      handleId,
      page.map((article) => article.id),
    );
    return page.map((article) => ({ ...article, saved: ids.has(article.id) }));
  }

  /**
   * The number for the My Research header.
   *
   * Its own method because that header renders on every visit to the Research screen and must
   * not pay for a page of articles to learn one integer. Adrian chose to show it even at zero:
   * fifteen strangers have to *discover* this exists, and a count that only appears once you
   * have used the feature cannot advertise anything.
   */
  async count(handleId: string): Promise<{ count: number }> {
    const { rows } = await this.db.execute<{ n: number }>(sql`
      select count(*)::int as n from research.saved_articles where handle_id = ${handleId}
    `);
    return { count: rows[0]?.n ?? 0 };
  }

  /**
   * The list, newest saved first — not newest published.
   *
   * ⚠️ **Retracted articles stay in the list**, carrying `retractedAt` so the screen can say
   * so. Silently dropping one would be the worst option available: a member may have saved it
   * precisely because they were citing it, and the retraction is the single most important
   * thing to tell them.
   */
  async list(
    handleId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{
    articles: (FeedArticle & { retractedAt: string | null; saved: boolean })[];
    nextCursor: string | null;
  }> {
    const offset = Number.parseInt(cursor ?? '0', 10) || 0;
    const page = await this.feed.listSaved(handleId, offset, limit);
    // Asserted rather than queried: this *is* the saved list. The flag is here only because
    // the card carries the control and renders from one shape wherever it appears.
    return { ...page, articles: page.articles.map((article) => ({ ...article, saved: true })) };
  }
}
