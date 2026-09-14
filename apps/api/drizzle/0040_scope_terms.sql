-- Scope terms: the joint a shared structure belongs to, checked against the whole document.
--
-- 0038 gave every collateral ligament its joint, as Andrew asked. The reclassify afterwards
-- showed what that cost: **`Knee MCL` matched 2 articles, of the 25 that mention the MCL.**
--
-- The taxonomy was right and the matcher could not deliver it. `matchesIn` requires every
-- significant word of a name inside a window of `words.length + 3`, so `Knee MCL` needs
-- "knee" within five tokens of "MCL". This literature does not oblige: it writes *"Risk of
-- Revision After ACL Reconstruction: Influence of Concomitant MCL Injury"*, where the joint
-- is named nowhere near the ligament and often not in the title at all. Measured on the live
-- corpus, 23 of those 25 articles name the knee or the tibia *somewhere* — the window was
-- discarding twenty-one papers to answer a question the document had already answered.
--
-- A proximity window asks "are these words near each other". That is the right question for a
-- phrase and the wrong one for a structure six joints share. Those are two different tests,
-- and this column separates them: the **phrase** is matched by proximity as before, and the
-- **joint** becomes a condition on the paper, matched anywhere in title or abstract, with any
-- one term sufficing.
--
-- Which is what lets the bare phrase come back as a synonym safely. "Medial collateral
-- ligament" can now sit on the knee, the elbow and four toe joints at once without any of
-- them stealing the others' papers, because only the paper's own body part decides which is
-- allowed to claim it. That is not the exception Andrew rejected — he objected to attributing
-- the bare term to the knee *unconditionally*, and this is precisely the condition.
--
-- Scope terms are classification only, never search or input: "knee" is not another way of
-- saying "Knee MCL", it is a fact the document has to carry.
--
-- Run a reclassify after deploying.

ALTER TABLE "community"."tags"
  ADD COLUMN IF NOT EXISTS "scope_terms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('c94cd41e-806b-5e54-8bf8-57784919f7fc'::uuid, 'Knee MCL'),
    ('5fdd33c6-c69e-52dc-b723-17e50c289b01'::uuid, 'Knee LCL'),
    ('f9c40fe9-e193-54f8-8ad0-e54303025e3e'::uuid, 'First MTP MCL'),
    ('eab23ee2-5b22-5cf6-9530-9277bcd99d15'::uuid, 'First MTP LCL'),
    ('3860e561-5f59-5397-a9e0-03a2167fe874'::uuid, 'Toe MTP MCL'),
    ('a215eef2-74a9-525a-9017-151b87d2202c'::uuid, 'Toe MTP LCL'),
    ('19919441-534d-545c-a449-48fad4e8c6dc'::uuid, 'Toe PIP MCL'),
    ('2b74beb3-ece0-5a0b-81ee-75937a45b1c9'::uuid, 'Toe PIP LCL'),
    ('50503fbd-aadc-52d3-a62c-e30fc94142e5'::uuid, 'Toe DIP MCL'),
    ('676fb10a-9ad9-50b9-842a-6cb424d04995'::uuid, 'Toe DIP LCL'),
    ('076c7dd6-9f3a-5f2b-8f55-5a8a739ead08'::uuid, 'Elbow MCL'),
    ('d24964fe-e076-511a-baef-3bfbd691ce23'::uuid, 'Elbow UCL'),
    ('c7c52b5b-8db2-5b54-8c37-5153151c9d73'::uuid, 'Elbow RCL'),
    ('7f64d151-901b-546f-92f8-fdb9f32d5ec6'::uuid, 'Finger MCP UCL'),
    ('007b37ca-76ad-5840-9ba3-cd239fdfd518'::uuid, 'Finger MCP RCL'),
    ('b68f4b3c-8b93-514f-9848-e6f57ee6b4ce'::uuid, 'Finger PIP UCL'),
    ('5e98f41c-d0ad-5743-a92c-cac195f8f1cf'::uuid, 'Finger PIP RCL'),
    ('a913d1ae-9c71-5c92-8e76-dcfb6aaa4d24'::uuid, 'Finger DIP UCL'),
    ('22a30fc2-6544-57a3-af86-37b044dd02d4'::uuid, 'Finger DIP RCL'),
    ('56990276-e293-55f6-9868-3400f1f39ae8'::uuid, 'Thumb CMC UCL'),
    ('0ef8f200-6839-5c56-81f5-166a1d2ae2a6'::uuid, 'Thumb MCP UCL'),
    ('9ac6921e-018b-56ce-b119-5cfde1846daa'::uuid, 'Thumb MCP RCL')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0040 was written: % of 22 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- The scope, and the bare phrase the scope makes safe.
--
-- Scopes are deliberately generous — "tibial" reaches the knee papers that talk about the
-- tibial collateral ligament, "hallux" and "great toe" the first MTP papers that never say
-- "MTP" — because a scope only ever *narrows* a match that the phrase already made. A scope
-- term that is too broad costs a false positive; one that is too narrow costs the paper
-- entirely, which is the failure this column exists to fix.
UPDATE "community"."tags" t
   SET "scope_terms" = v.scope,
       "synonyms" = array(SELECT DISTINCT unnest(t."synonyms" || v.add_synonyms))
  FROM (VALUES
    -- knee
    ('c94cd41e-806b-5e54-8bf8-57784919f7fc'::uuid, ARRAY['knee', 'tibial']::text[],
      ARRAY['MCL', 'medial collateral ligament']::text[]),
    ('5fdd33c6-c69e-52dc-b723-17e50c289b01', ARRAY['knee', 'fibular'],
      ARRAY['LCL', 'lateral collateral ligament']),
    -- first metatarsophalangeal joint
    ('f9c40fe9-e193-54f8-8ad0-e54303025e3e', ARRAY['hallux', 'great toe', 'first metatarsophalangeal', 'first MTP'],
      ARRAY['medial collateral ligament']),
    ('eab23ee2-5b22-5cf6-9530-9277bcd99d15', ARRAY['hallux', 'great toe', 'first metatarsophalangeal', 'first MTP'],
      ARRAY['lateral collateral ligament']),
    -- lesser toe joints
    ('3860e561-5f59-5397-a9e0-03a2167fe874', ARRAY['toe', 'lesser metatarsophalangeal'],
      ARRAY['medial collateral ligament']),
    ('a215eef2-74a9-525a-9017-151b87d2202c', ARRAY['toe', 'lesser metatarsophalangeal'],
      ARRAY['lateral collateral ligament']),
    ('19919441-534d-545c-a449-48fad4e8c6dc', ARRAY['toe'], ARRAY['medial collateral ligament']),
    ('2b74beb3-ece0-5a0b-81ee-75937a45b1c9', ARRAY['toe'], ARRAY['lateral collateral ligament']),
    ('50503fbd-aadc-52d3-a62c-e30fc94142e5', ARRAY['toe'], ARRAY['medial collateral ligament']),
    ('676fb10a-9ad9-50b9-842a-6cb424d04995', ARRAY['toe'], ARRAY['lateral collateral ligament']),
    -- elbow
    ('076c7dd6-9f3a-5f2b-8f55-5a8a739ead08', ARRAY['elbow'], ARRAY['medial collateral ligament']),
    ('d24964fe-e076-511a-baef-3bfbd691ce23', ARRAY['elbow'],
      ARRAY['UCL', 'ulnar collateral ligament', 'Tommy John']),
    ('c7c52b5b-8db2-5b54-8c37-5153151c9d73', ARRAY['elbow'], ARRAY['radial collateral ligament']),
    -- fingers
    ('7f64d151-901b-546f-92f8-fdb9f32d5ec6', ARRAY['finger', 'metacarpophalangeal'],
      ARRAY['ulnar collateral ligament']),
    ('007b37ca-76ad-5840-9ba3-cd239fdfd518', ARRAY['finger', 'metacarpophalangeal'],
      ARRAY['radial collateral ligament']),
    ('b68f4b3c-8b93-514f-9848-e6f57ee6b4ce', ARRAY['finger'], ARRAY['ulnar collateral ligament']),
    ('5e98f41c-d0ad-5743-a92c-cac195f8f1cf', ARRAY['finger'], ARRAY['radial collateral ligament']),
    ('a913d1ae-9c71-5c92-8e76-dcfb6aaa4d24', ARRAY['finger'], ARRAY['ulnar collateral ligament']),
    ('22a30fc2-6544-57a3-af86-37b044dd02d4', ARRAY['finger'], ARRAY['radial collateral ligament']),
    -- thumb
    ('56990276-e293-55f6-9868-3400f1f39ae8', ARRAY['thumb'], ARRAY['ulnar collateral ligament']),
    ('0ef8f200-6839-5c56-81f5-166a1d2ae2a6', ARRAY['thumb'],
      ARRAY['ulnar collateral ligament', 'skier''s thumb', 'gamekeeper''s thumb']),
    ('9ac6921e-018b-56ce-b119-5cfde1846daa', ARRAY['thumb'], ARRAY['radial collateral ligament'])
  ) AS v(id, scope, add_synonyms)
 WHERE t."id" = v.id;--> statement-breakpoint
