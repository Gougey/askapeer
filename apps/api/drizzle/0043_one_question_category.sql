-- The composer stops asking for a category (Andrew, testing review item 8).
--
-- *"'+' — does it need a category? I just want to make it easy to ask questions, and when
-- I've gone to do that I feel it just adds a layer of confusion with the word 'general' being
-- used for what is likely to be the most used selection."*
--
-- He is right, and the categories had already been overtaken. Tags carry the clinical meaning
-- now — 1,230 of them, searchable and expandable by subtree — so a five-way choice between
-- Clinical Case, Research, Career, Equipment and General is asking a question the post's own
-- tags answer better. What is left after the clinical meaning moves out is the *kind* of post,
-- and the composer already knows that: a question or a case discussion.
--
-- So the vocabulary is reduced to exactly that pair. `Research`, `Career` and `Equipment`
-- retire, their posts move to `General`, and `General` gains `post_type = 'question'` so it
-- resolves the same way `Clinical Case` already does through `post_type = 'case_discussion'`.
-- The API then derives the category from the kind of post rather than being told.
--
-- **Retiring a category is not like retiring a tag.** `posts.category_id` is NOT NULL and has
-- no cascade, so a post left pointing at a retired category keeps rendering its name — the
-- category would disappear from every filter while still labelling old posts. Moving them
-- first is what makes the retirement honest.
--
-- Nothing is deleted. A retired category keeps its row, so an admin can revive one if the
-- community ever grows into needing them, and the API's "exactly one" rule (see
-- `questionCategoryId`) fails loudly rather than guessing if a second question category
-- appears.

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('Clinical Case'), ('Research'), ('Career'), ('Equipment'), ('General')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."categories" c WHERE c.name = expected.name AND c.retired_at IS NULL
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'the categories vocabulary has moved since 0043 was written: % of 5 are missing', wrong;
  END IF;
END $$;--> statement-breakpoint

-- 1. Posts first, so nothing is left pointing at a category about to be withdrawn.
UPDATE "community"."posts"
   SET "category_id" = (SELECT "id" FROM "community"."categories" WHERE "name" = 'General')
 WHERE "category_id" IN (
   SELECT "id" FROM "community"."categories" WHERE "name" IN ('Research', 'Career', 'Equipment')
 );--> statement-breakpoint

-- 2. General becomes the question category, the mirror of Clinical Case.
UPDATE "community"."categories" SET "post_type" = 'question' WHERE "name" = 'General';--> statement-breakpoint

-- 3. And the other three withdraw.
UPDATE "community"."categories" SET "retired_at" = now()
 WHERE "name" IN ('Research', 'Career', 'Equipment');--> statement-breakpoint
