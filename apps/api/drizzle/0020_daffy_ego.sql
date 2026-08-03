ALTER TABLE "community"."categories" ADD COLUMN "colour" text;--> statement-breakpoint
-- Colour the seeded categories (style guide §2.1, "Cool spectrum"). The value is a
-- design-token key, never a hex: --color-category-* is defined per theme, so storing a
-- colour here would freeze every category to its light-mode value on a dark ground.
--
-- Matched on name for the same reason, and with the same caveat, as post_type in 0018:
-- at this point in history the name is the only handle we have on these rows. Done once,
-- in a migration pinned to the seeded vocabulary, rather than in application code that
-- would keep re-deriving it after an administrator renames a category (EPIC-J).
--
-- Anything not listed keeps colour = NULL and renders in --color-accent, exactly as every
-- category did before this migration.
UPDATE "community"."categories" SET "colour" = CASE lower("name")
	WHEN 'clinical case' THEN 'teal'
	WHEN 'research'      THEN 'blue'
	WHEN 'career'        THEN 'violet'
	WHEN 'equipment'     THEN 'magenta'
	WHEN 'general'       THEN 'slate'
END
WHERE lower("name") IN ('clinical case', 'research', 'career', 'equipment', 'general');
