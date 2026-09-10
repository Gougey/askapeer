-- `Nerve` is not a nerve condition of anywhere in particular.
--
-- Reported by a member: after setting his interests to Elbow and Lateral epicondylopathy, his
-- feed filled with basivertebral nerve ablation, suprascapular nerve blocks and femoral nerve
-- blocks for ACL surgery. The interest filter was working correctly — the taxonomy was not.
--
-- `Nerve` exists in **six** places, and every copy matches the same 39 articles:
--
--   Cervical Spine > Nerve Conditions          39
--   Thoracic Spine > Nerve                     39
--   Lumbar Spine > Nerve                       39
--   Upper Limb > Elbow > Nerve                 39
--   Upper Limb > Wrist > Nerve                 39
--   Lower Limb > Lower Leg > Nerve             39
--
-- So every nerve paper in the corpus is filed under all six regions at once, and choosing any
-- one of them inherits the lot. Of the 77 articles that member's two interests matched, 39
-- came from `Nerve` alone — half his feed was nerve papers about other parts of the body.
--
-- This is the same defect 0032 fixed for twelve other generic names. `Nerve` escaped that pass
-- because the measure used there — articles filed into a region on *no other* tag — reads low
-- for it: a nerve paper usually carries a specific tag too, so `Nerve` rarely looked like the
-- sole reason. It was still the reason the wrong feed was being built. The lesson is that
-- "sole reason" finds mis-filing and misses over-matching, which needs the plainer test of a
-- generic name sitting under a specific parent.
--
-- All six are renamed rather than retired: every region word appears in real titles — lumbar
-- 112, elbow 32, cervical 23, lower leg 13, thoracic 12, wrist 4 — so a renamed tag still
-- fires, for its own region only.
--
-- Two synonym sets ride along, because the same report exposed them. `Lateral epicondylopathy
-- (tennis elbow)` matched **zero** articles: the tag says "epicondylopathy" and the literature
-- says epicondylitis, tennis elbow, or lateral elbow tendinopathy — 23, 10 and 9 articles
-- respectively, none of which the tag could see. A member had chosen it as an interest and it
-- was returning him nothing. The medial equivalent gets the same treatment for the same reason.
--
-- Run a reclassify after deploying.

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('af0e82e0-7500-586f-b887-d7658205e619'::uuid, 'Nerve Conditions'),
    ('80afc005-e5ee-5e87-8199-86063f8db0a6'::uuid, 'Nerve'),
    ('60c9a967-5e3a-59bc-a19a-f53ae27ead5b'::uuid, 'Nerve'),
    ('a081ab92-6537-5448-9b77-cafd58559ceb'::uuid, 'Nerve'),
    ('4cfd5597-a0b3-5309-a156-6295d43c98d4'::uuid, 'Nerve'),
    ('d95b18c9-eaa5-5ad9-8c6a-fce2816da27d'::uuid, 'Nerve'),
    ('6b67815a-0b51-5974-b222-cc3b715f08a7'::uuid, 'Lateral epicondylopathy (tennis elbow)'),
    ('ec5dcad2-0d44-52a2-ad4d-e684f1745d3e'::uuid, 'Medial epicondylopathy (golfer''s elbow)')
  ) AS expected(id, name)
  WHERE NOT EXISTS (SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name);
  IF wrong > 0 THEN
    RAISE EXCEPTION 'taxonomy has moved since 0034 was written: % of 8 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- 1. Six generic `Nerve` nodes, each given the region it actually belongs to.
-- Nerve Conditions  ->  Cervical nerve conditions   (Cervical Spine (Neck))
UPDATE "community"."tags" SET "name" = 'Cervical nerve conditions' WHERE "id" = 'af0e82e0-7500-586f-b887-d7658205e619';--> statement-breakpoint
-- Nerve  ->  Thoracic nerve conditions   (Thoracic Spine)
UPDATE "community"."tags" SET "name" = 'Thoracic nerve conditions' WHERE "id" = '80afc005-e5ee-5e87-8199-86063f8db0a6';--> statement-breakpoint
-- Nerve  ->  Lumbar nerve conditions   (Lumbar Spine)
UPDATE "community"."tags" SET "name" = 'Lumbar nerve conditions' WHERE "id" = '60c9a967-5e3a-59bc-a19a-f53ae27ead5b';--> statement-breakpoint
-- Nerve  ->  Elbow nerve conditions   (Upper Limb)
UPDATE "community"."tags" SET "name" = 'Elbow nerve conditions' WHERE "id" = 'a081ab92-6537-5448-9b77-cafd58559ceb';--> statement-breakpoint
-- Nerve  ->  Wrist nerve conditions   (Upper Limb)
UPDATE "community"."tags" SET "name" = 'Wrist nerve conditions' WHERE "id" = '4cfd5597-a0b3-5309-a156-6295d43c98d4';--> statement-breakpoint
-- Nerve  ->  Lower leg nerve conditions   (Lower Limb)
UPDATE "community"."tags" SET "name" = 'Lower leg nerve conditions' WHERE "id" = 'd95b18c9-eaa5-5ad9-8c6a-fce2816da27d';--> statement-breakpoint

-- 2. The words the literature actually uses for the two epicondylopathies.
-- Lateral epicondylopathy (tennis elbow)
UPDATE "community"."tags" SET "synonyms" = ARRAY['lateral epicondylitis', 'lateral elbow tendinopathy', 'tennis elbow', 'common extensor tendinopathy'] WHERE "id" = '6b67815a-0b51-5974-b222-cc3b715f08a7';--> statement-breakpoint
-- Medial epicondylopathy (golfer's elbow)
UPDATE "community"."tags" SET "synonyms" = ARRAY['medial epicondylitis', 'medial elbow tendinopathy', 'golfer''s elbow', 'common flexor tendinopathy'] WHERE "id" = 'ec5dcad2-0d44-52a2-ad4d-e684f1745d3e';--> statement-breakpoint
