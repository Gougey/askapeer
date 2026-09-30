import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type Database } from "../db/db.module";
import { feedPreferences } from "../db/schema";
import type { FeedFilters } from "./feed.service";
import { InterestsService } from "./interests.service";

/**
 * The criteria a member has chosen to *keep* (Andrew's review item 6).
 *
 * One row per member — "my feed settings", not a list of named saved searches. Saved
 * searches are a different feature: they would want naming, listing and deleting, and
 * nothing here forecloses them.
 *
 * **The tags are not stored here.** They live in `community.member_interests`, which is the
 * one place a member's clinical interests exist. Keeping a second copy would mean the
 * Settings screen and the feed panel could disagree about what the member follows. Saving
 * a panel that has chosen tags therefore *overwrites* the interests — which is why the web
 * app warns before it does so.
 */
export type SavedCriteria = FeedFilters & { tagIds: string[] };

@Injectable()
export class FeedPreferencesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly interests: InterestsService,
  ) {}

  /** The whole standing criteria set, tags included, ready to seed the panel. */
  async get(handleId: string): Promise<SavedCriteria> {
    const [row] = await this.db
      .select()
      .from(feedPreferences)
      .where(eq(feedPreferences.handleId, handleId));
    const tagIds = await this.interests.tagIdsFor(handleId);
    return {
      tagIds,
      query: row?.query ?? undefined,
      evidence: (row?.evidence as FeedFilters["evidence"]) ?? undefined,
      periodYears: row?.periodYears ?? undefined,
      sort: (row?.sort as FeedFilters["sort"]) ?? "for_you",
    };
  }

  /**
   * Save the criteria as the member's standing settings.
   *
   * `tagIds` is only written through to the interests when it is **non-empty**. An empty tag
   * row in the panel means "use my interests", not "I have no interests" — treating it as the
   * latter would quietly delete a list the member curated by pressing Save on a panel they
   * never touched the tags in.
   */
  async save(
    handleId: string,
    criteria: SavedCriteria,
  ): Promise<SavedCriteria> {
    const value = {
      handleId,
      query: criteria.query?.trim() || null,
      evidence: criteria.evidence ?? null,
      periodYears: criteria.periodYears ?? null,
      sort: criteria.sort ?? "for_you",
      updatedAt: new Date(),
    };
    await this.db
      .insert(feedPreferences)
      .values(value)
      .onConflictDoUpdate({ target: feedPreferences.handleId, set: value });

    if (criteria.tagIds.length > 0) {
      const valid = await this.interests.existingTagIds(criteria.tagIds);
      await this.interests.replace(handleId, valid);
    }
    return this.get(handleId);
  }

  /** Forget the standing settings; the interests are left alone, being their own screen. */
  async clear(handleId: string): Promise<void> {
    await this.db
      .delete(feedPreferences)
      .where(eq(feedPreferences.handleId, handleId));
  }
}
