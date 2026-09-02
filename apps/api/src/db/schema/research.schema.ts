import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tags, tsvector } from './community.schema';

/**
 * The `research` schema (EPIC-I) — the external literature corpus.
 *
 * Its own schema, not part of `community`, because none of it is member-authored: these
 * are third-party articles ingested on a schedule, with no handle attached to any row and
 * nothing here that a member can write. The one member-shaped table in this epic —
 * `member_interests` — deliberately stays in `community`, since a clinical-interest
 * profile is handle-scoped data under the same access rules as everything else there
 * (architecture spec §8).
 */
export const research = pgSchema('research');

/**
 * The evidence ladder (EPIC-I / the design conversation): systematic review beats
 * randomised trial beats cohort beats case report. Normalised from each source's own
 * publication-type vocabulary at ingestion, because Europe PMC and OpenAlex describe the
 * same concept with different words and the feed must rank them on one scale.
 *
 * `other` is not a failure — most of the corpus is an ordinary journal article, and
 * saying so plainly is better than guessing at a tier it does not claim.
 */
export const articleEvidenceType = research.enum('evidence_type', [
  'systematic_review',
  'randomised_trial',
  'cohort_study',
  'case_report',
  'other',
]);

/**
 * One de-duplicated article. Written only by the ingestion worker.
 *
 * Deduplication is by DOI first, then PMID, then normalised title+year (EPIC-I §5) — the
 * partial unique indexes below are what make that real at the database level rather than
 * only in application logic, so two concurrent runs cannot both insert the same paper.
 */
export const articles = research.table(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Bare, lowercased — never a `https://doi.org/…` URL. Normalised at the adapter. */
    doi: text('doi'),
    pmid: text('pmid'),
    /** Any other source-specific ids, keyed by source name. */
    otherIds: jsonb('other_ids').notNull().default({}),
    title: text('title').notNull(),
    abstract: text('abstract'),
    /**
     * The abstract split into its structured sections (`[{heading, body}]`), parsed once at
     * ingestion. Sources return JATS-flavoured markup, and this is what lets the app render
     * "Purpose / Methods / Results" with its own components instead of either printing the
     * tags or injecting third-party HTML. `abstract` keeps the flattened plain text, which
     * is what the classifier and the card snippet use.
     */
    abstractSections: jsonb('abstract_sections').notNull().default([]),
    journal: text('journal'),
    publishedDate: timestamp('published_date', { withTimezone: true }),
    /** Kept alongside the date because some sources give only a year. */
    publishedYear: integer('published_year'),
    evidenceType: articleEvidenceType('evidence_type').notNull().default('other'),
    openAccess: boolean('open_access').notNull().default(false),
    /**
     * Where a member goes to read it. Neither source returns a URL as its identifier, so
     * this is derived at ingestion (DOI resolver, else PubMed, else the source's own
     * landing page) — screen B2's only outbound link.
     */
    url: text('url'),
    /** Which sources contributed to this row, and what they each said. */
    sourceRefs: jsonb('source_refs').notNull().default([]),
    /**
     * The theme-independent half of the ranking: evidence weight plus an open-access
     * bonus. **Recency is deliberately not baked in** — it is a function of time, so a
     * stored recency score silently rots between recomputes. The feed query applies decay
     * against `published_date` instead (EPIC-I design §7).
     */
    intrinsicScore: real('intrinsic_score').notNull().default(0),
    /**
     * Placeholder for Retraction Watch (via Crossref), which is a carried-forward EPIC-I
     * item. The column exists now so that flagging a retraction later is an update rather
     * than a migration — and so nothing has to pretend the corpus is clean meanwhile.
     */
    retractedAt: timestamp('retracted_at', { withTimezone: true }),
    /**
     * Full-text search over the corpus (S16), weighted the same way posts are: a title hit
     * outranks a passing mention in a long abstract. `abstract` rather than
     * `abstract_sections`, because the flattened plain text is what the classifier and the
     * card snippet already use, and the structured version would index its own headings.
     *
     * The feed had no full-text index at all before this: `articles_rank_idx` orders by
     * date and score, so a member could browse the corpus and be matched into it by their
     * interests, but never search it.
     *
     * Column names are bare rather than Drizzle references, as in `posts.tsv` — a
     * generated expression cannot refer to the table object it is being defined on.
     */
    tsv: tsvector('tsv').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(abstract, '')), 'B')`,
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Partial, because most rows have a DOI and some have neither identifier — a plain
    // unique index would collapse every id-less article into one row.
    uniqueIndex('articles_doi_key').on(t.doi).where(sql`${t.doi} is not null`),
    uniqueIndex('articles_pmid_key').on(t.pmid).where(sql`${t.pmid} is not null`),
    // The feed's ordering: newest-and-best first, before any member weighting.
    index('articles_rank_idx').on(t.publishedDate.desc(), t.intrinsicScore.desc()),
    index('articles_tsv_idx').using('gin', t.tsv),
  ],
);

/**
 * Which tags an article was classified into, and how confidently.
 *
 * **This table is what makes the feed a join rather than a computation.** Topic match
 * depends on the *member's* interests, so it cannot be precomputed onto the article — but
 * the expensive half (running the text classifier over the whole taxonomy) can be, and is,
 * exactly once per article. The feed then enters from a member's interests, lands on
 * `tag_id`, and sums weights.
 *
 * `confidence` and `matchedIn` are stored rather than a bare join row so that raising the
 * quality bar later is a query change instead of a re-ingest — a title match is much
 * stronger evidence than one mention in a long abstract.
 */
export const articleTags = research.table(
  'article_tags',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    confidence: real('confidence').notNull().default(0),
    /** `title` | `abstract` | `both` — where the match was found. */
    matchedIn: text('matched_in').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.tagId] }),
    // The feed enters from the member's interests, so tag_id leads.
    index('article_tags_tag_idx').on(t.tagId),
  ],
);

/**
 * Per-source incremental fetch state. One row per adapter.
 *
 * The cursor advances **only after a batch is committed** — advancing first means a failed
 * run silently drops a window of literature that nothing downstream would ever notice was
 * missing.
 */
export const ingestionCursors = research.table('ingestion_cursors', {
  sourceName: text('source_name').primaryKey(),
  lastCursor: text('last_cursor'),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  /** Set when the last run failed; cleared on success. Surfaced by the admin read. */
  lastError: text('last_error'),
  articlesSeen: integer('articles_seen').notNull().default(0),
  articlesStored: integer('articles_stored').notNull().default(0),
});
