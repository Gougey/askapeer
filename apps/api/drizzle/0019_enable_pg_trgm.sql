-- Typo tolerance for search (EPIC-C §4).
--
-- Full-text search matches lexemes, so "achiles" finds nothing at all even though
-- "achilles" is all over the corpus — a dead end rather than a slightly worse result.
-- pg_trgm scores string similarity instead, which is what turns that into a fallback and
-- a "did you mean".
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- Trigram index on the title only. The fallback runs when the tsquery matched nothing, and
-- against a title — a body-wide trigram index is large and would earn its keep only if we
-- fuzzy-matched whole posts, which would return near-anything for a short query.
CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx" ON "community"."posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
-- Tag names are the other thing members mistype, and the taxonomy is where the clinical
-- vocabulary lives — so a misspelled tag name can still route a query to the right subtree.
CREATE INDEX IF NOT EXISTS "tags_name_trgm_idx" ON "community"."tags" USING gin ("name" gin_trgm_ops);
