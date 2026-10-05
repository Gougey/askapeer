-- My Research answers the filter panel, and nothing else (Adrian, after testing, 2026-10-05).
--
-- The screen was built around a member's stored clinical interests: the feed ranked on them,
-- the panel carried a tag row that overrode them for a view, and saving the panel wrote the
-- tags back as the member's interests. Testing changed that thinking. **Interests now play no
-- part in what My Research displays** — the page starts empty with the panel open, and shows
-- exactly what the keyword, type of paper, period and sort ask for.
--
-- ⚠️ The taxonomy itself is untouched and still earns its keep. Articles are classified
-- against it on ingest, which is what puts the chips on a card, what search narrows by, and
-- what the "placeable at all" bonus in the default ordering rewards. What has gone is the
-- *member-relative* half: nobody's profile shapes this screen any more.
--
-- Two consequences here:
--
-- 1. `sort` gains 'recommended' and loses 'for_you'. The default ordering is evidence weight
--    plus recency decay plus the taxonomy bonus — a judgement about the paper, identical for
--    every member. "For you" named the interest-match term that no longer exists, so keeping
--    the word would promise a personalisation that is not happening.
-- 2. Nothing stores tags here and nothing ever did (they lived in `member_interests`), so
--    this table needs no other change; `community.member_interests` is left exactly as it is,
--    because the interests screen still owns it and this migration is not the place to decide
--    that screen's future.

UPDATE "community"."feed_preferences" SET "sort" = 'recommended' WHERE "sort" = 'for_you';--> statement-breakpoint

ALTER TABLE "community"."feed_preferences"
  DROP CONSTRAINT IF EXISTS "feed_preferences_sort_known";--> statement-breakpoint

ALTER TABLE "community"."feed_preferences"
  ALTER COLUMN "sort" SET DEFAULT 'recommended';--> statement-breakpoint

ALTER TABLE "community"."feed_preferences"
  ADD CONSTRAINT "feed_preferences_sort_known"
  CHECK ("sort" IN ('recommended', 'newest', 'relevance'));
