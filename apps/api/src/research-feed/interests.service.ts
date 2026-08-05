import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { memberInterests } from '../db/schema';

/**
 * A member's clinical interests (EPIC-I §3).
 *
 * There is deliberately **no "what should I pick" endpoint** here. An earlier version
 * offered the tags with the most articles behind them, which inverted how a member thinks:
 * a hand-therapy or paediatric-sport specialist picks *their area*, not whatever happens to
 * be common, and a frequency cut silently removed their specialty from the screen. The
 * picker now offers the whole taxonomy through the composer's control, and the feed's
 * `fallback` mode is what says "nothing matches yet" — a fact about today's corpus, stated
 * where it is true rather than baked into what a member may choose.
 */
@Injectable()
export class InterestsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(handleId: string): Promise<{ tagIds: string[] }> {
    const rows = await this.db
      .select({ tagId: memberInterests.tagId })
      .from(memberInterests)
      .where(eq(memberInterests.handleId, handleId));
    return { tagIds: rows.map((r) => r.tagId) };
  }

  /**
   * Replace the whole set rather than upserting one at a time.
   *
   * The picker always knows every selection, so sending the set is one request and is
   * idempotent — a partial update would need a merge rule that nothing on either side
   * wants, and would make "I deselected that" a second kind of call.
   */
  async replace(handleId: string, tagIds: string[]): Promise<{ tagIds: string[] }> {
    const unique = [...new Set(tagIds)];
    await this.db.transaction(async (tx) => {
      await tx.delete(memberInterests).where(eq(memberInterests.handleId, handleId));
      if (unique.length > 0) {
        await tx
          .insert(memberInterests)
          .values(unique.map((tagId) => ({ handleId, tagId })))
          // A tag id that does not exist would violate the foreign key and take the whole
          // request down; the picker only ever sends real ids, and the constraint is the
          // backstop rather than the validation.
          .onConflictDoNothing();
      }
    });
    return { tagIds: unique };
  }

  /** Used by the feed to decide between the personalised and the general ranking. */
  async tagIdsFor(handleId: string): Promise<string[]> {
    const { tagIds } = await this.list(handleId);
    return tagIds;
  }

  /** Guards the write: only tags that exist can be stored. */
  async existingTagIds(tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) return [];
    const { rows } = await this.db.execute<{ id: string }>(sql`
      select id from community.tags where id in (${sql.join(tagIds.map((id) => sql`${id}`), sql`, `)})
    `);
    return rows.map((r) => r.id);
  }
}
