import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { memberInterests } from '../db/schema';

export type InterestOption = {
  id: string;
  name: string;
  /** Which region of the taxonomy it sits under — names are only sibling-scoped unique. */
  region: string;
  /** How many articles in the current corpus carry it. The reason this list is ordered. */
  articleCount: number;
};

@Injectable()
export class InterestsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * What a member can pick from — **ordered by what the corpus actually contains**, not by
   * the shape of the taxonomy.
   *
   * The taxonomy has 588 nodes and only **227 have ever matched an article**; 361 are
   * unreachable in practice. Offering the raw tree would ask a member to hunt through
   * hundreds of terms, most of which would return nothing however carefully they were
   * chosen, and would quietly teach them the feed is broken.
   *
   * So the list is derived from `research.article_tags`: every tag that has real articles
   * behind it, commonest first, with the count shown. A member picking *Achilles
   * tendinopathy* can see there are 32 articles waiting. Tags with nothing behind them are
   * still reachable by search (they may pick up articles later) but are not offered first.
   */
  async options(limit = 120): Promise<InterestOption[]> {
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      region: string;
      article_count: number;
    }>(sql`
      with recursive walk as (
        select id, name, parent_id, name as region from community.tags where parent_id is null
        union all
        select t.id, t.name, t.parent_id, w.region
        from community.tags t join walk w on t.parent_id = w.id
      )
      select w.id, w.name, w.region, count(at.article_id)::int as article_count
        from walk w
        join research.article_tags at on at.tag_id = w.id
        join research.articles a on a.id = at.article_id and a.retracted_at is null
       group by w.id, w.name, w.region
       order by article_count desc, w.name
       limit ${limit}
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      articleCount: Number(r.article_count),
    }));
  }

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
