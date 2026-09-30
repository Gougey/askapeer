-- The nine joint-group ids were invented by hand. Four of them are not valid UUIDs.
--
-- Every other id in this taxonomy is `uuid5(uuid5(DNS, 'taxonomy.askapeer.com'), '<path>')`,
-- so a term lands on the same id in every environment and a regenerated tree is a no-op
-- rather than a pile of duplicates. 0045 broke that: it wrote the nine `navigational` group
-- ids as a hand-typed ascending pattern — `4a1e5f70-…`, `5b2f6081-…`, `6c307192-…` — which
-- is derivable from nothing.
--
-- ⚠️ **Four of them are not RFC 4122 at all.** The variant nibble (the first character of the
-- fourth group) must be 8, 9, a or b; the hand-typed sequence ran on through c, d, e, f and 0.
-- Postgres does not care — its `uuid` type accepts any 32 hex digits — but `class-validator`
-- does, and every tag id crossing the API is checked with `@IsUUID`. So selecting *Hand
-- joints* (`…-d375-…`) anywhere that sends a tag id produced a 400. It took the Research feed
-- down the day the filter panel shipped, and the same tag would have broken forum search and
-- interest-saving the moment anyone picked it.
--
-- This puts all nine back on the scheme — not only the four that are malformed. The other
-- five are equally underivable, and the hazard is the same one: regenerating the tree from
-- `docs/tools/vocabulary/taxonomy.py` would mint a *different* id for the same path and insert
-- a second copy of the tag beside the first.
--
-- Nothing points at these but their own children (26 of them): they are `navigational`, so the
-- classifier never tags an article with one, and no member had yet saved one as an interest.
-- Checked on live before writing this — 0 article_tags, 0 post_tags, 0 member_interests — and
-- the repointing below is written to hold anyway, because a member may select one between now
-- and this running.

-- Every id being replaced must still carry the name we think it does.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11'::uuid, 'Shoulder girdle'),
    ('5b2f6081-7c3e-5d9f-a042-3e8b7d5c9f22'::uuid, 'Shoulder joints'),
    ('6c307192-8d4f-5e10-b153-4f9c8e6d0a33'::uuid, 'Elbow joints'),
    ('7d4182a3-9e50-5f21-c264-509d9f7e1b44'::uuid, 'Forearm and wrist joints'),
    ('8e5293b4-af61-5032-d375-61aea0802c55'::uuid, 'Hand joints'),
    ('9f63a4c5-b072-5143-e486-72bfb1913d66'::uuid, 'Hip joints'),
    ('a074b5d6-c183-5254-f597-83c0c2a24e77'::uuid, 'Knee joints'),
    ('b185c6e7-d294-5365-06a8-94d1d3b35f88'::uuid, 'Ankle joints'),
    ('c296d7f8-e3a5-5476-17b9-a5e2e4c46099'::uuid, 'Foot joints')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION '0047: % joint group(s) are not where 0045 left them; not re-keying', wrong;
  END IF;
END $$;--> statement-breakpoint

/*
 * Re-keyed one at a time, and **through a temporary name**.
 *
 * A tag name is unique among its siblings, so the replacement cannot be inserted under its
 * real name while the row it replaces is still there. It arrives as `<name> (re-keying)`,
 * takes over the children and any references, and is renamed once the old row is gone.
 */
DO $$
DECLARE
  pair record;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11'::uuid, '85471094-7ad8-5fdd-bdec-7b8cf0f405d0'::uuid),
    ('5b2f6081-7c3e-5d9f-a042-3e8b7d5c9f22'::uuid, 'b9b03b41-f4c4-5aa2-a287-19a6fac2a94f'::uuid),
    ('6c307192-8d4f-5e10-b153-4f9c8e6d0a33'::uuid, 'fe249bad-7c9b-531b-b520-db84c23bf5aa'::uuid),
    ('7d4182a3-9e50-5f21-c264-509d9f7e1b44'::uuid, '7a5dc518-42ca-50e4-ab07-6444f3840e22'::uuid),
    ('8e5293b4-af61-5032-d375-61aea0802c55'::uuid, 'f77b8e1a-65a8-5ef2-bb35-7470b6ef0ee6'::uuid),
    ('9f63a4c5-b072-5143-e486-72bfb1913d66'::uuid, 'bdaa4a9e-2a0c-590f-9722-6b138044d160'::uuid),
    ('a074b5d6-c183-5254-f597-83c0c2a24e77'::uuid, '21a4ec9f-ee4b-5c66-bfb6-f9c17a95a6c6'::uuid),
    ('b185c6e7-d294-5365-06a8-94d1d3b35f88'::uuid, '9f9fc4e0-d32a-57e4-a3e4-3458c9fd15a4'::uuid),
    ('c296d7f8-e3a5-5476-17b9-a5e2e4c46099'::uuid, '5d9d821b-2f54-51fa-aba0-69514f4a1cb8'::uuid)
  ) AS v(old_id, new_id)
  LOOP
    INSERT INTO "community"."tags"
      (id, name, facet, parent_id, synonyms, mesh_id, sort_order, retired_at, scope_terms,
       navigational)
    SELECT pair.new_id, t.name || ' (re-keying)', t.facet, t.parent_id, t.synonyms, t.mesh_id,
           t.sort_order, t.retired_at, t.scope_terms, t.navigational
      FROM "community"."tags" t WHERE t.id = pair.old_id;

    UPDATE "community"."tags" SET parent_id = pair.new_id WHERE parent_id = pair.old_id;
    -- Zero rows on live today. Written anyway: a member may select one of these between this
    -- being written and it running, and a re-key that drops an interest is a silent defect.
    UPDATE "community"."member_interests" SET tag_id = pair.new_id WHERE tag_id = pair.old_id;
    UPDATE "community"."post_tags" SET tag_id = pair.new_id WHERE tag_id = pair.old_id;
    UPDATE "research"."article_tags" SET tag_id = pair.new_id WHERE tag_id = pair.old_id;

    DELETE FROM "community"."tags" WHERE id = pair.old_id;

    UPDATE "community"."tags"
       SET name = left(name, length(name) - length(' (re-keying)'))
     WHERE id = pair.new_id;
  END LOOP;
END $$;--> statement-breakpoint

-- Nothing in the taxonomy may be left that the API would refuse.
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM "community"."tags"
   WHERE substring(id::text, 20, 1) NOT IN ('8', '9', 'a', 'b');
  IF bad > 0 THEN
    RAISE EXCEPTION '0047: % tag id(s) are still not valid UUIDs', bad;
  END IF;
END $$;
