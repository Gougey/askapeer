-- The period filter can reach back further, now that the corpus does (Adrian, 2026-10-06).
--
-- 0046 capped this at five years because that was generous: the whole corpus was four months
-- old, and every article in it carried the same year. The 25-year backfill has changed the
-- fact on the ground — the feed now runs from 2020 and is still deepening — so a control that
-- stops at five years is the one thing standing between a member and the literature they asked
-- Andrew for.
--
-- Fifteen rather than twenty-five: the options offered are 1, 5, 10 and 15 years, and the
-- constraint exists to stop a hand-rolled request storing something the UI can never show
-- again. It is a backstop for the DTO, not a statement about how far the corpus reaches.
ALTER TABLE "community"."feed_preferences"
  DROP CONSTRAINT IF EXISTS "feed_preferences_period_range";--> statement-breakpoint

ALTER TABLE "community"."feed_preferences"
  ADD CONSTRAINT "feed_preferences_period_range"
  CHECK ("period_years" IS NULL OR ("period_years" >= 1 AND "period_years" <= 15));
