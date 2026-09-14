-- Finish what 0038 started: qualified condition names that actually match.
--
-- Andrew's two rules from 14 September — *"stress fractures are indeed qualified by the bone
-- they affect"*, *"myofascial pain is also qualified by the area it affects"* — were applied in
-- 0038 by renaming. Checking the corpus afterwards showed the renames were half a fix.
--
-- **A tag named `Stress fractures` was still taking all of them.** It sits under Lower Limb >
-- Foot, and the plural in its name is the only reason it escaped 0038's sweep. Measured now: 16
-- articles in the corpus mention a stress fracture, and that one unqualified foot tag holds 17
-- rows — tibial, femoral and navicular papers alike — while every bone-specific tag holds
-- nothing. It is the same defect Andrew asked us to remove, wearing an `s`.
--
-- **And the renamed tags match almost nothing.** Myofascial pain went from 45 articles filed
-- three times over to 7 filed once, which is better but not right: the rest say "myofascial
-- pain" with the body part named somewhere else in the abstract, and a name matched by
-- proximity cannot reach them. All three stress-fracture tags match zero.
--
-- That is exactly the problem scope terms were built for in 0040, and this applies them to the
-- conditions as well as the ligaments. The **phrase** goes back to being bare — "stress
-- fracture", "trigger points", "myofascial pain" — and the **bone or region** becomes a
-- condition on the paper, matched anywhere in title or abstract. A paper naming no site at all
-- still matches none of them, which is correct: we do not know which bone it means either.
--
-- `Trigger points` gets the same treatment as myofascial pain rather than being left for
-- later. It is the identical defect — three copies, one per spinal region, 69 rows across 23
-- articles — and it is covered by the same instruction about the area affected.
--
-- ⚠️ **One thing to ask Andrew.** `Cervical trigger points` and `Cervical myofascial pain
-- syndrome` now scope to the same region with overlapping vocabulary, so a neck paper about
-- either will match both. They are near-identical concepts and may want merging, but that is a
-- clinical call and not ours.
--
-- Run a reclassify after deploying.

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('55f836f8-687c-5c15-b090-2c62d5b86140'::uuid, 'Stress fractures'),
    ('2718fd06-6527-51fb-bbbb-81b4d3c33cbe'::uuid, 'Tibial stress fracture'),
    ('3c4cdc22-77b7-5a2c-996c-e65cc1a53b94'::uuid, 'Fibular stress fracture'),
    ('75f1c814-ea3c-502b-88de-c2362d8ee7b4'::uuid, 'Femoral neck stress fracture'),
    ('adc209e2-4f21-5071-9314-811e7d4e35e4'::uuid, 'Cervical stress fracture'),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8'::uuid, 'Thoracic stress fracture'),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8'::uuid, 'Forearm stress fracture'),
    ('e492d313-3c9e-557a-b993-4ba04e18c061'::uuid, 'Sacral stress fracture'),
    ('35d6e7d4-fe49-5d81-806b-5557cdc6fecd'::uuid, 'Iliac stress fracture'),
    ('1e2bc087-2751-5a63-8669-67b7fa3f6d4c'::uuid, 'Ischial stress fracture'),
    ('77888e9b-dab6-59c7-ab85-d60d35a4de16'::uuid, 'Pubic ramus stress fracture'),
    ('cf695787-5d13-5976-9966-3cc678032605'::uuid, 'Acetabular stress fracture'),
    ('83fa7420-7601-56f8-b202-afc00ae7131d'::uuid, 'Trigger points'),
    ('6a47f14e-c3e3-560a-bc83-8d691d445064'::uuid, 'Trigger points'),
    ('319cefd5-f12e-5111-a625-11c473584336'::uuid, 'Trigger points'),
    ('1b011753-51fe-588f-8838-e72b073789e8'::uuid, 'Cervical myofascial pain syndrome'),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d'::uuid, 'Thoracic myofascial pain syndrome'),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9'::uuid, 'Lumbar myofascial pain syndrome')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0042 was written: % of 18 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- The name, the bare phrase as a synonym, and the site as a scope. Synonyms are replaced
-- rather than unioned for the three region tags 0039 touched, because the region-qualified
-- restatements it added are redundant once the scope carries the region.
UPDATE "community"."tags" t
   SET "name" = v.new_name,
       "synonyms" = v.synonyms,
       "scope_terms" = v.scope
  FROM (VALUES
    -- stress fractures, by the bone
    ('55f836f8-687c-5c15-b090-2c62d5b86140'::uuid, 'Foot stress fracture',
      ARRAY['stress fracture', 'metatarsal stress fracture', 'navicular stress fracture',
            'calcaneal stress fracture', 'march fracture']::text[],
      ARRAY['foot', 'metatarsal', 'navicular', 'calcaneal', 'calcaneus', 'sesamoid', 'tarsal']::text[]),
    ('2718fd06-6527-51fb-bbbb-81b4d3c33cbe', 'Tibial stress fracture',
      ARRAY['stress fracture'], ARRAY['tibia', 'tibial', 'shin']),
    ('3c4cdc22-77b7-5a2c-996c-e65cc1a53b94', 'Fibular stress fracture',
      ARRAY['stress fracture'], ARRAY['fibula', 'fibular']),
    ('75f1c814-ea3c-502b-88de-c2362d8ee7b4', 'Femoral neck stress fracture',
      ARRAY['stress fracture', 'femoral stress fracture'], ARRAY['femoral neck', 'femur', 'femoral']),
    ('adc209e2-4f21-5071-9314-811e7d4e35e4', 'Cervical stress fracture',
      ARRAY['stress fracture'], ARRAY['cervical', 'neck']),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8', 'Thoracic stress fracture',
      ARRAY['stress fracture', 'rib stress fracture'], ARRAY['thoracic', 'rib']),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8', 'Forearm stress fracture',
      ARRAY['stress fracture'], ARRAY['forearm', 'radius', 'ulna']),
    ('e492d313-3c9e-557a-b993-4ba04e18c061', 'Sacral stress fracture',
      ARRAY['stress fracture', 'sacral insufficiency fracture'], ARRAY['sacrum', 'sacral']),
    ('35d6e7d4-fe49-5d81-806b-5557cdc6fecd', 'Iliac stress fracture',
      ARRAY['stress fracture'], ARRAY['ilium', 'iliac']),
    ('1e2bc087-2751-5a63-8669-67b7fa3f6d4c', 'Ischial stress fracture',
      ARRAY['stress fracture'], ARRAY['ischium', 'ischial']),
    ('77888e9b-dab6-59c7-ab85-d60d35a4de16', 'Pubic ramus stress fracture',
      ARRAY['stress fracture', 'pubic stress fracture'], ARRAY['pubis', 'pubic']),
    ('cf695787-5d13-5976-9966-3cc678032605', 'Acetabular stress fracture',
      ARRAY['stress fracture'], ARRAY['acetabulum', 'acetabular']),
    -- trigger points, by the area
    ('83fa7420-7601-56f8-b202-afc00ae7131d', 'Cervical trigger points',
      ARRAY['trigger points', 'myofascial trigger point'], ARRAY['cervical', 'neck']),
    ('6a47f14e-c3e3-560a-bc83-8d691d445064', 'Thoracic trigger points',
      ARRAY['trigger points', 'myofascial trigger point'], ARRAY['thoracic', 'mid-back']),
    ('319cefd5-f12e-5111-a625-11c473584336', 'Lumbar trigger points',
      ARRAY['trigger points', 'myofascial trigger point'], ARRAY['lumbar', 'low back']),
    -- myofascial pain, by the area
    ('1b011753-51fe-588f-8838-e72b073789e8', 'Cervical myofascial pain syndrome',
      ARRAY['myofascial pain', 'myofascial pain syndrome'], ARRAY['cervical', 'neck']),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d', 'Thoracic myofascial pain syndrome',
      ARRAY['myofascial pain', 'myofascial pain syndrome'], ARRAY['thoracic', 'mid-back']),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9', 'Lumbar myofascial pain syndrome',
      ARRAY['myofascial pain', 'myofascial pain syndrome'], ARRAY['lumbar', 'low back'])
  ) AS v(id, new_name, synonyms, scope)
 WHERE t."id" = v.id;--> statement-breakpoint
