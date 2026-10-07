import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import type { EvidenceType } from './scoring';

const DEFAULT_PAGE_SIZE = 20;
/** How long the corpus's oldest year is trusted for. It moves a year at a time, at most. */
const COVERAGE_TTL_MS = 10 * 60 * 1000;
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

/**
 * **No `mode` any more.** It said how the page had been ranked — `personalised`, `general`,
 * `fallback` — back when the feed was built around a member's stored clinical interests.
 * After testing, Adrian took those out of this screen entirely: My Research answers the
 * criteria in the filter panel and nothing else, so every page is ranked the same way and
 * there is no longer anything for the screen to explain or apologise for.
 */
export type FeedPage = {
  articles: FeedArticle[];
  nextCursor: string | null;
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
/**
 * What the Research filter panel can ask for.
 *
 * ⚠️ **Clinical tags are deliberately absent.** The panel used to carry a tag row that
 * overrode the member's stored interests; after testing, Adrian removed interests from this
 * screen altogether. The corpus is still classified against the taxonomy — that is what puts
 * the chips on a card and what search narrows by — but *what My Research shows* is decided
 * here and only here.
 */
export type FeedFilters = {
  query?: string;
  evidence?: EvidenceType;
  /** Years back from now. Relative, never a pair of dates — a stored absolute range rots. */
  periodYears?: number;
  /** Defaults to `newest` — the baseline a cleared panel returns to. */
  sort?: 'recommended' | 'newest' | 'relevance';
};

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

  /**
   * The corpus, narrowed by whatever the filter panel asked for.
   *
   * **One path, and no personalisation.** There used to be three — a personalised ranking, a
   * general one, and a fallback between them — all turning on the member's stored interests.
   * They are gone: every caller gets the same query, and an empty filter set means the whole
   * corpus rather than somebody's profile.
   */
  async list(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
    filters: FeedFilters = {},
  ): Promise<FeedPage> {
    const offset = Number.parseInt(cursor ?? '0', 10) || 0;
    return this.rank(offset, limit, filters);
  }

  private async rank(
    offset: number,
    limit: number,
    filters: FeedFilters = {},
  ): Promise<FeedPage> {
    /*
     * The narrowing clauses. Each is absent unless asked for, so an unfiltered feed runs
     * exactly the query it ran before any of this existed.
     */
    const query = filters.query?.trim() ?? '';
    const keyword =
      query === '' ? sql`` : sql`and a.tsv @@ websearch_to_tsquery('english', ${query})`;
    const evidence = filters.evidence ? sql`and a.evidence_type = ${filters.evidence}` : sql``;
    /*
     * A *relative* period, resolved here rather than stored as dates — which is the whole
     * reason it is a number of years (see the `feed_preferences` migration).
     *
     * ⚠️ It cannot discriminate yet: every article in the corpus is from 2026, because the
     * ingest began in August and only fetches forward. The clause is right and the data is
     * not, until there is a backfill.
     */
    const period = filters.periodYears
      ? sql`and a.published_date >= now() - (${filters.periodYears} * interval '1 year')`
      : sql``;

    /*
     * **The default ordering — "Recommended".** Evidence weight, a gentle recency decay, and
     * a small bonus for being placeable in the clinical taxonomy at all.
     *
     * It used to carry a fourth term, the weighted match against the member's stored
     * interests, and was called "For you" because of it. That term is gone with the interests
     * themselves; what is left is a judgement about the *paper*, identical for every member,
     * so the label says "Recommended" and no longer implies a personalisation that is not
     * happening.
     */
    const composite = sql`(
         a.intrinsic_score
         + 1.0 / (1.0 + (extract(epoch from (now() - coalesce(a.published_date, a.created_at)))
                         / 86400.0) / 180.0)
         /*
          * Without this the first page was entirely *untagged* systematic reviews — top-ranked
          * on evidence and recency alone, with nothing on the card to show they had anything
          * to do with sports medicine ("Pure Cognitive Training on Gait and Balance in Older
          * Adults" led the feed). That the classifier could place an article is real evidence
          * it belongs here, and capped low so it nudges rather than decides.
          *
          * ⚠️ **Reads a stored count, and must keep doing so.** Written as a correlated
          * count over article_tags it was one index search per article *in the table* every
          * time the feed was ordered — loops=144587 in the plan, and 52 seconds for a single
          * page once the backfill had grown the corpus. (No backticks in here: this comment
          * lives inside a template literal, and one of them ends the query.)
          */
         + least(0.45, 0.15 * a.tag_count)
       )`;

    /*
     * **Relevance without a keyword is not an ordering**, it is a tie across the whole
     * corpus — `ts_rank` of an empty query is zero for every row. The panel only offers it
     * when a keyword is present; this is the matching guard for a hand-rolled request, and
     * for the member who saved `relevance` with a keyword and later cleared the keyword.
     */
    /*
     * Relevance ranks words, so without a keyword it is not an ordering at all — `ts_rank` of
     * an empty query is zero for every row, and the request falls back.
     *
     * And the mirror of that: **a keyword with no sort asked for means relevance**, matching
     * what the panel does when you type one. A title match ranks well above a passing mention
     * in an abstract, which is the whole answer to "the keyword was buried somewhere
     * irrelevant" — the ordering, not the matching, was what made those look equal.
     */
    const sort =
      filters.sort === 'relevance' && query === ''
        ? 'newest'
        : (filters.sort ?? (query === '' ? 'newest' : 'relevance'));
    const ordering =
      sort === 'newest'
        ? sql`a.published_date desc nulls last, a.intrinsic_score desc`
        : sort === 'relevance'
          ? /*
             * ⚠️ **Ranks `tsv_title`, matches on `tsv`.** Ranking the full vector meant
             * detoasting 1,705 bytes per matching row — 5.8 seconds for a keyword with 19,468
             * matches. The title vector is a tenth of the size and stays inline.
             *
             * Recall is untouched, because the *match* above still uses the full vector. And
             * the ordering this produces is the one Andrew asked for: papers whose titles are
             * about the thing first, everything else falling back to newest.
             */
            sql`ts_rank_cd(a.tsv_title, websearch_to_tsquery('english', ${query})) desc,
                a.published_date desc nulls last`
          : sql`${composite} desc, a.published_date desc nulls last`;

    const { rows } = await this.db.execute<FeedRow>(sql`
      ${this.tagRegion}
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
         ${keyword}
         ${evidence}
         ${period}
       order by ${ordering}, a.id desc
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

  /**
   * How far back the corpus actually reaches.
   *
   * ⚠️ **Computed, never written down.** Andrew asked for the period control to say that older
   * articles will not be found, and suggested a fixed "2000 onwards". A fixed year would have
   * been wrong on the day — the corpus starts at 2001 — and wrong again every January. This
   * reads it from the data, so the label cannot drift from the truth.
   *
   * Cached briefly because it moves slowly: during a backfill it creeps a year at a time, and
   * once the backfill is done it is static. `min(published_date)` on an indexed column is
   * cheap, but it is on the path of every Research page render, so it should not be a query.
   */
  private coverageCache?: { oldestYear: number | null; at: number };

  async coverage(): Promise<{ oldestYear: number | null }> {
    const fresh = this.coverageCache && Date.now() - this.coverageCache.at < COVERAGE_TTL_MS;
    if (fresh) return { oldestYear: this.coverageCache!.oldestYear };
    const { rows } = await this.db.execute<{ year: number | null }>(sql`
      select extract(year from min(a.published_date))::int as year
        from research.articles a
       where a.retracted_at is null
    `);
    const oldestYear = rows[0]?.year ?? null;
    this.coverageCache = { oldestYear, at: Date.now() };
    return { oldestYear };
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
