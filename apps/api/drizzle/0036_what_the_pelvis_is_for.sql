-- What the Pelvis region is for (Andrew, 2026-09-10).
--
-- 0033 moved the hip and the hamstrings to the lower limb and left the wider question open:
-- 42 tag names existed in both `Pelvis, Hip and Pelvic Floor` and `Lower Limb`, matching the
-- same papers, and nothing said which region owned what. Andrew has now answered it, and the
-- answer is a rule rather than a list:
--
--   "The pelvic bones are the ilium, ischium, pubis, sacrum, coccyx. The muscles are the ones
--    forming the pelvic wall/floor."
--
-- Those muscles were in the region at all because they *attach* to a pelvic bone — which is
-- true of the glutes, the adductors, the iliopsoas and the abdominal wall, and is not a reason
-- to file a thigh muscle under the pelvis. So the region keeps the pelvic ring, the sacroiliac
-- joint, the pubic symphysis, the coccyx and the pelvic floor. Everything hip and thigh leaves.
--
-- The rule cuts both ways, which is the part worth noticing: the lower limb was holding the
-- **sacroiliac joint** and the **pubic symphysis** ligaments, and those are pelvic ring, not
-- lower limb. Thirteen ligament tags go in that direction, and four pubic and inguinal
-- conditions with them.
--
-- Nearly every duplicate has a surviving copy already in the right place, so this migration is
-- mostly retirement rather than movement. Two things actually move, because they had nowhere
-- to survive: the acetabular conditions, and erector spinae.
--
-- **The acetabulum is split deliberately.** Andrew's own note in the source document says it
-- "forms part of the hip joint", and his bone list does not include it — it is not a bone, it
-- is the socket the ilium, ischium and pubis form between them. So its *pathology* goes to the
-- hip, with the rest of the hip, and its *bony landmarks* (fossa, notch, rim, lunate surface)
-- stay with the pelvic bones that make them. The two joint structures that were filed with
-- those landmarks — the labrum and the transverse acetabular ligament — are hip joint
-- structures and the lower limb already holds both.
--
-- Not done here, and still open: the sacroiliac joint is also duplicated into the **lumbar
-- spine** (SI joint sprain, sacroiliac joint dysfunction, SI joint arthritis). The lumbopelvic
-- boundary is a different question from the one Andrew answered and is worth asking rather
-- than inferring, so those three are left alone.
--
-- Retiring, not deleting: the classifier's walk stops at a retired node so the subtree stops
-- matching, the picker stops offering it, and anything already tagged keeps its tag.
--
-- Run a reclassify after deploying. The papers on the retired copies are picked up by the
-- surviving tags, which carry the same names.

-- Every id must still carry the name this migration expects.
DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    -- the region and its four branches
    ('3cd4d28b-02c2-5c74-984e-571679500dde'::uuid, 'Pelvis, Hip and Pelvic Floor'),
    ('2325faae-66c6-556e-b573-9f46b19e072e'::uuid, 'Pelvis, Hip and Pelvic Floor MSK conditions'),
    ('bac26498-aa57-5884-8f37-db7cbe1e8256'::uuid, 'Pelvis, Hip and Pelvic Floor Muscles'),
    ('0fdef4c0-180d-535f-9c81-a4aaf0e9ecce'::uuid, 'Pelvis, Hip and Pelvic Floor bones & landmarks'),
    ('c94b7dfe-ce7c-5289-89f1-397679786f80'::uuid, 'Pelvis, Hip and Pelvic Floor ligaments'),
    -- pelvis muscles: gluteal / deep hip
    ('808dd7a0-778f-522b-a870-18d0d6cf1a7e'::uuid, 'Gluteal / deep hip'),
    ('70cd902d-d1a8-5a6d-8617-4cf739b3a9ed'::uuid, 'Gluteus maximus'),
    ('ff0541e3-980a-5754-b922-3932600893ec'::uuid, 'Gluteus medius'),
    ('973595ed-b792-568a-9e1c-67cba28ca736'::uuid, 'Gluteus minimus'),
    ('6650f00c-28a5-557f-8a1e-d1be51fd570d'::uuid, 'Inferior gemellus'),
    ('5e751fdd-f019-5ec7-a134-e135d05a350d'::uuid, 'Obturator externus'),
    ('262118d9-fabf-5a8a-8c5f-94e3bee083f2'::uuid, 'Obturator internus'),
    ('adacda23-2aad-58eb-90a0-1ee044e800a8'::uuid, 'Piriformis'),
    ('f8421427-23a9-5b36-a964-54a9190b45c0'::uuid, 'Quadratus femoris'),
    ('5dedbc63-c23d-59a6-b894-f64606d31fee'::uuid, 'Superior gemellus'),
    ('3fe5ca68-1306-5963-bb14-441c055002b6'::uuid, 'Tensor fasciae latae'),
    -- pelvis muscles: adductors / medial thigh
    ('34f74777-4f76-5aac-a9aa-07b7dcc19642'::uuid, 'Adductors / medial thigh'),
    ('45c6af43-f9c9-5614-a5f6-1548efccde31'::uuid, 'Adductor brevis'),
    ('acc092b8-e437-5376-aa1a-01fbab9c40ec'::uuid, 'Adductor longus'),
    ('49b2a353-94c3-5414-9970-1fe743609d5e'::uuid, 'Adductor magnus'),
    ('c9f1b4af-b277-52fc-a58a-eadf4176aec4'::uuid, 'Gracilis'),
    ('198ccaf5-8ddf-5a00-937a-14ec3c75f5d8'::uuid, 'Pectineus'),
    -- pelvis muscles: iliopsoas / anterior hip
    ('b33767ce-c7fa-5226-b523-b510eac5d5a0'::uuid, 'Iliopsoas / anterior hip'),
    ('91f4c7ca-c0ea-5baf-988a-37029a5e55fc'::uuid, 'Iliacus'),
    ('5941d46e-0079-5d39-b34b-cf150f889dac'::uuid, 'Psoas major'),
    ('7e9035ed-2731-5391-aa84-426086e783a2'::uuid, 'Psoas minor'),
    ('b55a021d-e44e-5114-9b77-f807708af17d'::uuid, 'Rectus femoris'),
    ('1c8439e7-bb7d-5e91-a2b9-64177b69653d'::uuid, 'Sartorius'),
    -- pelvis muscles: abdominal / trunk
    ('bddeb2e2-62aa-5eb1-b114-ea5eedb3ff67'::uuid, 'Abdominal / trunk'),
    ('5895b6b3-aeb6-516f-8a91-7d91c29a916e'::uuid, 'Erector spinae'),
    ('14932526-6791-5234-b699-e826150ff434'::uuid, 'External oblique'),
    ('e41776b7-ee5a-5e7d-af11-1c445f0abead'::uuid, 'Iliocostalis lumborum'),
    ('0b259252-d406-53bb-ab13-60beaeb8250b'::uuid, 'Internal oblique'),
    ('41256fb3-021a-5721-b507-e18762a8827e'::uuid, 'Longissimus thoracis'),
    ('9c6c3a50-f04e-5167-b932-53a3e49c3344'::uuid, 'Multifidus'),
    ('abbb43bf-0148-5246-99e0-0baca3d7e46c'::uuid, 'Pyramidalis'),
    ('65e82ecc-d0cf-5ea5-9f84-807b9a51596a'::uuid, 'Quadratus lumborum'),
    ('e606aa17-7d08-5dda-8985-8555a617aee4'::uuid, 'Rectus abdominis'),
    ('836dbe26-b4cc-57eb-8ce2-ebd8f09237b2'::uuid, 'Transversus abdominis'),
    -- pelvis ligaments: hip / acetabulum
    ('dd5c1646-c20b-5eae-8de6-0da01c147d03'::uuid, 'Hip / acetabulum'),
    ('056b02bd-d285-509a-8aa3-dfca6f86858f'::uuid, 'Iliofemoral ligament'),
    ('fcd099db-dd2f-5213-b293-8a69e14f40e2'::uuid, 'Ischiofemoral ligament'),
    ('c57fede4-10b9-5806-8cb0-c1fa81e3bb6d'::uuid, 'Ligament of head of femur'),
    ('c23505c1-6a4b-52b0-93bf-79f926a8e871'::uuid, 'Pubofemoral ligament'),
    ('e85238ac-4025-5030-be96-0c9fb065b555'::uuid, 'Transverse acetabular ligament'),
    -- pelvis: terms the source document listed twice
    ('7c61f3fd-e91d-55a7-8bab-9eb5b34f0fda'::uuid, 'Sacrospinous ligament'),
    ('87cfabdd-3920-57f9-adb1-503b648d6710'::uuid, 'Sacrotuberous ligament'),
    ('13d521b2-ce49-5aeb-adbf-8cdd876d1bbe'::uuid, 'Acetabular labrum'),
    ('c00c2c6d-8a78-5e22-b2fd-ebfc1f5589a0'::uuid, 'Transverse acetabular ligament'),
    ('65ae5482-b9fc-5588-a99c-909f10e1e4d5'::uuid, 'Athletic pubalgia'),
    -- pelvis conditions: the acetabulum and the hip
    ('256a8cc9-bcca-5756-a152-0334b98e68c4'::uuid, 'Acetabulum'),
    ('4932b35b-5a84-5351-8868-d99e56f8829c'::uuid, 'Hip dislocation'),
    ('56bfd1ca-ce34-5a13-9583-6bae23ee6411'::uuid, 'Hip osteoarthritis'),
    ('08c7abcf-fcd6-56cd-8168-fee8fc1f35c3'::uuid, 'Femoroacetabular impingement'),
    -- lower limb: the pelvic ring it was holding
    ('e5eed5f0-94f7-507d-9fac-d2878c407ea7'::uuid, 'Sacroiliac joint'),
    ('a1c9e1a7-717f-56ae-a997-b880646cbc2e'::uuid, 'Anterior sacroiliac ligament'),
    ('0933506b-3e12-57da-90af-5f8f252c049d'::uuid, 'Iliolumbar ligament'),
    ('a1bd4c5c-5e37-5489-9e18-f76f1de90578'::uuid, 'Interosseous sacroiliac ligament'),
    ('4caa0db6-55f3-53bf-8eb0-26cc27b7a98a'::uuid, 'Long posterior sacroiliac ligament'),
    ('1d779b3f-17f2-5611-804d-cfa3d3d790bc'::uuid, 'Sacrospinous ligament'),
    ('099b0883-2eda-558a-8616-ddcb6278a179'::uuid, 'Sacrotuberous ligament'),
    ('894375bb-2dcf-5b5f-a999-17cca966bc15'::uuid, 'Short posterior sacroiliac ligament'),
    ('b8a52a05-698b-5258-a076-b81efec0b3b4'::uuid, 'Pubic symphysis'),
    ('927ba504-57c9-5d85-822d-fdd930808bed'::uuid, 'Anterior pubic ligament'),
    ('0a541960-d57f-55fa-8bb0-700ec9327d55'::uuid, 'Inferior/arcuate pubic ligament'),
    ('36736784-8da0-545d-8052-86c72cc5a6df'::uuid, 'Posterior pubic ligament'),
    ('06535521-e8d1-5344-9cd5-c3195ddc1133'::uuid, 'Superior pubic ligament'),
    -- lower limb: pubic and inguinal conditions
    ('1bbd299a-3ffd-5ca7-8c8e-5e7b3ccbfded'::uuid, 'Osteitis pubis'),
    ('fb65b58d-419b-569b-8822-f1bd2133687d'::uuid, 'Sports hernia'),
    ('3dd1c531-2011-5fb2-aee4-5e0f3fb24d9f'::uuid, 'Athletic pubalgia'),
    ('d5222023-7247-59b0-a718-27d517088bec'::uuid, 'Athletic pubalgia'),
    -- the destinations, and the surviving copy that gains a synonym
    ('1a5bb1d9-91c6-56ba-b36a-87773097ce06'::uuid, 'Posterior lumbar muscles'),
    ('3a1e8c85-37b2-5e1d-b017-1aa0c4e01332'::uuid, 'Hip'),
    ('14f82f33-4c94-5e4d-81b9-c77ecb52b406'::uuid, 'Inferior pubic ligament')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0036 was written: % of 74 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 1. The region says what it is for. It no longer contains the hip.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" SET "name" = 'Pelvis and Pelvic Floor' WHERE "id" = '3cd4d28b-02c2-5c74-984e-571679500dde';--> statement-breakpoint
UPDATE "community"."tags" SET "name" = 'Pelvis and Pelvic Floor MSK conditions' WHERE "id" = '2325faae-66c6-556e-b573-9f46b19e072e';--> statement-breakpoint
UPDATE "community"."tags" SET "name" = 'Pelvis and Pelvic Floor muscles' WHERE "id" = 'bac26498-aa57-5884-8f37-db7cbe1e8256';--> statement-breakpoint
UPDATE "community"."tags" SET "name" = 'Pelvis and Pelvic Floor bones & landmarks' WHERE "id" = '0fdef4c0-180d-535f-9c81-a4aaf0e9ecce';--> statement-breakpoint
UPDATE "community"."tags" SET "name" = 'Pelvis and Pelvic Floor ligaments' WHERE "id" = 'c94b7dfe-ce7c-5289-89f1-397679786f80';--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 2. The two tags that move, because they had nowhere to survive.
-- ---------------------------------------------------------------------------------------

-- The acetabular conditions join the rest of the hip. Femoroacetabular impingement, hip
-- dislocation and hip osteoarthritis are retired below rather than moved, because the hip
-- already holds all three under better names.
UPDATE "community"."tags"
   SET "parent_id" = '3a1e8c85-37b2-5e1d-b017-1aa0c4e01332',
       "sort_order" = (SELECT coalesce(max(s."sort_order"), 0) + 1 FROM "community"."tags" s
                        WHERE s."parent_id" = '3a1e8c85-37b2-5e1d-b017-1aa0c4e01332')
 WHERE "id" = '256a8cc9-bcca-5756-a152-0334b98e68c4';--> statement-breakpoint

-- Erector spinae is a trunk muscle and the only one of the ten with no copy elsewhere. Its
-- own components — iliocostalis, longissimus, multifidus — are already lumbar.
UPDATE "community"."tags"
   SET "parent_id" = '1a5bb1d9-91c6-56ba-b36a-87773097ce06',
       "sort_order" = (SELECT coalesce(max(s."sort_order"), 0) + 1 FROM "community"."tags" s
                        WHERE s."parent_id" = '1a5bb1d9-91c6-56ba-b36a-87773097ce06')
 WHERE "id" = '5895b6b3-aeb6-516f-8a91-7d91c29a916e';--> statement-breakpoint

-- The lower limb's arcuate pubic ligament and the pelvis's inferior pubic ligament are the
-- same ligament under two names. The lower limb copy retires; its name survives as a synonym.
UPDATE "community"."tags"
   SET "synonyms" = array(SELECT DISTINCT unnest("synonyms" || ARRAY['arcuate pubic ligament']))
 WHERE "id" = '14f82f33-4c94-5e4d-81b9-c77ecb52b406';--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 3. Hip and thigh muscles leave the pelvis. Children first, so no step hides a node the
--    next one needs. Every one of these has a surviving copy in the lower limb or the
--    lumbar spine — the same muscle, filed where the muscle is.
-- ---------------------------------------------------------------------------------------
-- Gluteal / deep hip  ->  Lower Limb > Lower Limb muscles > Gluteal Region
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '70cd902d-d1a8-5a6d-8617-4cf739b3a9ed',  -- Gluteus maximus
  'ff0541e3-980a-5754-b922-3932600893ec',  -- Gluteus medius
  '973595ed-b792-568a-9e1c-67cba28ca736',  -- Gluteus minimus
  '6650f00c-28a5-557f-8a1e-d1be51fd570d',  -- Inferior gemellus
  '5e751fdd-f019-5ec7-a134-e135d05a350d',  -- Obturator externus
  '262118d9-fabf-5a8a-8c5f-94e3bee083f2',  -- Obturator internus
  'adacda23-2aad-58eb-90a0-1ee044e800a8',  -- Piriformis
  'f8421427-23a9-5b36-a964-54a9190b45c0',  -- Quadratus femoris
  '5dedbc63-c23d-59a6-b894-f64606d31fee',  -- Superior gemellus
  '3fe5ca68-1306-5963-bb14-441c055002b6',  -- Tensor fasciae latae
  '808dd7a0-778f-522b-a870-18d0d6cf1a7e'   -- the group itself
);--> statement-breakpoint

-- Adductors / medial thigh  ->  Lower Limb > Lower Limb muscles > Thigh > Adductors
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '45c6af43-f9c9-5614-a5f6-1548efccde31',  -- Adductor brevis
  'acc092b8-e437-5376-aa1a-01fbab9c40ec',  -- Adductor longus
  '49b2a353-94c3-5414-9970-1fe743609d5e',  -- Adductor magnus
  'c9f1b4af-b277-52fc-a58a-eadf4176aec4',  -- Gracilis
  '198ccaf5-8ddf-5a00-937a-14ec3c75f5d8',  -- Pectineus
  '34f74777-4f76-5aac-a9aa-07b7dcc19642'   -- the group itself
);--> statement-breakpoint

-- Iliopsoas / anterior hip  ->  the lumbar spine's hip flexors, and the lower limb's thigh.
-- "Psoas minor" survives as the lumbar spine's "Psoas minor (variable)".
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '91f4c7ca-c0ea-5baf-988a-37029a5e55fc',  -- Iliacus
  '5941d46e-0079-5d39-b34b-cf150f889dac',  -- Psoas major
  '7e9035ed-2731-5391-aa84-426086e783a2',  -- Psoas minor
  'b55a021d-e44e-5114-9b77-f807708af17d',  -- Rectus femoris
  '1c8439e7-bb7d-5e91-a2b9-64177b69653d',  -- Sartorius
  'b33767ce-c7fa-5226-b523-b510eac5d5a0'   -- the group itself
);--> statement-breakpoint

-- Abdominal / trunk  ->  Lumbar Spine > Lumbar Spine muscles. "Multifidus" retires without a
-- same-named survivor on purpose: the bare name is the generic-name problem 0032 dealt with,
-- and the cervical, thoracic and lumbar multifidus each have their own qualified tag.
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '14932526-6791-5234-b699-e826150ff434',  -- External oblique
  'e41776b7-ee5a-5e7d-af11-1c445f0abead',  -- Iliocostalis lumborum
  '0b259252-d406-53bb-ab13-60beaeb8250b',  -- Internal oblique
  '41256fb3-021a-5721-b507-e18762a8827e',  -- Longissimus thoracis
  '9c6c3a50-f04e-5167-b932-53a3e49c3344',  -- Multifidus
  'abbb43bf-0148-5246-99e0-0baca3d7e46c',  -- Pyramidalis
  '65e82ecc-d0cf-5ea5-9f84-807b9a51596a',  -- Quadratus lumborum
  'e606aa17-7d08-5dda-8985-8555a617aee4',  -- Rectus abdominis
  '836dbe26-b4cc-57eb-8ce2-ebd8f09237b2',  -- Transversus abdominis
  'bddeb2e2-62aa-5eb1-b114-ea5eedb3ff67'   -- the group itself
);--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 4. Hip joint structures leave the pelvis. The lower limb's Hip joint group holds all five,
--    plus the capsule, the bands and ligamentum teres that the pelvis copy never had.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '056b02bd-d285-509a-8aa3-dfca6f86858f',  -- Iliofemoral ligament
  'fcd099db-dd2f-5213-b293-8a69e14f40e2',  -- Ischiofemoral ligament
  'c57fede4-10b9-5806-8cb0-c1fa81e3bb6d',  -- Ligament of head of femur
  'c23505c1-6a4b-52b0-93bf-79f926a8e871',  -- Pubofemoral ligament
  'e85238ac-4025-5030-be96-0c9fb065b555',  -- Transverse acetabular ligament
  'dd5c1646-c20b-5eae-8de6-0da01c147d03'   -- the group itself
);--> statement-breakpoint

-- The acetabular labrum and the transverse acetabular ligament were also filed with the
-- acetabulum's bony landmarks. They are hip joint structures; the lower limb holds both.
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '13d521b2-ce49-5aeb-adbf-8cdd876d1bbe',  -- Acetabular labrum
  'c00c2c6d-8a78-5e22-b2fd-ebfc1f5589a0'   -- Transverse acetabular ligament
);--> statement-breakpoint

-- Hip conditions the lower limb already holds, under the names the literature uses.
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '4932b35b-5a84-5351-8868-d99e56f8829c',  -- Hip dislocation
  '56bfd1ca-ce34-5a13-9583-6bae23ee6411',  -- Hip osteoarthritis
  '08c7abcf-fcd6-56cd-8168-fee8fc1f35c3'   -- Femoroacetabular impingement -> "(FAI)"
);--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 5. The same two ligaments, listed twice inside the pelvis by the source document. The
--    sacrospinous and sacrotuberous ligaments span the sacrum to the ischium; they keep
--    their place with the sacroiliac ligaments rather than with the pelvic floor.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '7c61f3fd-e91d-55a7-8bab-9eb5b34f0fda',  -- Sacrospinous ligament   (pelvic floor / perineum copy)
  '87cfabdd-3920-57f9-adb1-503b648d6710'   -- Sacrotuberous ligament  (pelvic floor / perineum copy)
);--> statement-breakpoint

-- Athletic pubalgia was filed under both the inguinal region and the pubis. It is a pubic
-- condition; the pubis copy survives.
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" = '65ae5482-b9fc-5588-a99c-909f10e1e4d5';--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 6. The other direction: the pelvic ring leaves the lower limb.
--    The sacroiliac joint and the pubic symphysis are joints between pelvic bones. Every one
--    of these has a surviving copy in the pelvis.
-- ---------------------------------------------------------------------------------------
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  'a1c9e1a7-717f-56ae-a997-b880646cbc2e',  -- Anterior sacroiliac ligament
  '0933506b-3e12-57da-90af-5f8f252c049d',  -- Iliolumbar ligament (also lumbar; two copies remain)
  'a1bd4c5c-5e37-5489-9e18-f76f1de90578',  -- Interosseous sacroiliac ligament
  '4caa0db6-55f3-53bf-8eb0-26cc27b7a98a',  -- Long posterior sacroiliac ligament
  '1d779b3f-17f2-5611-804d-cfa3d3d790bc',  -- Sacrospinous ligament
  '099b0883-2eda-558a-8616-ddcb6278a179',  -- Sacrotuberous ligament
  '894375bb-2dcf-5b5f-a999-17cca966bc15',  -- Short posterior sacroiliac ligament
  'e5eed5f0-94f7-507d-9fac-d2878c407ea7'   -- the group itself
);--> statement-breakpoint

UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '927ba504-57c9-5d85-822d-fdd930808bed',  -- Anterior pubic ligament
  '0a541960-d57f-55fa-8bb0-700ec9327d55',  -- Inferior/arcuate pubic ligament -> synonym above
  '36736784-8da0-545d-8052-86c72cc5a6df',  -- Posterior pubic ligament
  '06535521-e8d1-5344-9cd5-c3195ddc1133',  -- Superior pubic ligament
  'b8a52a05-698b-5258-a076-b81efec0b3b4'   -- the group itself
);--> statement-breakpoint

-- Pubic and inguinal conditions, filed under the lower limb's groin and hip. The pelvis holds
-- all four beside the rest of the pubis and the inguinal region.
UPDATE "community"."tags" SET "retired_at" = now() WHERE "id" IN (
  '1bbd299a-3ffd-5ca7-8c8e-5e7b3ccbfded',  -- Osteitis pubis      (Groin)
  'fb65b58d-419b-569b-8822-f1bd2133687d',  -- Sports hernia       (Groin)
  '3dd1c531-2011-5fb2-aee4-5e0f3fb24d9f',  -- Athletic pubalgia   (Groin)
  'd5222023-7247-59b0-a718-27d517088bec'   -- Athletic pubalgia   (Hip)
);--> statement-breakpoint

-- ---------------------------------------------------------------------------------------
-- 7. An interest a member chose does not die because we moved the tag out from under it.
--
-- One member has chosen "Quadratus lumborum" — the pelvis copy, retired above. The muscle has
-- not gone anywhere; only our filing of it changed, so the interest follows the name to the
-- surviving tag. Written for every retired tag rather than that one row, because it is the
-- same repair whenever a tag retires with a namesake still live, and because more interests
-- may be chosen between this being written and it being deployed.
--
-- Only an unambiguous namesake counts: if two live tags share the retired one's name there is
-- no fact of the matter about which the member meant, and the interest is left alone rather
-- than guessed at.
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

-- The rows the guard above skipped: the member already holds the surviving tag, so the
-- retired duplicate is redundant rather than lost.
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
