-- Andrew's answers of 2026-09-14: the acetabulum, the sacroiliac joint, the collateral
-- ligaments, and the three conditions that were never systemic.
--
-- Five decisions, one of which reverses ours.
--
-- **The acetabulum goes back to the pelvis.** 0036 split it — pathology to the hip, bony
-- landmarks to the pelvis — on the strength of his own note that it "forms part of the hip
-- joint". He has now answered the question directly and the split was wrong: *"the acetabulum
-- is the part of the pelvis that articulates with the femoral head. Despite forming part of
-- the hip joint, it's made up of the ilium, ischium, and pubis, and independently had to be
-- filed in the pelvis."* The conditions group returns whole. `Hip instability` is lifted out
-- of it first: it sat there by accident of the source document and is a condition of the
-- joint, not of the socket. `Hip dislocation`, `Hip osteoarthritis` and `Femoroacetabular
-- impingement` stay retired — they are hip-joint conditions the lower limb already holds
-- under better names, and none of them is a condition *of the acetabulum*.
--
-- **The sacroiliac joint is pelvis, not lumbar spine.** 0036 left that open rather than
-- inferring it. The lumbar copies retire; the pelvis already holds all three under equivalent
-- names, and the one name that was only in the lumbar spine — "SI joint arthritis" — survives
-- as a synonym on the pelvis's `SI joint osteoarthritis`.
--
-- **Every collateral ligament is qualified by its joint**, and our suggested exception is
-- dropped. We proposed leaving the unqualified name on the joint the literature means by
-- default, so that a paper saying only "MCL reconstruction" still matched something. He was
-- unconvinced — *"there's a danger to just attributing 'medial collateral ligament' and 'MCL'
-- just to the knee"* — and the corpus says he is right and we were over-cautious: of 25
-- articles mentioning the MCL, **23 also name the knee or the tibia**. The exception would
-- have bought two papers at the price of every toe and elbow paper landing in the knee.
--
-- Each renamed tag keeps its spelled-out form as a synonym — `Knee MCL` also answers to "knee
-- medial collateral ligament" — because the abbreviation alone would lose every paper that
-- writes the phrase out. `Knee MCL` additionally takes "tibial collateral ligament", which
-- Andrew notes is the correct anatomical term; as a synonym it only adds, where as the name
-- it would have excluded everything that says MCL.
--
-- The toe and finger collateral tags come out of this nearly unmatchable, and that is the
-- point. "Toe PIP MCL" will almost never appear in a paper — but neither did those joints
-- ever have a paper of their own. What they had was a sixth share of every knee paper.
--
-- **Stress fracture and myofascial pain are qualified by where they are** — his words, "stress
-- fractures are indeed qualified by the bone they affect", "myofascial pain is also qualified
-- by the area it affects". Three copies each, one per region, each matching the same papers:
-- 90 article rows on "Stress fracture" and 135 on "Myofascial pain syndrome" for what is
-- really 30 and 45 papers.
--
-- **Postural syndrome is removed entirely.** Retired rather than deleted, which is what
-- removal means here: it stops matching, stops being offered, and the 56 rows it holds fall
-- away at the next reclassify without touching anything a member wrote.
--
-- Run a reclassify after deploying — this changes what nearly 300 article rows should say.

-- Every id must still carry the name this migration expects.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    -- the acetabulum, and the condition leaving it
    ('256a8cc9-bcca-5756-a152-0334b98e68c4'::uuid, 'Acetabulum'),
    ('f67c9475-d782-51cb-8e2a-0bf7dbd3a636'::uuid, 'Hip instability'),
    ('2325faae-66c6-556e-b573-9f46b19e072e'::uuid, 'Pelvis and Pelvic Floor MSK conditions'),
    ('3a1e8c85-37b2-5e1d-b017-1aa0c4e01332'::uuid, 'Hip'),
    -- the sacroiliac joint in the lumbar spine
    ('61eb8d58-8d40-5790-beaa-96b3d5ab84c5'::uuid, 'SI Joint'),
    ('ad3ace1e-0a45-5c35-b237-309655bc5847'::uuid, 'SI joint arthritis'),
    ('599c208c-fc00-5074-8306-22c8229341ad'::uuid, 'SI joint sprain'),
    ('b5dc46f9-11ee-54cd-9c98-7155a1747b60'::uuid, 'Sacroiliac joint dysfunction'),
    ('b68dca7f-5a39-53db-84a7-e03123a18de5'::uuid, 'SI joint osteoarthritis'),
    -- collateral ligaments, lower limb
    ('50503fbd-aadc-52d3-a62c-e30fc94142e5'::uuid, 'Medial collateral ligament'),
    ('676fb10a-9ad9-50b9-842a-6cb424d04995'::uuid, 'Lateral collateral ligament'),
    ('620f8420-d590-5da4-9a3a-de53fbdf5dc2'::uuid, 'Accessory collateral ligaments'),
    ('f9c40fe9-e193-54f8-8ad0-e54303025e3e'::uuid, 'Medial collateral ligament'),
    ('eab23ee2-5b22-5cf6-9530-9277bcd99d15'::uuid, 'Lateral collateral ligament'),
    ('c94cd41e-806b-5e54-8bf8-57784919f7fc'::uuid, 'Medial collateral ligament'),
    ('5fdd33c6-c69e-52dc-b723-17e50c289b01'::uuid, 'Lateral collateral ligament'),
    ('3860e561-5f59-5397-a9e0-03a2167fe874'::uuid, 'Medial collateral ligament'),
    ('a215eef2-74a9-525a-9017-151b87d2202c'::uuid, 'Lateral collateral ligament'),
    ('1564ab76-7951-5e3e-93c3-fc9d8336dfb9'::uuid, 'Accessory collateral ligaments'),
    ('19919441-534d-545c-a449-48fad4e8c6dc'::uuid, 'Medial collateral ligament'),
    ('2b74beb3-ece0-5a0b-81ee-75937a45b1c9'::uuid, 'Lateral collateral ligament'),
    ('e1f8f853-0be8-55cd-a997-3200569ef04b'::uuid, 'Accessory collateral ligaments'),
    -- collateral ligaments, upper limb
    ('a913d1ae-9c71-5c92-8e76-dcfb6aaa4d24'::uuid, 'Ulnar collateral ligament'),
    ('22a30fc2-6544-57a3-af86-37b044dd02d4'::uuid, 'Radial collateral ligament'),
    ('076c7dd6-9f3a-5f2b-8f55-5a8a739ead08'::uuid, 'Medial collateral ligament'),
    ('d24964fe-e076-511a-baef-3bfbd691ce23'::uuid, 'Ulnar collateral ligament'),
    ('c7c52b5b-8db2-5b54-8c37-5153151c9d73'::uuid, 'Radial collateral ligament'),
    ('9b8a9e9f-a21c-5015-aac1-67bde9a54582'::uuid, 'Accessory lateral collateral ligament'),
    ('7f64d151-901b-546f-92f8-fdb9f32d5ec6'::uuid, 'Ulnar collateral ligament'),
    ('007b37ca-76ad-5840-9ba3-cd239fdfd518'::uuid, 'Radial collateral ligament'),
    ('5010f656-6966-5665-9425-c6ccb92984c4'::uuid, 'Accessory collateral ligaments'),
    ('b68f4b3c-8b93-514f-9848-e6f57ee6b4ce'::uuid, 'Ulnar collateral ligament'),
    ('5e98f41c-d0ad-5743-a92c-cac195f8f1cf'::uuid, 'Radial collateral ligament'),
    ('56990276-e293-55f6-9868-3400f1f39ae8'::uuid, 'Ulnar collateral ligament'),
    ('0ef8f200-6839-5c56-81f5-166a1d2ae2a6'::uuid, 'Ulnar collateral ligament'),
    ('9ac6921e-018b-56ce-b119-5cfde1846daa'::uuid, 'Radial collateral ligament'),
    ('a7d146cf-3f77-5d68-9cc6-0ddaed71ad72'::uuid, 'Accessory collateral ligament'),
    ('8aec76c6-8288-5a97-af12-74d7b49efa4e'::uuid, 'Radial collateral ligament injury'),
    -- stress fracture, myofascial pain, postural syndrome
    ('adc209e2-4f21-5071-9314-811e7d4e35e4'::uuid, 'Stress fracture'),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8'::uuid, 'Stress fracture'),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8'::uuid, 'Stress fracture'),
    ('1b011753-51fe-588f-8838-e72b073789e8'::uuid, 'Myofascial pain syndrome'),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9'::uuid, 'Myofascial pain syndrome'),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d'::uuid, 'Myofascial pain syndrome'),
    ('0bbfac69-a857-5022-b7a9-697ab09cee0f'::uuid, 'Postural syndrome'),
    ('db909837-2123-5514-bbc1-83bda23f608b'::uuid, 'Postural syndrome')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0038 was written: % of 46 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 1. The acetabulum returns to the pelvis, and hip instability stays with the hip.
--    Order matters: the condition is lifted out before the group moves, or it travels with it.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags"
   SET "parent_id" = '3a1e8c85-37b2-5e1d-b017-1aa0c4e01332',
       "sort_order" = (SELECT coalesce(max(s."sort_order"), 0) + 1 FROM "community"."tags" s
                        WHERE s."parent_id" = '3a1e8c85-37b2-5e1d-b017-1aa0c4e01332')
 WHERE "id" = 'f67c9475-d782-51cb-8e2a-0bf7dbd3a636';--> statement-breakpoint

UPDATE "community"."tags"
   SET "parent_id" = '2325faae-66c6-556e-b573-9f46b19e072e',
       "sort_order" = (SELECT coalesce(max(s."sort_order"), 0) + 1 FROM "community"."tags" s
                        WHERE s."parent_id" = '2325faae-66c6-556e-b573-9f46b19e072e')
 WHERE "id" = '256a8cc9-bcca-5756-a152-0334b98e68c4';--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 2. The sacroiliac joint is pelvic. The lumbar spine's copies retire; the name only it
--    carried survives as a synonym on the pelvis's tag.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags"
   SET "synonyms" = array(SELECT DISTINCT unnest("synonyms" || ARRAY['SI joint arthritis', 'sacroiliac joint arthritis']))
 WHERE "id" = 'b68dca7f-5a39-53db-84a7-e03123a18de5';--> statement-breakpoint

UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  'ad3ace1e-0a45-5c35-b237-309655bc5847',  -- SI joint arthritis          -> synonym above
  '599c208c-fc00-5074-8306-22c8229341ad',  -- SI joint sprain             -> pelvis holds it
  'b5dc46f9-11ee-54cd-9c98-7155a1747b60',  -- Sacroiliac joint dysfunction-> pelvis holds it
  '61eb8d58-8d40-5790-beaa-96b3d5ab84c5'   -- the group itself
);--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 3. Every collateral ligament names its joint, and keeps the spelled-out form as a synonym.
--
--    The abbreviation is the name because that is what Andrew asked for and what the
--    literature writes; the synonym is what stops the rename costing recall, since "medial
--    collateral ligament of the knee" contains no "MCL" for the name to match.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" t
   SET "name" = v.new_name,
       "synonyms" = array(SELECT DISTINCT unnest(t."synonyms" || v.add_synonyms))
  FROM (VALUES
    -- lower limb
    ('c94cd41e-806b-5e54-8bf8-57784919f7fc'::uuid, 'Knee MCL',
      ARRAY['knee medial collateral ligament', 'tibial collateral ligament']::text[]),
    ('5fdd33c6-c69e-52dc-b723-17e50c289b01', 'Knee LCL',
      ARRAY['knee lateral collateral ligament']),
    ('f9c40fe9-e193-54f8-8ad0-e54303025e3e', 'First MTP MCL',
      ARRAY['first MTP medial collateral ligament']),
    ('eab23ee2-5b22-5cf6-9530-9277bcd99d15', 'First MTP LCL',
      ARRAY['first MTP lateral collateral ligament']),
    ('3860e561-5f59-5397-a9e0-03a2167fe874', 'Toe MTP MCL',
      ARRAY['toe MTP medial collateral ligament']),
    ('a215eef2-74a9-525a-9017-151b87d2202c', 'Toe MTP LCL',
      ARRAY['toe MTP lateral collateral ligament']),
    ('1564ab76-7951-5e3e-93c3-fc9d8336dfb9', 'Toe MTP accessory collateral ligaments', ARRAY[]::text[]),
    ('19919441-534d-545c-a449-48fad4e8c6dc', 'Toe PIP MCL',
      ARRAY['toe PIP medial collateral ligament']),
    ('2b74beb3-ece0-5a0b-81ee-75937a45b1c9', 'Toe PIP LCL',
      ARRAY['toe PIP lateral collateral ligament']),
    ('e1f8f853-0be8-55cd-a997-3200569ef04b', 'Toe PIP accessory collateral ligaments', ARRAY[]::text[]),
    ('50503fbd-aadc-52d3-a62c-e30fc94142e5', 'Toe DIP MCL',
      ARRAY['toe DIP medial collateral ligament']),
    ('676fb10a-9ad9-50b9-842a-6cb424d04995', 'Toe DIP LCL',
      ARRAY['toe DIP lateral collateral ligament']),
    ('620f8420-d590-5da4-9a3a-de53fbdf5dc2', 'Toe DIP accessory collateral ligaments', ARRAY[]::text[]),
    -- upper limb
    ('076c7dd6-9f3a-5f2b-8f55-5a8a739ead08', 'Elbow MCL',
      ARRAY['elbow medial collateral ligament']),
    ('d24964fe-e076-511a-baef-3bfbd691ce23', 'Elbow UCL',
      ARRAY['elbow ulnar collateral ligament']),
    ('c7c52b5b-8db2-5b54-8c37-5153151c9d73', 'Elbow RCL',
      ARRAY['elbow radial collateral ligament']),
    ('9b8a9e9f-a21c-5015-aac1-67bde9a54582', 'Elbow accessory lateral collateral ligament', ARRAY[]::text[]),
    ('7f64d151-901b-546f-92f8-fdb9f32d5ec6', 'Finger MCP UCL',
      ARRAY['finger MCP ulnar collateral ligament']),
    ('007b37ca-76ad-5840-9ba3-cd239fdfd518', 'Finger MCP RCL',
      ARRAY['finger MCP radial collateral ligament']),
    ('5010f656-6966-5665-9425-c6ccb92984c4', 'Finger MCP accessory collateral ligaments', ARRAY[]::text[]),
    ('b68f4b3c-8b93-514f-9848-e6f57ee6b4ce', 'Finger PIP UCL',
      ARRAY['finger PIP ulnar collateral ligament']),
    ('5e98f41c-d0ad-5743-a92c-cac195f8f1cf', 'Finger PIP RCL',
      ARRAY['finger PIP radial collateral ligament']),
    ('a913d1ae-9c71-5c92-8e76-dcfb6aaa4d24', 'Finger DIP UCL',
      ARRAY['finger DIP ulnar collateral ligament']),
    ('22a30fc2-6544-57a3-af86-37b044dd02d4', 'Finger DIP RCL',
      ARRAY['finger DIP radial collateral ligament']),
    ('56990276-e293-55f6-9868-3400f1f39ae8', 'Thumb CMC UCL',
      ARRAY['thumb CMC ulnar collateral ligament']),
    ('0ef8f200-6839-5c56-81f5-166a1d2ae2a6', 'Thumb MCP UCL',
      ARRAY['thumb MCP ulnar collateral ligament']),
    ('9ac6921e-018b-56ce-b119-5cfde1846daa', 'Thumb MCP RCL',
      ARRAY['thumb MCP radial collateral ligament']),
    ('a7d146cf-3f77-5d68-9cc6-0ddaed71ad72', 'Thumb MCP accessory collateral ligament', ARRAY[]::text[]),
    ('8aec76c6-8288-5a97-af12-74d7b49efa4e', 'Elbow radial collateral ligament injury', ARRAY[]::text[])
  ) AS v(id, new_name, add_synonyms)
 WHERE t."id" = v.id;--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 4. Stress fracture and myofascial pain name where they are.
--
--    The region adjective rather than the bone's own name — "Cervical stress fracture", not
--    "Cervical vertebral stress fracture" — because every significant word of a tag name has
--    to appear in the text for it to match, and the literature writes "cervical spine stress
--    fracture" far more often than it writes "vertebral". The forearm's tag covers the radius
--    and the ulna both, so the compartment is the honest name for it.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" t
   SET "name" = v.new_name,
       "synonyms" = array(SELECT DISTINCT unnest(t."synonyms" || v.add_synonyms))
  FROM (VALUES
    ('adc209e2-4f21-5071-9314-811e7d4e35e4'::uuid, 'Cervical stress fracture',
      ARRAY['cervical vertebral stress fracture']::text[]),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8', 'Thoracic stress fracture',
      ARRAY['thoracic vertebral stress fracture', 'rib stress fracture']),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8', 'Forearm stress fracture',
      ARRAY['radial stress fracture', 'ulnar stress fracture']),
    ('1b011753-51fe-588f-8838-e72b073789e8', 'Cervical myofascial pain syndrome', ARRAY[]::text[]),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d', 'Thoracic myofascial pain syndrome', ARRAY[]::text[]),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9', 'Lumbar myofascial pain syndrome', ARRAY[]::text[])
  ) AS v(id, new_name, add_synonyms)
 WHERE t."id" = v.id;--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 5. Postural syndrome, removed. Retired rather than deleted: it stops matching and stops
--    being offered, which is what removal means here, without touching anything already
--    tagged with it.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '0bbfac69-a857-5022-b7a9-697ab09cee0f',  -- Cervical
  'db909837-2123-5514-bbc1-83bda23f608b'   -- Thoracic
);--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 6. The interest repair from 0036, run again for the tags retired above.
-- ---------------------------------------------------------------------------------------
WITH survivor AS (
  SELECT r."id" AS retired_id, min(s."id"::text)::uuid AS live_id
    FROM "community"."tags" r
    JOIN "community"."tags" s
      ON lower(s."name") = lower(r."name") AND s."retired_at" IS NULL
   WHERE r."retired_at" IS NOT NULL
   GROUP BY r."id"
  HAVING count(*) = 1
)
UPDATE "community"."member_interests" mi
   SET "tag_id" = survivor.live_id, "updated_at" = now()
  FROM survivor
 WHERE mi."tag_id" = survivor.retired_id
   AND NOT EXISTS (
     SELECT 1 FROM "community"."member_interests" m2
      WHERE m2."handle_id" = mi."handle_id" AND m2."tag_id" = survivor.live_id
   );--> statement-breakpoint

DELETE FROM "community"."member_interests" mi
 USING "community"."tags" r
 WHERE mi."tag_id" = r."id"
   AND r."retired_at" IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM "community"."tags" s
       JOIN "community"."member_interests" m2 ON m2."tag_id" = s."id"
      WHERE s."retired_at" IS NULL
        AND lower(s."name") = lower(r."name")
        AND m2."handle_id" = mi."handle_id"
   );--> statement-breakpoint
