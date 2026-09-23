-- The body-part level inside each Joints axis (Andrew, 2026-09-23).
--
-- 0044 put every joint flat under `<Region> joints`, so the Lower Limb opened onto fifteen
-- joints at once when what Adrian expected — and what Andrew's list actually describes — was
-- **Hip, Knee, Ankle, Foot**, and the joints underneath whichever you picked.
--
-- They were flattened because a tag called "Knee" collides with the *conditions* group of the
-- same name in the same region, and a single-word tag matched in a title would then file every
-- knee paper twice. That reason was real. It is also not a reason to give up the level, because
-- Andrew has since said what these groups are *for*: **"some users may not want to be specific
-- — 'Ankle joints' may be the level they are interested in."**
--
-- That settles it. A group here is a **selectable interest**, not scaffolding — and an interest
-- expands to its subtree when the feed is ranked, so choosing *Ankle joints* already matches
-- every article tagged talocrural, distal tibiofibular or their ligaments. The group node
-- itself never needs to match an article for following it to work.
--
-- Hence `navigational`: a tag that members browse and choose, and the **classifier skips**.
-- The recursion still descends *through* it, so its children classify normally — only the node
-- itself is withheld from matching. That removes the collision entirely rather than dodging it
-- with a name, which in turn lets these be called what you would say out loud.
--
-- The column is deliberately narrow: it says "do not match articles on this", not "hide this".
-- Search, the picker and interest selection are untouched, which is the whole point — Andrew
-- wants to *follow* these.

ALTER TABLE "community"."tags"
  ADD COLUMN IF NOT EXISTS "navigational" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Every joint being re-parented must still be where 0044 put it.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('Upper Limb joints'), ('Lower Limb joints')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.name = expected.name AND t.retired_at IS NULL
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'the joints axes from 0044 are not present; 0045 cannot place groups under them';
  END IF;
END $$;--> statement-breakpoint

INSERT INTO "community"."tags" ("id", "name", "facet", "parent_id", "sort_order", "navigational") VALUES
  ('4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11', 'Shoulder girdle', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Upper Limb joints' AND retired_at IS NULL), 1, true),
  ('5b2f6081-7c3e-5d9f-a042-3e8b7d5c9f22', 'Shoulder joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Upper Limb joints' AND retired_at IS NULL), 2, true),
  ('6c307192-8d4f-5e10-b153-4f9c8e6d0a33', 'Elbow joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Upper Limb joints' AND retired_at IS NULL), 3, true),
  ('7d4182a3-9e50-5f21-c264-509d9f7e1b44', 'Forearm and wrist joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Upper Limb joints' AND retired_at IS NULL), 4, true),
  ('8e5293b4-af61-5032-d375-61aea0802c55', 'Hand joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Upper Limb joints' AND retired_at IS NULL), 5, true),
  ('9f63a4c5-b072-5143-e486-72bfb1913d66', 'Hip joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Lower Limb joints' AND retired_at IS NULL), 1, true),
  ('a074b5d6-c183-5254-f597-83c0c2a24e77', 'Knee joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Lower Limb joints' AND retired_at IS NULL), 2, true),
  ('b185c6e7-d294-5365-06a8-94d1d3b35f88', 'Ankle joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Lower Limb joints' AND retired_at IS NULL), 3, true),
  ('c296d7f8-e3a5-5476-17b9-a5e2e4c46099', 'Foot joints', 'structure',
   (SELECT id FROM "community"."tags" WHERE name = 'Lower Limb joints' AND retired_at IS NULL), 4, true)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- The joints move down one level, into the group Andrew put them in. Matched by name within
-- their own axis, so nothing outside the Joints branch can be caught by this.
UPDATE "community"."tags" t SET "parent_id" = v.group_id
  FROM (VALUES
    ('Sternoclavicular joint', '4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11'::uuid),
    ('Acromioclavicular joint', '4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11'),
    ('Scapulothoracic articulation', '4a1e5f70-6b2d-5c8e-9f31-2d7a6c4b8e11'),
    ('Glenohumeral joint', '5b2f6081-7c3e-5d9f-a042-3e8b7d5c9f22'),
    ('Glenoid labrum & capsulolabral complexes', '5b2f6081-7c3e-5d9f-a042-3e8b7d5c9f22'),
    ('Elbow joint', '6c307192-8d4f-5e10-b153-4f9c8e6d0a33'),
    ('Humeroulnar joint', '6c307192-8d4f-5e10-b153-4f9c8e6d0a33'),
    ('Humeroradial joint', '6c307192-8d4f-5e10-b153-4f9c8e6d0a33'),
    ('Proximal radioulnar joint', '6c307192-8d4f-5e10-b153-4f9c8e6d0a33'),
    ('Distal radioulnar joint & TFCC', '7d4182a3-9e50-5f21-c264-509d9f7e1b44'),
    ('Radiocarpal (wrist) joint', '7d4182a3-9e50-5f21-c264-509d9f7e1b44'),
    ('Midcarpal joint', '7d4182a3-9e50-5f21-c264-509d9f7e1b44'),
    ('Carpometacarpal joints', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Intermetacarpal joints', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Finger metacarpophalangeal joints', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Thumb — first carpometacarpal joint', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Thumb — metacarpophalangeal joint', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Thumb interphalangeal joint', '8e5293b4-af61-5032-d375-61aea0802c55'),
    ('Hip joint', '9f63a4c5-b072-5143-e486-72bfb1913d66'),
    ('Tibiofemoral joint', 'a074b5d6-c183-5254-f597-83c0c2a24e77'),
    ('Patellofemoral joint', 'a074b5d6-c183-5254-f597-83c0c2a24e77'),
    ('Superior tibiofibular joint', 'a074b5d6-c183-5254-f597-83c0c2a24e77'),
    ('Talocrural (ankle) joint', 'b185c6e7-d294-5365-06a8-94d1d3b35f88'),
    ('Distal tibiofibular joint', 'b185c6e7-d294-5365-06a8-94d1d3b35f88'),
    ('Subtalar joint', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Talocalcaneonavicular joint', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Calcaneocuboid joint & bifurcate ligament', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Transverse tarsal (midtarsal) joint', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Tarsometatarsal (Lisfranc) joints', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Intermetatarsal joints', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'),
    ('Metatarsophalangeal joints', 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099')
  ) AS v(joint_name, group_id)
 WHERE t."name" = v.joint_name
   AND t."retired_at" IS NULL
   AND t."parent_id" IN (
     SELECT id FROM "community"."tags"
      WHERE name IN ('Upper Limb joints', 'Lower Limb joints') AND retired_at IS NULL
   );--> statement-breakpoint

-- The foot's interphalangeal joints share their names with the hand's, so they are moved by
-- id rather than by name — the only two where the name alone is ambiguous.
UPDATE "community"."tags" SET "parent_id" = 'c296d7f8-e3a5-5476-17b9-a5e2e4c46099'
 WHERE "id" IN (
   'aece6610-a2ae-5ca3-aeff-5df63e3cea34',  -- Proximal interphalangeal joints (foot)
   'db699560-5450-5ef8-8d02-378134c6f3b2'   -- Distal interphalangeal joints (foot)
 );--> statement-breakpoint

UPDATE "community"."tags" SET "parent_id" = '8e5293b4-af61-5032-d375-61aea0802c55'
 WHERE "id" IN (
   'ce45cae2-7838-5557-82cd-cf356c4d8d60',  -- Proximal interphalangeal joints (hand)
   '2629f26d-4be4-59dc-993b-a2b6ae5d7729'   -- Distal interphalangeal joints (hand)
 );--> statement-breakpoint
