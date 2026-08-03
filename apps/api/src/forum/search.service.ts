import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { BadgeService } from './badge.service';
import type { PostCard } from './posts.service';

const DEFAULT_PAGE_SIZE = 20;
/**
 * What a tag contributes to the match: its name **and its synonyms**.
 *
 * `community.tags.synonyms` is a text[] on the tag row, so this is not a second mechanism
 * bolted alongside tags — it is the same tag matching on more of the words people use for
 * it. A post tagged *Medial tibial stress syndrome* should be found by "MTSS" and by
 * "shin splints", which is what a clinician actually types; without the synonyms both
 * return nothing while the post sits there correctly tagged.
 */
const TAG_TEXT = sql`(t.name || ' ' || array_to_string(t.synonyms, ' '))`;
/** Below this a trigram match returns half the corpus; above it, real typos stop matching. */
const TRGM_THRESHOLD = 0.3;

export type SearchResults = {
  posts: PostCard[];
  /** Offset cursor — see the note in `search()` on why this one is not keyset. */
  nextCursor: string | null;
  /**
   * True when the tsquery matched nothing and these came from trigram similarity instead.
   * The screen says so rather than presenting a fuzzy match as an exact one.
   */
  didYouMean: boolean;
};

export type SearchQuery = {
  /** Absent or empty when the member searched on filters alone — see `search()`. */
  q?: string;
  category?: string;
  /** Tag ids. Each is expanded to its subtree; several are ANDed. */
  tags?: string[];
  cursor?: string;
  limit?: number;
};

/**
 * Full-text search over posts (EPIC-C §4).
 *
 * Stays in Postgres deliberately — §4 rules out third-party managed search on principle
 * rather than cost, because it would mean shipping case discussions to an external
 * service. The pieces here are that section's design made concrete.
 *
 * **Tags are half the recall, not a filter bolted on the side.** Members search "knee",
 * and the corpus says the word "knee" in four posts while ten are *tagged* somewhere under
 * the knee. Folding tag and category names into the match is what closes that gap, and it
 * is the reason the tag vocabulary earns its keep beyond browsing.
 */
@Injectable()
export class SearchService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly badge: BadgeService,
  ) {}

  async search(query: SearchQuery): Promise<SearchResults> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const offset = Number.parseInt(query.cursor ?? '0', 10) || 0;
    const term = (query.q ?? '').trim();
    // Any one of the three controls is a search. Only *none* of them is not: an empty
    // search would be "the whole corpus, newest first", which is the Discussions list.
    if (!term && !hasFilters(query)) return { posts: [], nextCursor: null, didYouMean: false };

    // Browse mode — filters with no words to rank against. There is no relevance to
    // compute and nothing to spell wrong, so it is one pass ordered by recency, and the
    // trigram fallback below would have nothing to compare.
    if (!term) {
      const browsed = await this.run(term, query, limit, offset, false);
      return this.toResults(browsed.rows, limit, offset, false);
    }

    const exact = await this.run(term, query, limit, offset, false);
    if (exact.rows.length > 0 || offset > 0) {
      return this.toResults(exact.rows, limit, offset, false);
    }

    // Nothing matched as lexemes. Before reporting no results, try trigram similarity —
    // "achiles" is a miss under full-text search and an obvious near-match under trigrams.
    const fuzzy = await this.run(term, query, limit, offset, true);
    return this.toResults(fuzzy.rows, limit, offset, fuzzy.rows.length > 0);
  }

  /**
   * One query, two modes.
   *
   * Ranking is §4's: text relevance leads (`ts_rank_cd`), recency breaks ties, and kudos
   * is a light nudge among equally-relevant results — it never drives rank, or search
   * becomes a popularity contest and a good answer to an unpopular question disappears.
   *
   * A tag or category hit contributes a flat bonus rather than a weighted lexeme. The
   * alternative — concatenating tag names into the ranked vector at query time — would
   * defeat the GIN index on `posts.tsv`, turning every search into a sequential scan for
   * a relevance difference nobody could perceive.
   */
  private async run(
    term: string,
    query: SearchQuery,
    limit: number,
    offset: number,
    fuzzy: boolean,
  ) {
    const tagFilters = (query.tags ?? []).filter(Boolean);

    /*
     * **The candidate set, and why it is a materialised CTE.**
     *
     * The first cut wrote this as `(indexable disjunction) AND (expensive re-check)` and
     * assumed the planner would use the GIN index for the first and filter with the
     * second. Measured at 50,000 posts, it did no such thing: a sequential scan over every
     * row with a correlated subquery run 50,065 times, 287ms of database time. `AS
     * MATERIALIZED` is what forces the cheap, indexable half to run first and produce a
     * small set for everything after it.
     *
     * The category name is deliberately **not** matched here. It cost a second full scan
     * of `posts` and duplicated the category dropdown sitting next to the search box.
     */
    /*
     * **Browse mode has to narrow the candidate set too.** With no term there is no
     * indexable text predicate to open with, and the tag filters below are correlated
     * `exists` subqueries — a planner given nothing else will scan every published post
     * and run them per row, which is the exact shape that measured at 287ms before the
     * materialised CTE was introduced. So the most selective filter leads: a tag subtree
     * via `post_tags_tag_idx`, otherwise the category via `posts_category_idx`. The outer
     * WHERE still applies every filter, so this only ever has to be a superset.
     */
    const browse =
      tagFilters.length > 0
        ? sql`
          with recursive subtree as (
            select id from community.tags where id = ${tagFilters[0]}
            union all
            select c.id from community.tags c join subtree s on c.parent_id = s.id
          )
          select pt.post_id as id from community.post_tags pt
           where pt.tag_id in (select id from subtree)`
        : sql`
          select p.id from community.posts p
           where p.status = 'published' and p.category_id = ${query.category}`;

    const candidates = !term
      ? browse
      : fuzzy
      ? sql`
          select p.id from community.posts p
           where p.status = 'published' and p.title % ${term}
          union
          select pt.post_id from community.post_tags pt
            join community.tags t on t.id = pt.tag_id
           where ${TAG_TEXT} % ${term}`
      : sql`
          select p.id from community.posts p
           where p.status = 'published'
             and p.tsv @@ websearch_to_tsquery('english', ${term})
          union
          select pt.post_id from community.post_tags pt
            join community.tags t on t.id = pt.tag_id
           where to_tsvector('english', ${TAG_TEXT}) @@ websearch_to_tsquery('english', ${term})`;

    /*
     * The re-check that makes negation behave — applied **only when the query negates**.
     *
     * Without it `knee -runner` returned every post tagged "Knee Joint" whose body said
     * "runner", because the tag branch matched a name containing "knee" and not "runner".
     * With it applied to every query it cost 258ms against 42ms, because it rebuilds a
     * tsvector per candidate. Since it can only ever *change* the answer when the query
     * excludes something, it now runs only then: `websearch_to_tsquery` turns a `-term`
     * into `!`, and that is exactly the shape this is for.
     */
    const negated = /(^|\s)-\S/.test(term);
    const negationGuard =
      negated && !fuzzy
        ? [
            sql`(
              p.tsv
              || setweight(to_tsvector('english', coalesce((
                   select string_agg(${TAG_TEXT}, ' ')
                   from community.post_tags pt
                   join community.tags t on t.id = pt.tag_id
                   where pt.post_id = p.id
                 ), '')), 'C')
            ) @@ websearch_to_tsquery('english', ${term})`,
          ]
        : [];

    // Newest first when there is no text to rank by — the only honest order for "show me
    // everything tagged X". Kudos deliberately does not lead here either, for the same
    // reason it only nudges above: it would turn a filter into a popularity chart.
    const ordering = !term
      ? sql`p.created_at desc, p.id desc`
      : fuzzy
      ? sql`similarity(p.title, ${term}) desc, p.created_at desc, h.kudos_total desc, p.id desc`
      : sql`(
          ts_rank_cd(p.tsv, websearch_to_tsquery('english', ${term}))
          + case when exists (
              select 1 from community.post_tags pt
              join community.tags t on t.id = pt.tag_id
              where pt.post_id = p.id
                and to_tsvector('english', ${TAG_TEXT}) @@ websearch_to_tsquery('english', ${term})
            ) then 0.15 else 0 end
        )`;

    // Each tag filter matches the tag *and its whole subtree*. Picking "Lower Limb" must
    // find a post tagged "Achilles tendinopathy" — the composer's picker drops an ancestor
    // when a descendant is chosen precisely because it assumes this happens here.
    const tagPredicates = tagFilters.map(
      (tagId) => sql`exists (
        with recursive subtree as (
          select id from community.tags where id = ${tagId}
          union all
          select c.id from community.tags c join subtree s on c.parent_id = s.id
        )
        select 1 from community.post_tags pt
        where pt.post_id = p.id and pt.tag_id in (select id from subtree)
      )`,
    );

    const conditions = [
      sql`p.status = 'published'`,
      // A suspended or expelled member's content leaves the community surfaces (EPIC-F).
      sql`h.status = 'active'`,
      query.category ? sql`p.category_id = ${query.category}` : sql`true`,
      ...negationGuard,
      ...tagPredicates,
    ];
    const where = conditions.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} and ${c}`));

    return this.db.execute<{
      id: string;
      type: 'question' | 'case_discussion';
      title: string;
      snippet: string;
      category_id: string;
      category_name: string;
      category_colour: string | null;
      handle_id: string;
      handle_name: string;
      kudos_total: number;
      answer_count: number;
      kudos_count: number;
      created_at: Date;
      edited_at: Date | null;
    }>(sql`
      with candidates as materialized (${candidates})
      select p.id, p.type, p.title,
             coalesce(cd.community_question, p.body) as snippet,
             cat.id as category_id, cat.name as category_name, cat.colour as category_colour,
             h.id as handle_id, h.handle_name, h.kudos_total,
             (select count(*) from community.comments c
               where c.post_id = p.id and c.status = 'published')::int as answer_count,
             (select count(*) from community.kudos k
               where k.target_type = 'post' and k.target_id = p.id)::int as kudos_count,
             p.created_at, p.edited_at
      from candidates cd_ids
      join community.posts p on p.id = cd_ids.id
      join community.handles h on h.id = p.handle_id
      join community.categories cat on cat.id = p.category_id
      left join community.case_details cd on cd.post_id = p.id
      where ${where}
      order by ${ordering}
      limit ${limit + 1} offset ${offset}
    `);
  }

  /**
   * Offset paging here, not the keyset cursor the lists use.
   *
   * A keyset cursor needs a stable, indexed sort key; this sort is a computed relevance
   * score, which is neither. Offset is the honest choice for a result set a member pages a
   * screen or two into, and search results shifting under an edit matters far less than on
   * a chronological list — the ordering was never a timeline to begin with.
   */
  private async toResults(
    rows: Awaited<ReturnType<SearchService['run']>>['rows'],
    limit: number,
    offset: number,
    didYouMean: boolean,
  ): Promise<SearchResults> {
    const page = rows.slice(0, limit);
    const badged = await this.badge.qualifying(page.map((r) => r.handle_id));
    const tagsByPost = await this.tagsFor(page.map((r) => r.id));

    return {
      posts: page.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        snippet: snippet(row.snippet),
        category: { id: row.category_id, name: row.category_name, colour: row.category_colour },
        tags: tagsByPost.get(row.id) ?? [],
        author: {
          handleId: row.handle_id,
          handleName: row.handle_name,
          kudosTotal: Number(row.kudos_total),
          isTopContributor: badged.has(row.handle_id),
        },
        answerCount: Number(row.answer_count),
        kudosCount: Number(row.kudos_count),
        createdAt: new Date(row.created_at).toISOString(),
        editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : null,
      })),
      nextCursor: rows.length > limit ? String(offset + limit) : null,
      didYouMean,
    };
  }

  private async tagsFor(postIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
    const grouped = new Map<string, { id: string; name: string }[]>();
    if (postIds.length === 0) return grouped;
    const { rows } = await this.db.execute<{ post_id: string; id: string; name: string }>(sql`
      select pt.post_id, t.id, t.name
      from community.post_tags pt
      join community.tags t on t.id = pt.tag_id
      where pt.post_id in (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})
      order by t.sort_order, t.name
    `);
    for (const row of rows) {
      const list = grouped.get(row.post_id) ?? [];
      list.push({ id: row.id, name: row.name });
      grouped.set(row.post_id, list);
    }
    return grouped;
  }
}

/** A category or at least one tag — either makes a search that needs no words. */
function hasFilters(query: SearchQuery): boolean {
  return Boolean(query.category) || (query.tags ?? []).filter(Boolean).length > 0;
}

/** Enough of the text to judge a result by, not enough to replace opening it. */
function snippet(body: string, max = 200): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}
