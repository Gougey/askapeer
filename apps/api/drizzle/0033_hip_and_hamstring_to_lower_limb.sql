-- Hip and hamstring belong to the lower limb (Andrew, 2026-09-09).
--
-- He answered the two left open by 0032 — the hamstrings should sit in the lower limb, and so
-- should the hip, because anatomically it is a lower limb joint. Checking before moving
-- anything turned up something better than a misplacement: **these are duplicates, and the
-- lower limb already holds the correct copy.**
--
--   `Pelvis > Muscles > Hamstrings` holds Biceps femoris, Semimembranosus, Semitendinosus.
--   `Lower Limb > Thigh > Posterior` holds the same muscles, better named — the long and short
--   heads of biceps femoris are separated there and merged here.
--
--   `Lumbar Spine > MSK conditions > Hip-related` holds Hip flexor strain, Iliopsoas bursitis
--   and Iliopsoas tendinopathy. `Lower Limb > MSK conditions > Hip` holds **all three**, beside
--   fourteen more hip conditions.
--
-- The duplicates were not merely similar. Measured on the live corpus, the two copies matched
-- *the same papers*: hip osteoarthritis 14 and 14, the same 14; rectus femoris 20 and 20, the
-- same 20; gluteus medius 14 and 14, the same 14. Every one of those papers was being filed
-- under two regions at once. 42 names are duplicated across Pelvis and Lower Limb in total —
-- this migration clears the two Andrew named, and the rest waits on his answer about what the
-- Pelvis region is for once the hip leaves it.
--
-- So there is nothing to move. One rename puts the right name on the surviving copy, and the
-- duplicates retire.
--
-- `Posterior` is renamed rather than left alone because it was already on the generic-names
-- list from 0032 — a compartment called "Posterior" says nothing about what it holds. The
-- posterior thigh compartment *is* the hamstrings, so Andrew's answer and that cleanup are the
-- same edit.
--
-- Three tags are retired for a different reason: they are not clinical terms. Two are one of
-- Andrew's own instructions to us, wrapped across two lines in the source document and loaded
-- as two separate tags by migration 0030. The third carries Microsoft Word's "Top of
-- Form/Bottom of Form" artefact and duplicates a clean sibling of the same name. All three
-- carry no articles. They are ours to answer for, not his.
--
-- Retiring, not deleting: the classifier's walk stops at a retired node so the subtree stops
-- matching, the picker stops offering it, and anything already tagged keeps its tag.
--
-- Run a reclassify after deploying. The papers on the retired copies are picked up by the
-- surviving lower-limb tags, which carry the same names.

-- Every id must still carry the name this migration expects.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('1af903d3-de46-5ace-9ca9-66539c5a755f'::uuid, 'Posterior'),
    ('7166bd8c-4076-5099-9baf-69fce2f824a8'::uuid, 'Biceps femoris'),
    ('e7777f54-756f-5150-80ce-e00d6f6a2744'::uuid, 'Semimembranosus'),
    ('7d5b079d-8b9e-59ac-933c-98b77a80611c'::uuid, 'Semitendinosus'),
    ('c9ca4fbe-0153-5e42-8f90-bf7947001841'::uuid, 'Hamstrings'),
    ('230db451-ca25-5aa3-a401-50dd9a3831da'::uuid, 'Hip flexor strain'),
    ('e4b7a7e7-ed43-5df3-9a9c-924c19386ab9'::uuid, 'Iliopsoas bursitis'),
    ('4683a2c1-d603-5e9a-88a2-586a1d2a5ea6'::uuid, 'Iliopsoas tendinopathy'),
    ('72842018-0554-57b0-8798-da3a434b4e53'::uuid, 'Hip-related'),
    ('9d078a41-bbd1-5aaa-9ae7-20ddb71a85ed'::uuid, 'Post-operative cervical fusion rehabilitation Top of FormBottom of Form'),
    ('7dfbc90f-e0d7-5afc-a7cc-2dce3717e6c5'::uuid, 'Acetabulum- needs to be added as a keyword as it forms part of the hip joint- (the area of the'),
    ('d29ce70c-259e-59c1-92c3-4ac69aa170fc'::uuid, 'hip joint known as ‘the socket’- and formed by the ilium, ischium and pubis):')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0033 was written: % of 12 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- 1. The surviving copy gets the clinical name. Anterior / Medial / Hamstrings, which is
--    what the compartment holds rather than where it sits.
-- Posterior  ->  Hamstrings   (Lower Limb > Lower Limb muscles > Thigh > Posterior)
UPDATE "community"."tags" SET "name" = 'Hamstrings' WHERE "id" = '1af903d3-de46-5ace-9ca9-66539c5a755f';--> statement-breakpoint

-- 2. The duplicates, children first so no step hides a node the next one needs.
-- Biceps femoris
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '7166bd8c-4076-5099-9baf-69fce2f824a8';--> statement-breakpoint
-- Semimembranosus
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'e7777f54-756f-5150-80ce-e00d6f6a2744';--> statement-breakpoint
-- Semitendinosus
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '7d5b079d-8b9e-59ac-933c-98b77a80611c';--> statement-breakpoint
-- Hamstrings
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'c9ca4fbe-0153-5e42-8f90-bf7947001841';--> statement-breakpoint
-- Hip flexor strain
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '230db451-ca25-5aa3-a401-50dd9a3831da';--> statement-breakpoint
-- Iliopsoas bursitis
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'e4b7a7e7-ed43-5df3-9a9c-924c19386ab9';--> statement-breakpoint
-- Iliopsoas tendinopathy
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '4683a2c1-d603-5e9a-88a2-586a1d2a5ea6';--> statement-breakpoint
-- Hip-related
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '72842018-0554-57b0-8798-da3a434b4e53';--> statement-breakpoint
-- Post-operative cervical fusion rehabilitation Top of FormBottom of
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '9d078a41-bbd1-5aaa-9ae7-20ddb71a85ed';--> statement-breakpoint
-- Acetabulum- needs to be added as a keyword as it forms part of the
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '7dfbc90f-e0d7-5afc-a7cc-2dce3717e6c5';--> statement-breakpoint
-- hip joint known as ‘the socket’- and formed by the ilium, ischium 
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = 'd29ce70c-259e-59c1-92c3-4ac69aa170fc';--> statement-breakpoint
