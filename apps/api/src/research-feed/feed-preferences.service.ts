import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type Database } from "../db/db.module";
import { feedPreferences } from "../db/schema";
import type { FeedFilters } from "./feed.service";

/**
 * The criteria a member has chosen to *keep*.
 *
 * One row per member — "my feed settings", not a list of named saved searches. Saved
 * searches are a different feature: they would want naming, listing and deleting, and
 * nothing here forecloses them.
 *
 * ⚠️ **No tags, and no longer any relationship with `member_interests`.** Saving the panel
 * used to write its tag row back as the member's clinical interests, with a warning, because
 * the two were the same thing seen from two screens. They are not any more: My Research
 * answers these criteria and nothing else, so saving touches this row and only this row.
 *
 * ⚠️ Standing criteria **seed the panel; they do not run themselves.** An unfiltered visit
 * shows an empty screen with the panel open, which is the point of the redesign — the member
 * says what they want and presses Apply. Pre-filling the fields saves the retyping without
 * putting results on a screen nobody has asked a question of.
 */
export type SavedCriteria = FeedFilters;

@Injectable()
export class FeedPreferencesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The standing criteria, ready to seed the panel. */
  async get(handleId: string): Promise<SavedCriteria> {
    const [row] = await this.db
      .select()
      .from(feedPreferences)
      .where(eq(feedPreferences.handleId, handleId));
    return {
      query: row?.query ?? undefined,
      evidence: (row?.evidence as FeedFilters["evidence"]) ?? undefined,
      periodYears: row?.periodYears ?? undefined,
      sort: (row?.sort as FeedFilters["sort"]) ?? "newest",
    };
  }

  /** Save the criteria as the member's standing settings. */
  async save(
    handleId: string,
    criteria: SavedCriteria,
  ): Promise<SavedCriteria> {
    const value = {
      handleId,
      query: criteria.query?.trim() || null,
      evidence: criteria.evidence ?? null,
      periodYears: criteria.periodYears ?? null,
      sort: criteria.sort ?? "newest",
      updatedAt: new Date(),
    };
    await this.db
      .insert(feedPreferences)
      .values(value)
      .onConflictDoUpdate({ target: feedPreferences.handleId, set: value });
    return this.get(handleId);
  }

  /** Forget the standing settings. */
  async clear(handleId: string): Promise<void> {
    await this.db
      .delete(feedPreferences)
      .where(eq(feedPreferences.handleId, handleId));
  }
}
