import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  applyCorrections,
  chooseCorrection,
  correctableWords,
  MIN_CORRECTABLE_LENGTH,
  singleEdits,
  type Candidate,
  type Correction,
} from './spelling';

/** Which search is asking — "known" and "worth suggesting" both depend on what it searches. */
export type SpellingCorpus = 'forum' | 'research';

/** How many near words the database hands over for `chooseCorrection` to judge. */
const CANDIDATES_PER_WORD = 10;
/**
 * Lower than pg_trgm's 0.3 default on purpose: trigrams are only the shortlist here, and a
 * four-letter swap like "ankel" scores 0.33 against "ankle". Edit distance does the judging.
 */
const SHORTLIST_SIMILARITY = 0.2;

/**
 * Spelling correction for the forum and research searches — see `spelling.ts` for the rules
 * and the dictionary migration (0054) for what the words are drawn from and why.
 *
 * Only ever called when a search has come back empty, so none of this is on the path of a
 * search that worked.
 */
@Injectable()
export class SpellingService {
  private readonly log = new Logger(SpellingService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The query with its unknown words corrected or dropped, or null if there is nothing to do. */
  async correct(query: string, corpus: SpellingCorpus): Promise<Correction | null> {
    const words = correctableWords(query);
    if (words.length === 0) return null;

    const list = sql.join(words.map((w) => sql`${w}`), sql`, `);
    /*
     * **Known means in the dictionary, by stem** — see migration 0054 for why it is not "appears
     * anywhere in the corpus" (every typo does, somewhere in 144,000 abstracts). A stopword has
     * no stem and is known by definition: the search ignores it anyway. The forum also trusts
     * any word its own posts or tags contain, since that word demonstrably finds something.
     */
    const forumKnown =
      corpus === 'forum' ? sql`or ${this.inForum(sql`plainto_tsquery('english', w.word)`)}` : sql``;
    const { rows: known } = await this.db.execute<{ word: string; known: boolean }>(sql`
      select w.word,
             (cardinality(ts_lexize('english_stem', w.word)) = 0
              or exists (select 1 from research.spelling_dictionary d
                          where d.lexeme = (ts_lexize('english_stem', w.word))[1])
              ${forumKnown}) as known
        from unnest(array[${list}]::text[]) as w(word)
    `);
    const unknown = new Set(known.filter((r) => !r.known).map((r) => r.word));
    if (unknown.size === 0) return null;

    const corrections = new Map<string, string | null>();
    for (const word of unknown) {
      corrections.set(
        word,
        word.length < MIN_CORRECTABLE_LENGTH
          ? null
          : chooseCorrection(word, await this.candidates(word, corpus)),
      );
    }
    return applyCorrections(query, unknown, corrections);
  }

  /**
   * Rebuild the dictionary from the corpus as it now stands. Called after each ingest run.
   *
   * Concurrently, so a search in the middle of it reads the previous copy rather than waiting.
   * Never throws: a stale dictionary still corrects almost everything, and an ingest that
   * succeeded must not be reported as failed because this did not.
   */
  async refresh(): Promise<void> {
    try {
      await this.db.execute(sql`refresh materialized view concurrently research.spelling_dictionary`);
    } catch (err) {
      this.log.error(`spelling dictionary refresh failed: ${(err as Error).message}`);
    }
  }

  /**
   * The shortlist for one word: dictionary words that are near it, and — for the forum — that
   * a discussion actually contains. Suggesting a word no post uses would trade one empty page
   * for another, and with a correction notice on top.
   */
  private async candidates(word: string, corpus: SpellingCorpus): Promise<Candidate[]> {
    // Applied to the shortlist, never to the dictionary: it is a correlated check per word,
    // and run before the limit it would be one per near-ish word in the whole dictionary.
    const usable =
      corpus === 'forum'
        ? sql`where ${this.inForum(sql`plainto_tsquery('english', s.word)`)}`
        : sql``;
    // `%` rather than `similarity() >=` so the trigram index is used; the threshold it reads is
    // set for this transaction only, so no other query on the pooled connection inherits it.
    const { rows } = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('pg_trgm.similarity_threshold', ${String(SHORTLIST_SIMILARITY)}, true)`,
      );
      // Two sources, unioned: every one-edit word, looked up exactly (see `singleEdits` — the
      // trigram half alone lost "return" for "retrun" on live), and the trigram shortlist for
      // anything further away.
      return tx.execute<{ word: string; ndoc: number }>(sql`
        select s.word, s.ndoc from (
          select d.word, d.ndoc
            from research.spelling_dictionary d
           where d.word = any(array[${sql.join(singleEdits(word).map((w) => sql`${w}`), sql`, `)}]::text[])
          union
          (select d.word, d.ndoc
            from research.spelling_dictionary d
           where d.word % ${word}
             and abs(length(d.word) - length(${word})) <= 3
           order by similarity(d.word, ${word}) desc, d.ndoc desc
           limit ${CANDIDATES_PER_WORD})
        ) s
        ${usable}
      `);
    });
    return rows.map((r) => ({ word: r.word, ndoc: Number(r.ndoc) }));
  }

  /** Would the forum search find `tsq` in a post or a tag? Same predicates as the search. */
  private inForum(tsq: SQL): SQL {
    return sql`(
          exists (
            select 1 from community.posts p
              join community.handles h on h.id = p.handle_id
             where p.status = 'published' and h.status = 'active' and p.tsv @@ ${tsq}
          )
          or exists (
            select 1 from community.tags t
             where to_tsvector('english', t.name || ' ' || array_to_string(t.synonyms, ' ')) @@ ${tsq}
          )
        )`;
  }
}
