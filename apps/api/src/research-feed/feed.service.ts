import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import type { EvidenceType } from './scoring';

const DEFAULT_PAGE_SIZE = 20;
/** How many tag chips a card carries before the row stops being readable. */
const MAX_CARD_TAGS = 4;

export type FeedArticle = {
  id: string;
  title: string;
  /** Trimmed for the card; the full text is on the detail screen. */
  snippet: string | null;
  journal: string | null;
  publishedDate: string | null;
  evidenceType: EvidenceType;
  openAccess: boolean;
  url: string | null;
  /** What the classifier matched — the "recommended because" evidence, shown as chips. */
  tags: { id: string; name: string; region: string }[];
};

/** One block of a structured abstract — see `abstract.ts` for why these are parsed. */
export type AbstractSection = { heading: string | null; body: string };

export type ArticleDetail = FeedArticle & {
  abstract: string | null;
  abstractSections: AbstractSection[];
  doi: string | null;
};

export type FeedSearchPage = {
  articles: FeedArticle[];
  nextCursor: string | null;
  /**
   * How many articles match in total, not how many are on this page.
   *
   * The forum's search returns no total and its screen counts the array it was handed, so a
   * query matching 25 posts reads "20 results" and then offers *More*. A tab header cannot
   * be wrong that way, so this is a real count — cheap here via a window function over the
   * matched set, and worth capping ("99+") when the corpus is large enough that counting
   * every match stops being free.
   */
  total: number;
};

export type FeedPage = {
  articles: FeedArticle[];
  nextCursor: string | null;
  /**
   * How this page was ranked, so the screen can be honest about it: `personalised` when it
   * matched the member's interests, `general` when they have none, and `fallback` when they
   * have interests but nothing in the corpus matched them yet.
   */
  mode: 'personalised' | 'general' | 'fallback';
};

/**
 * The read side of the research feed (EPIC-I §6, screens B1 and B2).
 *
 * **Unfiltered at this slice.** Interests are not built yet — how a member picks them is
 * genuinely undecided (reuse the 588-node taxonomy, or a shorter curated list?), and the
 * honest way to answer that is to look at which tags a real corpus actually produces
 * rather than to guess. So this ranks the whole corpus for everyone, and the personalised
 * half slots in later as a join against `member_interests` without disturbing anything
 * here: the classification it needs is already stored per article.
 */
@Injectable()
export class FeedService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * **Recency is applied here, not stored.** A stored recency score describes the world on
   * the day it was written and rots quietly thereafter; computed at read time it is always
   * right. The curve is a gentle hyperbolic decay — full weight today, half at six months,
   * never quite zero — rather than the prototype's linear fall to nothing at ten years,
   * which declared a 2015 systematic review worthless.
   */
  /**
   * Every tag's root region, walked once per query rather than once per article.
   *
   * A tag name is only unique among its siblings, so "Tendons" exists under both Shoulder and
   * Knee and "Nerve" under four regions. The card cannot say which one it means without this,
   * and that is not cosmetic: selecting *Upper Limb* matches its whole subtree, so a paper can
   * arrive through `Tendinopathy` — a child of Forearm — with nothing on the card to explain
   * why. The picker already renders `name · region` for exactly this reason.
   */
  private readonly tagRegion = sql`with recursive tag_region as (
        select id, name as region from community.tags where parent_id is null
        union all
        select c.id, r.region from community.tags c join tag_region r on c.parent_id = r.id
      )`;

  async list(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
    interestTagIds: string[] = [],
    handleId?: string,
  ): Promise<FeedPage> {
    const offset = Number.parseInt(cursor ?? '0', 10) || 0;

    if (interestTagIds.length > 0) {
      const personalised = await this.rank(offset, limit, interestTagIds, handleId);
      // A member with narrow interests and a young corpus would otherwise get an empty
      // screen that looks broken. Falling back to the general ranking is better than
      // nothing, and `mode` lets the screen say which it is rather than pretend.
      if (personalised.articles.length > 0) return { ...personalised, mode: 'personalised' };
      const general = await this.rank(offset, limit, []);
      return { ...general, mode: 'fallback' };
    }

    const general = await this.rank(offset, limit, []);
    return { ...general, mode: 'general' };
  }

  private async rank(
    offset: number,
    limit: number,
    interestTagIds: string[],
    handleId?: string,
  ): Promise<Omit<FeedPage, 'mode'>> {
    /*
     * **An interest covers its whole subtree**, the same way a tag filter does in search.
     *
     * This was a plain `tag_id in (…)`, so following *Ankle* matched only articles tagged
     * literally "Ankle" — 17 of the 24 in its 13-node subtree, missing Lateral ankle sprain
     * and Chronic ankle instability. Inconsistent with search, and inconsistent with the
     * composer's picker, which drops an ancestor when a descendant is chosen *precisely
     * because* it assumes broadening happens at query time.
     *
     * Weight propagates down from the interest that was actually chosen, so a future
     * weighting UI keeps working without the member having to weight every leaf.
     */
    // Appended to `tagRegion` rather than opening its own WITH: one `with recursive` governs
    // the whole list, and both of these recurse.
    const expanded = sql`, expanded as (
        select mi.tag_id as id, mi.weight
          from community.member_interests mi
         where mi.handle_id = ${handleId ?? null}
        union all
        select c.id, e.weight
          from community.tags c join expanded e on c.parent_id = e.id
      )`;

    const { rows } = await this.db.execute<FeedRow>(sql`
      ${this.tagRegion}${interestTagIds.length > 0 ? expanded : sql``}
      select a.id, a.title, a.abstract, a.journal, a.published_date, a.evidence_type,
             a.open_access, a.url,
             (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name,
                                                        'region', m.region)
                                       order by m.confidence desc, m.name), '[]')
                from (
                  -- Distinct on *name*, not id. Taxonomy names are only sibling-scoped
                  -- unique, so "Nerve" and "Bone" exist under several branches at once and
                  -- a plain join renders "Nerve, Nerve, Nerve" on the card. The strongest
                  -- match for a given name is the one worth showing.
                  select distinct on (t.name) t.id, t.name, r.region, at.confidence
                    from research.article_tags at
                    join community.tags t on t.id = at.tag_id
                    join tag_region r on r.id = t.id
                   where at.article_id = a.id
                   order by t.name, at.confidence desc
                ) m
             ) as tags
        from research.articles a
       where a.retracted_at is null
         ${
           interestTagIds.length > 0
             ? sql`and exists (
                 select 1 from research.article_tags m
                   join expanded x on x.id = m.tag_id
                  where m.article_id = a.id
               )`
             : sql``
         }
       order by (
         a.intrinsic_score
         + 1.0 / (1.0 + (extract(epoch from (now() - coalesce(a.published_date, a.created_at)))
                         / 86400.0) / 180.0)
         /*
          * A small bonus for being placeable in the clinical taxonomy at all.
          *
          * Without it the first page was entirely *untagged* systematic reviews — top-ranked
          * on evidence and recency alone, with nothing on the card to show they had anything
          * to do with sports medicine ("Pure Cognitive Training on Gait and Balance in Older
          * Adults" led the feed). That the classifier could place an article is real evidence
          * it belongs here, and capped low so it nudges rather than decides.
          *
          * This is also the seam the personalised feed replaces: when interests exist, this
          * term becomes the weighted member-interest match instead of a flat count.
          */
         ${
           interestTagIds.length > 0
             ? /*
                * The member-relative half of the score, and the reason the classification is
                * precomputed: this is a join and a sum, not a text match. Weight comes from
                * `member_interests`, so degrees of interest are already wired even though the
                * picker currently sets everything to 1. Confidence multiplies in, so a tag
                * found in a title counts for more than one mentioned in an abstract.
                */
               sql`+ coalesce((
                   select sum(x.weight * at.confidence)
                     from research.article_tags at
                     join expanded x on x.id = at.tag_id
                    where at.article_id = a.id
                 ), 0)`
             : // No interests: a flat nudge for being placeable in the taxonomy at all,
               // which is what keeps unclassifiable articles off the first page.
               sql`+ least(0.45, 0.15 * (select count(*) from research.article_tags at
                                          where at.article_id = a.id))`
         }
       ) desc, a.published_date desc nulls last, a.id desc
       limit ${limit + 1} offset ${offset}
    `);

    const page = rows.slice(0, limit);
    return {
      articles: page.map(toArticle),
      nextCursor: rows.length > limit ? String(offset + limit) : null,
    };
  }

  /**
   * Full-text search over the corpus (S16).
   *
   * **Separate from `list`, not a filter on it.** `list` ranks by the member's interests;
   * search must reach the whole corpus, because the reason to type a word is usually that
   * it is *outside* what you already follow. Ranking is therefore relevance first, with the
   * feed's own tiebreak behind it — papers have no kudos, so recency and evidence weight are
   * what stand in for the forum's kudos tail.
   *
   * **No trigram fallback, unlike posts.** The forum falls back to `pg_trgm` similarity when
   * a query matches no lexemes, and says so via `didYouMean`. A near-miss on a question
   * title is a plausible guess at what someone meant; a near-miss across 2,597 abstracts is
   * mostly noise, and the honest answer to a misspelt search of the literature is that we
   * found nothing. Revisit with real queries rather than in the abstract.
   */
  /**
   * Search the corpus, optionally narrowed by clinical tag and evidence type.
   *
   * **Tags reach both corpora; the category never could.** Articles are classified against
   * the same taxonomy the forum tags posts with, so a tag subtree is a question this corpus
   * can answer — which is why the tag filter lives with the query, ahead of the results,
   * while category and evidence sit *on* the results of the tab each belongs to.
   *
   * A tag on its own is a legitimate search here, exactly as it is in the forum: the whole
   * point of "everything under Achilles tendinopathy" is that there are no words that would
   * express it better.
   */
  async search(
    term: string,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
    tagIds: string[] = [],
    evidence?: EvidenceType,
  ): Promise<FeedSearchPage> {
    const query = term.trim();
    if (query === '' && tagIds.length === 0) return { articles: [], nextCursor: null, total: 0 };
    const offset = Number.parseInt(cursor ?? '0', 10) || 0;

    // Each tag matches the tag *and its whole subtree*, the same expansion the forum search
    // and the personalised feed both make — picking "Lower Limb" has to find an article
    // tagged "Achilles tendinopathy", or the three surfaces disagree about what a tag means.
    const tagPredicates = tagIds.map(
      (tagId) => sql`and exists (
        with recursive subtree as (
          select id from community.tags where id = ${tagId}
          union all
          select c.id from community.tags c join subtree s on c.parent_id = s.id
        )
        select 1 from research.article_tags at
        where at.article_id = a.id and at.tag_id in (select id from subtree)
      )`,
    );
    const tagFilter = tagPredicates.length > 0 ? sql.join(tagPredicates, sql` `) : sql``;
    // With no words to rank by, a tag-only search falls back to the feed's own ordering.
    const textFilter = query === '' ? sql`` : sql`and a.tsv @@ websearch_to_tsquery('english', ${query})`;
    const ranking =
      query === ''
        ? sql`a.intrinsic_score desc`
        : sql`ts_rank_cd(a.tsv, websearch_to_tsquery('english', ${query})) desc`;

    const { rows } = await this.db.execute<FeedRow & { total: string }>(sql`
      ${this.tagRegion}
      select a.id, a.title, a.abstract, a.journal, a.published_date, a.evidence_type,
             a.open_access, a.url,
             (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name,
                                                        'region', m.region)
                                       order by m.confidence desc, m.name), '[]')
                from (
                  select distinct on (t.name) t.id, t.name, r.region, at.confidence
                    from research.article_tags at
                    join community.tags t on t.id = at.tag_id
                    join tag_region r on r.id = t.id
                   where at.article_id = a.id
                   order by t.name, at.confidence desc
                ) m
             ) as tags,
             -- The count of everything matched, carried on each row: one query rather than
             -- a second round trip, and the window is computed before the limit applies.
             count(*) over () as total
        from research.articles a
       where a.retracted_at is null
         ${textFilter}
         ${evidence ? sql`and a.evidence_type = ${evidence}` : sql``}
         ${tagFilter}
       order by ${ranking},
                a.published_date desc nulls last,
                a.intrinsic_score desc,
                a.id desc
       limit ${limit + 1} offset ${offset}
    `);

    const page = rows.slice(0, limit);
    return {
      articles: page.map(toArticle),
      nextCursor: rows.length > limit ? String(offset + limit) : null,
      total: Number(rows[0]?.total ?? 0),
    };
  }

  /** Screen B2. The abstract is the point — see the design note on why we do not frame. */
  async detail(articleId: string): Promise<ArticleDetail> {
    const { rows } = await this.db.execute<
      FeedRow & { doi: string | null; abstract_sections: AbstractSection[] }
    >(sql`
      ${this.tagRegion}
      select a.id, a.title, a.abstract, a.abstract_sections, a.journal, a.published_date,
             a.evidence_type, a.open_access, a.url, a.doi,
             (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name,
                                                        'region', m.region)
                                       order by m.confidence desc, m.name), '[]')
                from (
                  -- Distinct on *name*, not id. Taxonomy names are only sibling-scoped
                  -- unique, so "Nerve" and "Bone" exist under several branches at once and
                  -- a plain join renders "Nerve, Nerve, Nerve" on the card. The strongest
                  -- match for a given name is the one worth showing.
                  select distinct on (t.name) t.id, t.name, r.region, at.confidence
                    from research.article_tags at
                    join community.tags t on t.id = at.tag_id
                    join tag_region r on r.id = t.id
                   where at.article_id = a.id
                   order by t.name, at.confidence desc
                ) m
             ) as tags
        from research.articles a
       where a.id = ${articleId}
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('That article is not in the feed.');
    return {
      ...toArticle(row),
      abstract: row.abstract,
      // Older rows predate section parsing; fall back so the screen always has something.
      abstractSections:
        row.abstract_sections?.length > 0
          ? row.abstract_sections
          : row.abstract
            ? [{ heading: null, body: row.abstract }]
            : [],
      doi: row.doi,
    };
  }
}

type FeedRow = {
  id: string;
  title: string;
  abstract: string | null;
  journal: string | null;
  published_date: Date | null;
  evidence_type: EvidenceType;
  open_access: boolean;
  url: string | null;
  tags: { id: string; name: string; region: string }[];
};

function toArticle(row: FeedRow): FeedArticle {
  return {
    id: row.id,
    title: row.title,
    snippet: snippet(row.abstract),
    journal: row.journal,
    publishedDate: row.published_date ? new Date(row.published_date).toISOString() : null,
    evidenceType: row.evidence_type,
    openAccess: row.open_access,
    url: row.url,
    // Capped for the card: past three or four the chip row wraps and stops being scannable.
    tags: (row.tags ?? []).slice(0, MAX_CARD_TAGS),
  };
}

/** Enough of the abstract to judge relevance by, not enough to replace opening it. */
function snippet(abstract: string | null, max = 220): string | null {
  if (!abstract) return null;
  const flat = abstract.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}
