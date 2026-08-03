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
  tags: { id: string; name: string }[];
};

/** One block of a structured abstract — see `abstract.ts` for why these are parsed. */
export type AbstractSection = { heading: string | null; body: string };

export type ArticleDetail = FeedArticle & {
  abstract: string | null;
  abstractSections: AbstractSection[];
  doi: string | null;
};

export type FeedPage = { articles: FeedArticle[]; nextCursor: string | null };

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
  async list(cursor?: string, limit = DEFAULT_PAGE_SIZE): Promise<FeedPage> {
    const offset = Number.parseInt(cursor ?? '0', 10) || 0;

    const { rows } = await this.db.execute<FeedRow>(sql`
      select a.id, a.title, a.abstract, a.journal, a.published_date, a.evidence_type,
             a.open_access, a.url,
             (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name)
                                       order by m.confidence desc, m.name), '[]')
                from (
                  -- Distinct on *name*, not id. Taxonomy names are only sibling-scoped
                  -- unique, so "Nerve" and "Bone" exist under several branches at once and
                  -- a plain join renders "Nerve, Nerve, Nerve" on the card. The strongest
                  -- match for a given name is the one worth showing.
                  select distinct on (t.name) t.id, t.name, at.confidence
                    from research.article_tags at
                    join community.tags t on t.id = at.tag_id
                   where at.article_id = a.id
                   order by t.name, at.confidence desc
                ) m
             ) as tags
        from research.articles a
       where a.retracted_at is null
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
         + least(0.45, 0.15 * (select count(*) from research.article_tags at
                                where at.article_id = a.id))
       ) desc, a.published_date desc nulls last, a.id desc
       limit ${limit + 1} offset ${offset}
    `);

    const page = rows.slice(0, limit);
    return {
      articles: page.map(toArticle),
      nextCursor: rows.length > limit ? String(offset + limit) : null,
    };
  }

  /** Screen B2. The abstract is the point — see the design note on why we do not frame. */
  async detail(articleId: string): Promise<ArticleDetail> {
    const { rows } = await this.db.execute<
      FeedRow & { doi: string | null; abstract_sections: AbstractSection[] }
    >(sql`
      select a.id, a.title, a.abstract, a.abstract_sections, a.journal, a.published_date,
             a.evidence_type, a.open_access, a.url, a.doi,
             (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name)
                                       order by m.confidence desc, m.name), '[]')
                from (
                  -- Distinct on *name*, not id. Taxonomy names are only sibling-scoped
                  -- unique, so "Nerve" and "Bone" exist under several branches at once and
                  -- a plain join renders "Nerve, Nerve, Nerve" on the card. The strongest
                  -- match for a given name is the one worth showing.
                  select distinct on (t.name) t.id, t.name, at.confidence
                    from research.article_tags at
                    join community.tags t on t.id = at.tag_id
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
  tags: { id: string; name: string }[];
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
