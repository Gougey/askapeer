-- Standing feed criteria, saved per member (Andrew's review item 6).
--
-- The Research feed gains a filter panel — keyword, tags, evidence type, period and sort —
-- and Adrian settled that a member can **keep** what they have set up rather than re-entering
-- it every visit. Tags already have a home in `community.member_interests`; the rest had
-- nowhere to live, which is what this table is for.
--
-- **One row per handle, not named sets.** "My feed settings", not "my knee filter" and "my
-- shoulder filter" — saved searches are a different feature and would want naming, listing
-- and deleting. One row is what "make this my default" means, and nothing here forecloses
-- the other.
--
-- ⚠️ **The tags are deliberately *not* stored here.** In the panel, chosen tags *override* a
-- member's clinical interests for that view; saving writes them to `member_interests`, which
-- is the one place interests live. Keeping a second copy here would mean two sources of truth
-- for the same question, and the screen that edits interests would silently disagree with the
-- feed. The web app warns before that overwrite, because rewriting a list the member curated
-- is not something to do quietly.
--
-- **The period is relative, never a pair of dates.** Andrew asked for "year from/to"; an
-- absolute range is wrong the moment it is saved — "2021–2026" stored today means something
-- different next year, and a *standing* setting is exactly where that bites. So it is a number
-- of years back from now, resolved at query time.
--
-- ⚠️ The period cannot discriminate yet: measured 2026-09-30, all 6,054 articles carry
-- `published_year = 2026`, because the ingest began in August and only fetches forward. The
-- control is real and the data is not, until there is a backfill.

CREATE TABLE IF NOT EXISTS "community"."feed_preferences" (
  "handle_id" uuid PRIMARY KEY NOT NULL
    REFERENCES "community"."handles"("id") ON DELETE CASCADE,
  -- Null means "any", which is the absence of a filter rather than a value.
  "evidence" text,
  -- Years back from now; null means no period filter. 1–5, enforced here as well as in the
  -- DTO so a hand-rolled request cannot store something the UI can never show again.
  "period_years" integer,
  -- 'for_you' (the composite ranking), 'newest', or 'relevance'. Relevance is only meaningful
  -- with a keyword, and the API falls back when there is none.
  "sort" text DEFAULT 'for_you' NOT NULL,
  -- The standing keyword, if the member wants one. Usually null.
  "query" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feed_preferences_period_range"
    CHECK ("period_years" IS NULL OR ("period_years" >= 1 AND "period_years" <= 5)),
  CONSTRAINT "feed_preferences_sort_known"
    CHECK ("sort" IN ('for_you', 'newest', 'relevance'))
);
