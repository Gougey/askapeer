import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { adminAuditLog, tags } from '../db/schema';
import { classify, prepareTaxonomy } from '../research-feed/classifier';

export type AdminTag = {
  id: string;
  name: string;
  region: string;
  facet: string;
  parentName: string | null;
  synonyms: string[];
  /** How much this tag is carrying — the honest measure of whether it is working. */
  articleCount: number;
  postCount: number;
  retired: boolean;
};

export type SynonymPreview = {
  current: { articles: number };
  proposed: { articles: number; samples: string[] };
};

/**
 * The tag vocabulary, for administrators (EPIC-J, screen G8).
 *
 * Phase one is deliberately **synonyms only**. They change what *matches* and move nothing:
 * a bad synonym over-tags some articles and is undone by deleting it. Structural edits —
 * re-parenting, merging, retiring — change subtree expansion for search, feed
 * classification and post filtering at the same time, and deserve their own slice rather
 * than riding along with the easy half.
 */
@Injectable()
export class TaxonomyService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Search the vocabulary, or list it.
   *
   * Matches **synonyms as well as names**, because that is how an administrator checks
   * their own work: having put "quadriceps" on eight scattered tags, searching it must find
   * all eight or the change looks like it failed.
   */
  async search(query?: string): Promise<AdminTag[]> {
    const needle = (query ?? '').trim().toLowerCase();
    return this.rows(
      needle === ''
        ? sql`true`
        : sql`(
            lower(w.name) like ${'%' + needle + '%'}
            or exists (select 1 from unnest(w.synonyms) s where lower(s) like ${'%' + needle + '%'})
          )`,
      300,
    );
  }

  /** The one shape both the list and the single read return. */
  private async rows(where: SQL, limit: number): Promise<AdminTag[]> {
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      region: string;
      facet: string;
      parent_name: string | null;
      synonyms: string[];
      article_count: number;
      post_count: number;
      retired: boolean;
    }>(sql`
      with recursive walk as (
        select id, name, parent_id, facet, synonyms, retired_at, name as region
          from community.tags where parent_id is null
        union all
        select t.id, t.name, t.parent_id, t.facet, t.synonyms, t.retired_at, w.region
          from community.tags t join walk w on t.parent_id = w.id
      )
      select w.id, w.name, w.region, w.facet,
             p.name as parent_name,
             w.synonyms,
             (select count(*) from research.article_tags at where at.tag_id = w.id)::int as article_count,
             (select count(*) from community.post_tags pt where pt.tag_id = w.id)::int as post_count,
             (w.retired_at is not null) as retired
        from walk w
        left join community.tags p on p.id = w.parent_id
       where ${where}
       order by w.name
       limit ${limit}
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      facet: r.facet,
      parentName: r.parent_name,
      synonyms: r.synonyms ?? [],
      articleCount: Number(r.article_count),
      postCount: Number(r.post_count),
      retired: r.retired,
    }));
  }

  /**
   * One tag by id.
   *
   * Queried directly rather than filtered out of `search()`, which caps at 300 rows: with
   * 588 tags that quietly 404'd anything alphabetically past the cap, including every tag
   * an administrator had just created. The list needs a limit; a lookup by primary key must
   * not inherit it.
   */
  async get(tagId: string): Promise<AdminTag> {
    const rows = await this.rows(sql`w.id = ${tagId}`, 1);
    const tag = rows[0];
    if (!tag) throw new NotFoundException('No such tag.');
    return tag;
  }

  /**
   * **What would change if I saved this?**
   *
   * The point of the screen. Editing synonyms otherwise means guessing: an administrator
   * types a word, saves, reclassifies the whole corpus, and only then finds out whether it
   * helped or flooded the tag with noise. Here the classifier is run against the stored
   * corpus with the proposed synonyms and *nothing is written* — so "anterior cruciate
   * ligament" can be shown to take a tag from 17 articles to 216 before anyone commits.
   *
   * Samples matter as much as the count: a number says how much changed, and the titles say
   * whether it changed the right way. Over-matching looks like a big number and obviously
   * wrong titles.
   */
  async preview(tagId: string, proposed: string[]): Promise<SynonymPreview> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundException('No such tag.');

    const { rows: corpus } = await this.db.execute<{
      id: string;
      title: string;
      abstract: string | null;
    }>(sql`select id, title, abstract from research.articles where retracted_at is null`);

    const depth = await this.depthOf(tagId);
    const run = (synonyms: string[]) => {
      // One tag, prepared alone: `prepareTaxonomy` also decides whether a parenthetical is
      // a gloss or a disambiguator by looking for shared base names, which cannot be judged
      // from a single tag — so the live behaviour is approximated closely rather than
      // exactly for the handful of tags with parentheses.
      const prepared = prepareTaxonomy([{ id: tag.id, name: tag.name, synonyms, depth }]);
      const hits: string[] = [];
      for (const article of corpus) {
        if (classify(article, prepared).length > 0) hits.push(article.title);
      }
      return hits;
    };

    const currentHits = run(tag.synonyms ?? []);
    const proposedHits = run(proposed);
    // Show what the change *adds*, not the whole matched set — the delta is the question.
    const added = proposedHits.filter((title) => !currentHits.includes(title));

    return {
      current: { articles: currentHits.length },
      proposed: { articles: proposedHits.length, samples: added.slice(0, 8) },
    };
  }

  /** Save, and record it — a synonym silently changes what every member can find. */
  async setSynonyms(tagId: string, synonyms: string[], actorMemberId: string): Promise<AdminTag> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundException('No such tag.');

    const cleaned = [
      ...new Set(synonyms.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 1)),
    ];
    await this.db.update(tags).set({ synonyms: cleaned }).where(eq(tags.id, tagId));
    await this.db.insert(adminAuditLog).values({
      actorMemberId,
      action: 'tag.synonyms_updated',
      targetType: 'tag',
      targetId: tagId,
      detail: { name: tag.name, before: tag.synonyms ?? [], after: cleaned },
    });
    return this.get(tagId);
  }

  /** Recent configuration changes, newest first (EPIC-J §3). */
  async auditLog(limit = 50) {
    const { rows } = await this.db.execute(sql`
      select l.action, l.target_type, l.target_id, l.detail, l.created_at, m.email as actor
        from config.admin_audit_log l
        left join identity.members m on m.id = l.actor_member_id
       order by l.created_at desc
       limit ${limit}
    `);
    return rows;
  }

  private async depthOf(tagId: string): Promise<number> {
    const { rows } = await this.db.execute<{ depth: number }>(sql`
      with recursive up as (
        select id, parent_id, 0 as depth from community.tags where id = ${tagId}
        union all
        select t.id, t.parent_id, up.depth + 1 from community.tags t join up on up.parent_id = t.id
      )
      select max(depth)::int as depth from up
    `);
    return Number(rows[0]?.depth ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Structural edits (phase two). Unlike synonyms, these move things: a re-parent
  // changes subtree expansion for search, for feed interests and for post filtering at
  // once, and a merge rewrites rows in three tables. Hence the guards below, each of
  // which exists because the operation can corrupt something that is hard to notice.
  // ---------------------------------------------------------------------------

  /**
   * Add a tag — the operation Pelvis needs.
   *
   * Names are only **sibling-scoped** unique (`unique(parent_id, lower(name))`, plus a
   * partial unique on root names), which is what lets "Nerve" exist under several branches.
   * So a clash is checked against the chosen parent, not globally, and the message says
   * where the clash is or an administrator cannot act on it.
   */
  async addTag(
    input: { name: string; parentId: string | null; facet: string; synonyms?: string[] },
    actorMemberId: string,
  ): Promise<AdminTag> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('A tag needs a name.');

    if (input.parentId) {
      const [parent] = await this.db.select().from(tags).where(eq(tags.id, input.parentId));
      if (!parent) throw new BadRequestException('That parent does not exist.');
    }
    await this.assertNameFree(name, input.parentId);

    const [created] = await this.db
      .insert(tags)
      .values({
        name,
        parentId: input.parentId,
        facet: input.facet as 'region' | 'muscle' | 'structure' | 'pathology',
        synonyms: (input.synonyms ?? []).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 1),
      })
      .returning({ id: tags.id });

    await this.audit(actorMemberId, 'tag.added', created.id, {
      name,
      parentId: input.parentId,
      facet: input.facet,
    });
    return this.get(created.id);
  }

  /**
   * Rename, and/or move to a different parent — what the mis-parented generic groups need
   * (*Tendon Disorders* sits under Cervical Spine while matching knee and Achilles content).
   *
   * **The cycle check is the important one.** Re-parenting a node beneath its own descendant
   * produces a loop, and every read of this table is a recursive CTE — the tag picker, search
   * subtree expansion, feed interest expansion. A cycle would not corrupt a row; it would
   * hang each of those queries, in production, with no obvious cause.
   */
  async updateTag(
    tagId: string,
    changes: { name?: string; parentId?: string | null },
    actorMemberId: string,
  ): Promise<AdminTag> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundException('No such tag.');

    const name = changes.name?.trim() || tag.name;
    const parentId = changes.parentId === undefined ? tag.parentId : changes.parentId;

    if (parentId === tagId) throw new BadRequestException('A tag cannot be its own parent.');
    if (parentId && (await this.isDescendant(parentId, tagId))) {
      throw new BadRequestException(
        'That would put the tag underneath itself, which would loop every taxonomy query.',
      );
    }
    if (name !== tag.name || parentId !== tag.parentId) {
      await this.assertNameFree(name, parentId, tagId);
    }

    await this.db.update(tags).set({ name, parentId }).where(eq(tags.id, tagId));
    await this.audit(actorMemberId, 'tag.updated', tagId, {
      before: { name: tag.name, parentId: tag.parentId },
      after: { name, parentId },
    });
    return this.get(tagId);
  }

  /**
   * Retire, never delete (EPIC-J §4).
   *
   * A tag that posts already carry cannot be removed without orphaning or rewriting member
   * content. Retiring hides it from the composer and the pickers while leaving every
   * existing association intact and still filterable — the same "content is an archive"
   * rule applied to expelled handles and removed posts. Reversible, because a retire made
   * in error should not need a developer.
   */
  async setRetired(tagId: string, retired: boolean, actorMemberId: string): Promise<AdminTag> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundException('No such tag.');
    await this.db
      .update(tags)
      .set({ retiredAt: retired ? new Date() : null })
      .where(eq(tags.id, tagId));
    await this.audit(actorMemberId, retired ? 'tag.retired' : 'tag.restored', tagId, {
      name: tag.name,
    });
    return this.get(tagId);
  }

  /**
   * Fold one tag into another: repoint everything that references the loser, then retire it.
   *
   * **Three tables, not one.** EPIC-J specifies merge as repointing `post_tags` — written
   * before `research.article_tags` and `community.member_interests` existed. Missing the
   * last would silently delete members' interests, which is the kind of loss nobody reports
   * because nobody can see it happen.
   *
   * Each repoint is `on conflict do nothing` followed by a delete, because the winner may
   * already hold the same row: an article tagged with both, a member interested in both. A
   * bare update would violate the composite primary key and fail the whole merge.
   */
  async mergeTags(loserId: string, winnerId: string, actorMemberId: string) {
    if (loserId === winnerId) throw new BadRequestException('A tag cannot merge into itself.');
    const [loser] = await this.db.select().from(tags).where(eq(tags.id, loserId));
    const [winner] = await this.db.select().from(tags).where(eq(tags.id, winnerId));
    if (!loser || !winner) throw new NotFoundException('No such tag.');
    if (await this.hasChildren(loserId)) {
      throw new BadRequestException(
        'Move or merge its children first — merging a parent would strand them.',
      );
    }

    const moved = await this.db.transaction(async (tx) => {
      /*
       * Three explicit blocks rather than one loop over table names. They are nearly
       * identical, and a loop would have to switch the owning column per table
       * (`post_id` / `article_id` / `handle_id`) through string interpolation — clever,
       * unreadable, and exactly the kind of thing that silently repoints the wrong column.
       *
       * Each moves what it can, then deletes the rest: the winner may already hold the same
       * row (an article carrying both tags, a member interested in both), and a bare update
       * would violate the composite primary key and fail the whole merge.
       */
      const posts = await tx.execute<{ moved: number }>(sql`
        with moved as (
          update community.post_tags pt set tag_id = ${winnerId}
           where pt.tag_id = ${loserId}
             and not exists (select 1 from community.post_tags w
                              where w.tag_id = ${winnerId} and w.post_id = pt.post_id)
          returning 1)
        select count(*)::int as moved from moved`);
      await tx.execute(sql`delete from community.post_tags where tag_id = ${loserId}`);

      const articles = await tx.execute<{ moved: number }>(sql`
        with moved as (
          update research.article_tags at set tag_id = ${winnerId}
           where at.tag_id = ${loserId}
             and not exists (select 1 from research.article_tags w
                              where w.tag_id = ${winnerId} and w.article_id = at.article_id)
          returning 1)
        select count(*)::int as moved from moved`);
      await tx.execute(sql`delete from research.article_tags where tag_id = ${loserId}`);

      const interests = await tx.execute<{ moved: number }>(sql`
        with moved as (
          update community.member_interests mi set tag_id = ${winnerId}
           where mi.tag_id = ${loserId}
             and not exists (select 1 from community.member_interests w
                              where w.tag_id = ${winnerId} and w.handle_id = mi.handle_id)
          returning 1)
        select count(*)::int as moved from moved`);
      await tx.execute(sql`delete from community.member_interests where tag_id = ${loserId}`);

      await tx.update(tags).set({ retiredAt: new Date() }).where(eq(tags.id, loserId));
      return {
        posts: Number(posts.rows[0]?.moved ?? 0),
        articles: Number(articles.rows[0]?.moved ?? 0),
        interests: Number(interests.rows[0]?.moved ?? 0),
      };
    });

    await this.audit(actorMemberId, 'tag.merged', loserId, {
      loser: loser.name,
      winner: winner.name,
      winnerId,
      moved,
    });
    return { loser: loser.name, winner: winner.name, moved };
  }

  /** Sibling-scoped, matching the database's own unique indexes. */
  private async assertNameFree(name: string, parentId: string | null, exceptId?: string) {
    const { rows } = await this.db.execute<{ id: string }>(sql`
      select id from community.tags
       where lower(name) = ${name.toLowerCase()}
         and parent_id is not distinct from ${parentId}
         ${exceptId ? sql`and id <> ${exceptId}` : sql``}
       limit 1
    `);
    if (rows.length > 0) {
      throw new BadRequestException(
        parentId
          ? 'A tag with that name already exists under that parent.'
          : 'A region with that name already exists.',
      );
    }
  }

  private async isDescendant(candidateId: string, ancestorId: string): Promise<boolean> {
    const { rows } = await this.db.execute<{ hit: number }>(sql`
      with recursive down as (
        select id from community.tags where id = ${ancestorId}
        union all
        select c.id from community.tags c join down d on c.parent_id = d.id
      )
      select 1 as hit from down where id = ${candidateId} limit 1
    `);
    return rows.length > 0;
  }

  private async hasChildren(tagId: string): Promise<boolean> {
    const { rows } = await this.db.execute(sql`
      select 1 from community.tags where parent_id = ${tagId} limit 1
    `);
    return rows.length > 0;
  }

  private async audit(
    actorMemberId: string,
    action: string,
    targetId: string,
    detail: Record<string, unknown>,
  ) {
    await this.db
      .insert(adminAuditLog)
      .values({ actorMemberId, action, targetType: 'tag', targetId, detail });
  }
}
