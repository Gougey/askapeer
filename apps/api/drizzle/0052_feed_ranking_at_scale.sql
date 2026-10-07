-- Ranking the Research feed got slow when the corpus got big (measured 2026-10-07).
--
-- The 25-year backfill took the corpus from 6,498 articles to 144,538, and two things in the
-- ranking that were free at the old size stopped being free. Measured on live:
--
--   Newest, no keyword ................     0.4 ms
--   Newest + keyword + period .........   562 ms
--   Relevance + keyword ...............  5,760 ms   <- what members were feeling
--   Recommended + keyword ............. 10,240 ms
--   Recommended, no keyword ........... 52,081 ms
--
-- **1. `tag_count`.** The default ordering carries a small bonus for being placeable in the
-- taxonomy at all, written as `(select count(*) from article_tags where article_id = a.id)`.
-- That is a correlated subquery: the plan showed `loops=144587`, one index search per article
-- in the table, every time the feed is ordered. Removing that term alone takes the 52-second
-- case to 9.4 seconds. It is stored here instead, maintained where tags are written and
-- recomputed by every reclassify — which is also the repair if an admin tag merge ever leaves
-- it adrift. A ranking bonus that is briefly off by one is a far smaller problem than a
-- subquery per row.
--
-- **2. `tsv_title`.** Relevance sorting calls `ts_rank_cd` on `tsv`, which indexes title *and*
-- abstract and averages 1,705 bytes — 235 MB across the corpus, and past the threshold where
-- Postgres stores a value out of line, so every rank detoasts and decompresses it. A
-- title-only vector is about a tenth of that and stays inline.
--
-- ⚠️ It is for **ranking only**. Matching stays on the full `tsv`, so recall is unchanged —
-- which matters, because title-only *matching* would keep as little as 9% of results for a
-- phrase like "return to play". Ranking on the title is also what Andrew actually asked for:
-- the papers whose titles are about the thing come first, and the rest fall back to newest.

ALTER TABLE "research"."articles"
  ADD COLUMN IF NOT EXISTS "tag_count" integer NOT NULL DEFAULT 0;--> statement-breakpoint

UPDATE "research"."articles" a
   SET "tag_count" = c.n
  FROM (SELECT article_id, count(*)::int AS n FROM "research"."article_tags" GROUP BY article_id) c
 WHERE c.article_id = a.id AND a."tag_count" <> c.n;--> statement-breakpoint

ALTER TABLE "research"."articles"
  ADD COLUMN IF NOT EXISTS "tsv_title" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", ''))) STORED;
