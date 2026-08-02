ALTER TABLE "community"."categories" ADD COLUMN "post_type" "community"."post_type";--> statement-breakpoint
-- Mark the clinical-case category as the one a case discussion belongs to. Everything else
-- stays null, meaning "either kind of post".
--
-- Matched on name here because at this point in history the name is the only handle we
-- have on it — that is precisely the fragility this column exists to remove, so it is done
-- once, in a migration pinned to the seeded vocabulary, rather than in application code
-- that would keep re-deriving it after an administrator renames the category (EPIC-J).
--
-- Deliberately not a CHECK against posts.type: real questions already sit in this category
-- from before the rule existed, and a constraint would either fail here or force rewriting
-- members' posts to satisfy a composer rule.
UPDATE "community"."categories" SET "post_type" = 'case_discussion' WHERE lower("name") = 'clinical case';
