-- A muscle layer is not a muscle group: positional names get their compartment.
--
-- The systematic sweep for generic names finally caught the worst tag in the taxonomy.
-- `Anterior`, sitting under Thigh, matched **292 articles and dragged 259** of them into the
-- thigh with nothing else thigh-related about them — more than any other tag, and more than
-- `Nerve` in all six of its homes combined.
--
-- It was missed twice. Migration 0032 ranked candidates by mis-filing at the *region* level,
-- and 0034 corrected that to the *parent* level but then filtered to names appearing more than
-- once, on the reasoning that a repeated name is a generic one. That is true, and it is not
-- the only way to be generic: there is exactly one live `Anterior`, and it is as meaningless
-- on its own as the six `Nerve`s were. Repetition is sufficient evidence, never necessary.
--
-- Two of these have real clinical names waiting for them, which is the same move 0033 made
-- when `Posterior` under Thigh became `Hamstrings`. The anterior thigh compartment is the
-- quadriceps and the medial is the adductors, so the three compartments now read Quadriceps,
-- Adductors and Hamstrings rather than Anterior, Medial and Posterior. That also answers the
-- quadriceps grouping Andrew asked about in item 5 of the August status — there was no node
-- meaning "quadriceps", and now there is.
--
-- The rest take their compartment: a forearm flexor layer called `Deep` says nothing, and
-- `Deep forearm flexors` says all of it. Nothing is retired — every one of these is a real
-- anatomical grouping that was merely under-named.
--
-- Run a reclassify after deploying.

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('be09aa44-e2ae-5f3d-b1f2-9e817a6fb210'::uuid, 'Anterior'),
    ('8cd42004-6938-542f-8841-87385daca631'::uuid, 'Medial'),
    ('8a99e23e-863b-5ff1-84e5-d368538b5f3e'::uuid, 'Deep'),
    ('00ced5af-ed3d-5efe-a01c-cf2e2bf37422'::uuid, 'Superficial'),
    ('2c92bbec-219b-5d9b-839d-c3bbe374e403'::uuid, 'Intermediate'),
    ('6209c54a-cbe2-5818-994f-33f715bba123'::uuid, 'Deep'),
    ('c6478825-6e81-51a1-8421-faf729afe45b'::uuid, 'Superficial'),
    ('4314884c-6989-5871-ad1c-ebda9e51b3c2'::uuid, 'Deep'),
    ('d047beb5-0b32-58c7-ac52-5929bf55e520'::uuid, 'Superficial'),
    ('74043d47-9db2-5cf7-8089-75f3ffff396f'::uuid, 'Central'),
    ('c310f37a-0810-558f-b339-752a6e9c0a16'::uuid, 'Superficial'),
    ('448e13b8-a571-5bb9-9ccd-f5c0481a4730'::uuid, 'Intermediate'),
    ('3839fc41-0418-56a8-9ce4-89f0dc4b28a0'::uuid, 'Inflammatory'),
    ('c8e6500d-aa8b-5810-b3c4-02e35c69d389'::uuid, 'Inflammatory'),
    ('f9e857e7-770d-5bf5-b150-df320fb41cac'::uuid, 'Muscular'),
    ('c375d83b-7acd-5f86-a5be-cfae58517ced'::uuid, 'Muscular'),
    ('ffe47b6a-1741-587e-a3e3-792433392a5d'::uuid, 'Inflammatory Conditions'),
    ('b8d75521-778d-5afe-a913-f3b848f8a0be'::uuid, 'Muscular Conditions')
  ) AS expected(id, name)
  WHERE NOT EXISTS (SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name);
  IF wrong > 0 THEN
    RAISE EXCEPTION 'taxonomy has moved since 0035 was written: % of 18 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- Anterior  ->  Quadriceps
UPDATE "community"."tags" SET "name" = 'Quadriceps' WHERE "id" = 'be09aa44-e2ae-5f3d-b1f2-9e817a6fb210';--> statement-breakpoint
-- Medial  ->  Adductors
UPDATE "community"."tags" SET "name" = 'Adductors' WHERE "id" = '8cd42004-6938-542f-8841-87385daca631';--> statement-breakpoint
-- Deep  ->  Deep forearm flexors
UPDATE "community"."tags" SET "name" = 'Deep forearm flexors' WHERE "id" = '8a99e23e-863b-5ff1-84e5-d368538b5f3e';--> statement-breakpoint
-- Superficial  ->  Superficial forearm flexors
UPDATE "community"."tags" SET "name" = 'Superficial forearm flexors' WHERE "id" = '00ced5af-ed3d-5efe-a01c-cf2e2bf37422';--> statement-breakpoint
-- Intermediate  ->  Intermediate forearm flexors
UPDATE "community"."tags" SET "name" = 'Intermediate forearm flexors' WHERE "id" = '2c92bbec-219b-5d9b-839d-c3bbe374e403';--> statement-breakpoint
-- Deep  ->  Deep forearm extensors
UPDATE "community"."tags" SET "name" = 'Deep forearm extensors' WHERE "id" = '6209c54a-cbe2-5818-994f-33f715bba123';--> statement-breakpoint
-- Superficial  ->  Superficial forearm extensors
UPDATE "community"."tags" SET "name" = 'Superficial forearm extensors' WHERE "id" = 'c6478825-6e81-51a1-8421-faf729afe45b';--> statement-breakpoint
-- Deep  ->  Deep posterior leg muscles
UPDATE "community"."tags" SET "name" = 'Deep posterior leg muscles' WHERE "id" = '4314884c-6989-5871-ad1c-ebda9e51b3c2';--> statement-breakpoint
-- Superficial  ->  Superficial posterior leg muscles
UPDATE "community"."tags" SET "name" = 'Superficial posterior leg muscles' WHERE "id" = 'd047beb5-0b32-58c7-ac52-5929bf55e520';--> statement-breakpoint
-- Central  ->  Central hand muscles
UPDATE "community"."tags" SET "name" = 'Central hand muscles' WHERE "id" = '74043d47-9db2-5cf7-8089-75f3ffff396f';--> statement-breakpoint
-- Superficial  ->  Superficial cervical muscles
UPDATE "community"."tags" SET "name" = 'Superficial cervical muscles' WHERE "id" = 'c310f37a-0810-558f-b339-752a6e9c0a16';--> statement-breakpoint
-- Intermediate  ->  Intermediate thoracic muscles
UPDATE "community"."tags" SET "name" = 'Intermediate thoracic muscles' WHERE "id" = '448e13b8-a571-5bb9-9ccd-f5c0481a4730';--> statement-breakpoint
-- Inflammatory  ->  Thoracic inflammatory conditions
UPDATE "community"."tags" SET "name" = 'Thoracic inflammatory conditions' WHERE "id" = '3839fc41-0418-56a8-9ce4-89f0dc4b28a0';--> statement-breakpoint
-- Inflammatory  ->  Lumbar inflammatory conditions
UPDATE "community"."tags" SET "name" = 'Lumbar inflammatory conditions' WHERE "id" = 'c8e6500d-aa8b-5810-b3c4-02e35c69d389';--> statement-breakpoint
-- Muscular  ->  Thoracic muscular conditions
UPDATE "community"."tags" SET "name" = 'Thoracic muscular conditions' WHERE "id" = 'f9e857e7-770d-5bf5-b150-df320fb41cac';--> statement-breakpoint
-- Muscular  ->  Lumbar muscular conditions
UPDATE "community"."tags" SET "name" = 'Lumbar muscular conditions' WHERE "id" = 'c375d83b-7acd-5f86-a5be-cfae58517ced';--> statement-breakpoint
-- Inflammatory Conditions  ->  Cervical inflammatory conditions
UPDATE "community"."tags" SET "name" = 'Cervical inflammatory conditions' WHERE "id" = 'ffe47b6a-1741-587e-a3e3-792433392a5d';--> statement-breakpoint
-- Muscular Conditions  ->  Cervical muscular conditions
UPDATE "community"."tags" SET "name" = 'Cervical muscular conditions' WHERE "id" = 'b8d75521-778d-5afe-a913-f3b848f8a0be';--> statement-breakpoint
