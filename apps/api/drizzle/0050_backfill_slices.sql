-- Historical backfill, tracked one slice at a time (Andrew wants 25 years, 2026-10-05).
--
-- The twice-daily ingest cannot do this. Both adapters fetch **one page of 100 results per
-- query** and move a cursor forward, which is right for "what is new since yesterday" and
-- useless for history: widening the date window would return the newest 100 papers of 25
-- years, nineteen times over. A backfill needs deep pagination, and deep pagination needs
-- somewhere to remember how far it got.
--
-- ⚠️ **A slice is the unit of work, and the unit of restart.** One source × one query × one
-- year, with the page cursor committed as each page lands. A slice that dies halfway resumes
-- from its cursor rather than starting the year again, and a slice that fails is one year of
-- one query rather than the whole run. This is the same lesson as the reclassify outage: work
-- measured in hours must be interruptible, or the first interruption costs all of it.
--
-- The upsert it feeds is already idempotent — the incremental ingest re-presents a fortnight
-- of articles on every run — so replaying a slice is safe and costs only time.

CREATE TABLE IF NOT EXISTS "research"."backfill_slices" (
  "source_name" text NOT NULL,
  "query" text NOT NULL,
  -- Inclusive both ends; a year at a time, which keeps a slice to minutes rather than hours.
  "window_start" date NOT NULL,
  "window_end" date NOT NULL,
  -- 'pending' | 'running' | 'done' | 'failed'. A failed slice is retried by hand, because a
  -- slice that fails twice is usually telling you something about the source, not the network.
  "status" text NOT NULL DEFAULT 'pending',
  -- The source's own opaque paging token (Europe PMC `nextCursorMark`, OpenAlex
  -- `meta.next_cursor`). Null before the first page and after the last.
  "page_cursor" text,
  "pages_done" integer NOT NULL DEFAULT 0,
  "articles_seen" integer NOT NULL DEFAULT 0,
  "articles_stored" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "backfill_slices_pkey" PRIMARY KEY ("source_name", "query", "window_start"),
  CONSTRAINT "backfill_slices_status_known"
    CHECK ("status" IN ('pending', 'running', 'done', 'failed'))
);--> statement-breakpoint

-- The worker's only question: "what should I do next?" Ordered newest-first, so a run that is
-- stopped early has still collected the years a member is most likely to want.
CREATE INDEX IF NOT EXISTS "backfill_slices_next_idx"
  ON "research"."backfill_slices" ("status", "window_start" DESC);
