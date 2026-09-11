-- Make a reclassify resumable.
--
-- On 2026-09-11 a reclassify of the 4,519-article corpus failed with "job stalled more than
-- allowable limit", having deleted every row of `research.article_tags` and rebuilt only a
-- quarter of them. Fly autostopped the machine running it — "App askapeer-api has excess
-- capacity, autostopping machine …" — BullMQ moved the job to the other machine, it stalled a
-- second time, and `maxStalledCount` failed it for good. The feed was left a quarter tagged
-- and only a successful full run could repair it.
--
-- Two things made a routine interruption that expensive. The run held no record of where it
-- had reached, so a retry could only start again from nothing; and it emptied the whole table
-- up front, so every interruption left the corpus worse than before it began rather than
-- merely out of date.
--
-- This table fixes the first. One row, holding the last article id committed. A run resumes
-- from it; a completed run clears it. The single-row shape is enforced rather than assumed —
-- a boolean primary key with a `check` that it is true admits exactly one row, so a second
-- concurrent writer collides on the primary key instead of quietly starting a rival cursor.

CREATE TABLE IF NOT EXISTS "research"."reclassify_state" (
  "id" boolean PRIMARY KEY DEFAULT true NOT NULL,
  -- The last article committed, in id order. Null means a run that has started but not yet
  -- committed its first batch.
  "cursor" uuid,
  "articles_done" integer DEFAULT 0 NOT NULL,
  "matches" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reclassify_state_single_row" CHECK ("id")
);
