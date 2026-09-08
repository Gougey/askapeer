-- Give generic condition names the region they belong to (Andrew's decision, 2026-09-08).
--
-- A tag matches on its **name**, and the classifier tests every tag independently — nothing
-- combines "supraspinatus" with "tendinopathy" to mean one thing. So a tag called
-- `Tendinopathy` matches every tendinopathy paper in the corpus, and because that tag sits
-- under Upper Limb > Forearm, an Achilles paper lands in the upper limb.
--
-- Measured before the change: 154 of the 175 articles on the cervical `Ligament Injuries` tag
-- had no other cervical tag at all — the tag was the only reason they were filed there.
-- `Tendon Disorders` under the same parent: 105 of 175.
--
-- **The papers that belong are not lost.** A supraspinatus paper carries `Supraspinatus` and
-- `Rotator Cuff` in their own right, independently of any tendon tag. Of the 65 articles that
-- leave Upper Limb once `Tendinopathy` stops matching, exactly **one** names an upper-limb
-- structure in its title; the rest are patellar, hamstring and Achilles.
--
-- Which operation applies depends on whether the region's own word appears in the literature:
--
--   RENAME where it does — "knee" is in 204 titles, "shoulder" 160, "lumbar" 110,
--   "cervical" 23. A renamed tag still fires, just only for its own region.
--
--   RETIRE where it does not — "forearm" appears in **zero** titles across 3,853 papers, so
--   `Forearm tendinopathy` would be a tag that never matches anything. Andrew's own closing
--   instinct, and the measurement agrees with him.
--
-- Deliberately untouched, because the name is already specific and the papers are correctly
-- filed: `Rotator Cuff`, `Achilles tendinopathy`, `Hamstring strain`, `Patellofemoral pain
-- syndrome`, `Knee`. They score high on the same measure for the right reason — a paper about
-- one thing carries one tag.
--
-- Left for Andrew as clinical judgement rather than naming: `Hamstrings` under Pelvis (the
-- origin is pelvic, the muscle is not) and `Hip-related` under Lumbar Spine.
--
-- Retiring, not deleting: `listTags` stops descending at a retired node so it leaves the
-- picker, the classifier skips it, and anything already tagged with it is untouched.
--
-- Run a reclassify after deploying, or the stored corpus keeps the tags it already has.


-- Every id must still carry the name this migration expects. A taxonomy edited in the admin
-- screen since this was written fails here rather than renaming the wrong tag.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('e0d3e8bf-b1fd-5694-90a2-6bff704ef546'::uuid, 'Ligament Injuries'),
    ('10f3df07-5f4a-5ca2-a16a-fa51a9fbfd48'::uuid, 'Osteoarthritis'),
    ('c0a13a0d-6139-56c4-9b02-4638d5a54d8d'::uuid, 'Tendon Disorders'),
    ('44ac88e1-7d27-5ab8-93fb-38708df74f40'::uuid, 'Disc Disorders'),
    ('548c76ea-9b74-5211-b370-5cafeda02c63'::uuid, 'Bone Conditions'),
    ('67984d50-6650-5279-831e-84d06977d7fb'::uuid, 'Bone'),
    ('4308fba7-eb11-5c14-9492-6adb42093ef8'::uuid, 'Disc'),
    ('8c544783-6ffb-5aa0-b7eb-4d947d76cb59'::uuid, 'Bone'),
    ('c6dcfe79-d688-564d-b1c5-0f4309315906'::uuid, 'Disc Disorders'),
    ('1a5bb1d9-91c6-56ba-b36a-87773097ce06'::uuid, 'Posterior'),
    ('a0766b13-5f89-5831-b76b-aa97a17bb252'::uuid, 'Tendons'),
    ('56b0cacd-27f3-5882-b339-791509496cc2'::uuid, 'Tendons'),
    ('de1e7166-54b6-5cfa-9fb3-646781fc71f6'::uuid, 'Tendinopathy'),
    ('ca7d328c-8ee6-578f-a80a-750086c052f1'::uuid, 'Muscle strain')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0032 was written: % of 14 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- 12 renames. The tag keeps its id, so every article, post and interest on it
-- comes along; only what it will match in future changes.
-- Ligament Injuries  ->  Cervical ligament injuries
UPDATE "community"."tags" SET "name" = 'Cervical ligament injuries' WHERE "id" = 'e0d3e8bf-b1fd-5694-90a2-6bff704ef546';--> statement-breakpoint
-- Osteoarthritis  ->  Cervical osteoarthritis
UPDATE "community"."tags" SET "name" = 'Cervical osteoarthritis' WHERE "id" = '10f3df07-5f4a-5ca2-a16a-fa51a9fbfd48';--> statement-breakpoint
-- Tendon Disorders  ->  Cervical tendon disorders
UPDATE "community"."tags" SET "name" = 'Cervical tendon disorders' WHERE "id" = 'c0a13a0d-6139-56c4-9b02-4638d5a54d8d';--> statement-breakpoint
-- Disc Disorders  ->  Cervical disc disorders
UPDATE "community"."tags" SET "name" = 'Cervical disc disorders' WHERE "id" = '44ac88e1-7d27-5ab8-93fb-38708df74f40';--> statement-breakpoint
-- Bone Conditions  ->  Cervical bone conditions
UPDATE "community"."tags" SET "name" = 'Cervical bone conditions' WHERE "id" = '548c76ea-9b74-5211-b370-5cafeda02c63';--> statement-breakpoint
-- Bone  ->  Thoracic bone conditions
UPDATE "community"."tags" SET "name" = 'Thoracic bone conditions' WHERE "id" = '67984d50-6650-5279-831e-84d06977d7fb';--> statement-breakpoint
-- Disc  ->  Thoracic disc disorders
UPDATE "community"."tags" SET "name" = 'Thoracic disc disorders' WHERE "id" = '4308fba7-eb11-5c14-9492-6adb42093ef8';--> statement-breakpoint
-- Bone  ->  Lumbar bone conditions
UPDATE "community"."tags" SET "name" = 'Lumbar bone conditions' WHERE "id" = '8c544783-6ffb-5aa0-b7eb-4d947d76cb59';--> statement-breakpoint
-- Disc Disorders  ->  Lumbar disc disorders
UPDATE "community"."tags" SET "name" = 'Lumbar disc disorders' WHERE "id" = 'c6dcfe79-d688-564d-b1c5-0f4309315906';--> statement-breakpoint
-- Posterior  ->  Posterior lumbar muscles
UPDATE "community"."tags" SET "name" = 'Posterior lumbar muscles' WHERE "id" = '1a5bb1d9-91c6-56ba-b36a-87773097ce06';--> statement-breakpoint
-- Tendons  ->  Knee tendons
UPDATE "community"."tags" SET "name" = 'Knee tendons' WHERE "id" = 'a0766b13-5f89-5831-b76b-aa97a17bb252';--> statement-breakpoint
-- Tendons  ->  Shoulder tendons
UPDATE "community"."tags" SET "name" = 'Shoulder tendons' WHERE "id" = '56b0cacd-27f3-5882-b339-791509496cc2';--> statement-breakpoint

-- 2 retirements, both under Forearm, where the region word never appears.
-- Tendinopathy  (Forearm)
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'de1e7166-54b6-5cfa-9fb3-646781fc71f6';--> statement-breakpoint
-- Muscle strain  (Forearm)
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'ca7d328c-8ee6-578f-a80a-750086c052f1';--> statement-breakpoint
