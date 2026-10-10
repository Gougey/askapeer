-- The spelling dictionary both searches correct against (Andrew, 2026-10-10: "ankle ligament
-- testing return ti sport" found nothing; with the typo fixed it "worked brilliantly").
--
-- **Made from the literature and the taxonomy, and from nothing a member wrote.** A correction
-- is shown on screen, so every word in here is one we are prepared to display to anyone who
-- mistypes something near it. Post bodies would put a misspelt patient detail, or a word from
-- a removed post, one typo away from every member — exactly the disclosure this platform exists
-- to prevent. Paper titles are published literature and tag names are our own vocabulary, so
-- neither can leak anything. The forum search still checks a suggestion against the posts
-- before using it (`SpellingService`), so a word only ever becomes a correction there if it
-- would find a discussion.
--
-- **Titles, not abstracts.** Measured locally on 16,453 articles: abstracts gave 26,000 words in
-- 2.9 s, titles 7,800 in 0.2 s — and every clinical term spot-checked was in both. Live holds
-- about nine times as many articles on a 512 MB database that has been OOM-killed before, so the
-- abstracts' cost is real and their extra words are mostly the long tail nobody misspells.
--
-- **The dictionary is also what "known" means**, compared by stem (`lexeme`), so
-- "tendinopathies" and "impingment" (which the English stemmer already folds into
-- "impingement") are left alone. It is deliberately *not* "appears anywhere in the corpus":
-- across 144,000 abstracts almost every typo does — Andrew's stray "ti" is in seven of them, as
-- titanium — and a word that counts as known is never corrected. This only ever runs once a
-- search has already come back empty, so a rare real word that is treated as unknown loses
-- nothing that was there, and the screen names what was changed.
--
-- `ndoc >= 2` keeps a typo that made it into one title from becoming a correction target. Tag
-- words are exempt: the taxonomy is curated, and a tag nobody has written a paper title about
-- yet is still the right correction for a member searching for it.
--
-- Refreshed after each ingest run (`SpellingService.refresh`), not on every write — a word new
-- this morning not being a *correction* until this evening costs nothing, because it is still
-- found when spelt right.
CREATE MATERIALIZED VIEW "research"."spelling_dictionary" AS
WITH words AS (
  SELECT word, ndoc
    FROM ts_stat($$SELECT to_tsvector('simple', title) FROM research.articles WHERE retracted_at IS NULL$$)
   WHERE ndoc >= 2
  UNION ALL
  SELECT word, 0
    FROM ts_stat($$SELECT to_tsvector('simple', name || ' ' || array_to_string(synonyms, ' ')) FROM community.tags WHERE retired_at IS NULL$$)
)
SELECT word, (ts_lexize('english_stem', word))[1] AS lexeme, max(ndoc)::int AS ndoc
  FROM words
 -- Plain words of three letters or more, and not stopwords: "to" is no one's intended "ti".
 WHERE length(word) >= 3
   AND word ~ '^[a-z]+$'
   AND cardinality(ts_lexize('english_stem', word)) > 0
 GROUP BY word;--> statement-breakpoint
-- Unique so it can be refreshed CONCURRENTLY — searches keep reading the old copy meanwhile.
CREATE UNIQUE INDEX "spelling_dictionary_word_idx" ON "research"."spelling_dictionary" ("word");--> statement-breakpoint
CREATE INDEX "spelling_dictionary_lexeme_idx" ON "research"."spelling_dictionary" ("lexeme");--> statement-breakpoint
CREATE INDEX "spelling_dictionary_word_trgm_idx" ON "research"."spelling_dictionary" USING gin ("word" gin_trgm_ops);
