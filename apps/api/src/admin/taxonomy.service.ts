import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
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
       where ${needle === '' ? sql`true` : sql`(
               lower(w.name) like ${'%' + needle + '%'}
               or exists (select 1 from unnest(w.synonyms) s where lower(s) like ${'%' + needle + '%'})
             )`}
       order by w.name
       limit 300
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

  async get(tagId: string): Promise<AdminTag> {
    const tag = (await this.search()).find((t) => t.id === tagId);
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
}
