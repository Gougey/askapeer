-- Andrew's tag decisions (November 2026). The structure only: the labels are 0065.
--
-- Merged, keeping the copy he named: the three shoulder ligaments under Shoulder girdle, and
-- Adductor tendinopathy under Groin. Plantar plate stays under Metatarsophalangeal joints only.
-- Sacrum, Ilium, Ischium and Coccyx each lose the repeat of themselves beneath their own bone
-- heading; their conditions sit under a separate heading and are untouched. Joint Disorders goes,
-- its 18 conditions moving up a level first, because retiring a heading hides everything under
-- it. Ligamenta flava becomes Ligamentum flavum, which is what the literature writes (212 papers
-- against 4), with the plural kept as a synonym. Facet arthropathy gains a thoracic copy. His
-- twelve muscles join the inguinal region.
--
-- **One Osteoporotic fracture.** Like rheumatoid arthritis in 0041, it is not a condition of a
-- region: Andrew says these fractures occur anywhere, and the two spine copies were applied to
-- all 500 papers wherever the fracture was. The lumbar copy moves beside Osteoporosis, keeping
-- its id, and the thoracic and cervical copies fold into it.
--
-- ⚠️ **No full reclassify, unlike every taxonomy migration before it.** The papers move here,
-- in SQL, because same-named copies carry the same matches: retiring one takes nothing from
-- its survivor, and a new copy of an existing tag matches what its twin matches. A full run
-- over 300,000 papers would be hours of the job that caused the 90-minute outage in September,
-- on a 512 MB database, the week before the pilot. Only two names here are new wording,
-- Ligamentum flavum and Iliopsoas, so only their papers need the classifier:
-- `node dist/cli/pilot.js reclassify-matching`. Checked against the classifier on all 18,861
-- local papers: it would remove nothing, and add only those two names' matches.
--
-- Ids are uuid5 over the tag's path, as in 0030.
DO $$
DECLARE
  wrong int;
BEGIN
  SELECT count(*) INTO wrong
    FROM (VALUES
      ('0af8cd37-3299-530e-b1c8-5ab7560bcd05'::uuid, 'Joint Disorders'),
      ('0dc054a4-f24b-54be-b5be-8b5fe2a2d03a'::uuid, 'Osteoporotic fracture'),
      ('206f54c7-70eb-58f7-966e-32cf21982e74'::uuid, 'Ischium'),
      ('21574b83-4d6d-5297-a514-ab072cff77b7'::uuid, 'Ischium'),
      ('24c2892f-823d-57d0-b6c3-2d2319657b56'::uuid, 'Coracoacromial ligament'),
      ('2b25b676-bfd2-594b-b579-cf5c27875bb1'::uuid, 'Osteoporosis-related fracture'),
      ('378e1522-1799-5dc1-bcdc-66ae825cd721'::uuid, 'Inguinal region'),
      ('563c90f5-08f3-5538-9104-92c4e44a0eba'::uuid, 'Coracoacromial ligament'),
      ('5bf2582e-4aea-5ebb-a156-35ab6383eb06'::uuid, 'Osteoporotic fracture'),
      ('64ac2e36-5171-5f45-9e15-45cb854c112e'::uuid, 'Acromioclavicular ligament'),
      ('69003518-576c-532f-864d-d167b3202792'::uuid, 'Ligamenta flava'),
      ('6948ce81-de97-524e-beab-78d82955f9b0'::uuid, 'Plantar plate'),
      ('6aaf2e04-28e4-55b5-aa48-dc5208f23522'::uuid, 'Plantar plate'),
      ('7af35fa3-074d-572e-aa21-5e90088152dc'::uuid, 'Ligamenta flava'),
      ('7cabc7b7-e826-59dd-8a31-022862574630'::uuid, 'Acromioclavicular ligament'),
      ('7f9ed9bd-3521-50b6-b7b5-8926c221c147'::uuid, 'Adductor tendinopathy'),
      ('825f435c-4ade-5c17-9324-73b950873610'::uuid, 'Plantar plate'),
      ('842b2f76-5fb9-59f6-9cb1-1dd09e24d376'::uuid, 'Coccyx'),
      ('8a4b1f90-ab3d-5ab7-9511-569ec035e1d0'::uuid, 'Ilium'),
      ('913be9cb-1088-507b-a152-3f7985865499'::uuid, 'Sacrum'),
      ('923eb95e-5998-5403-9bad-31c55f3811de'::uuid, 'Sacrum'),
      ('9c296aad-e966-584f-a7b1-44e3d5d282ba'::uuid, 'Facet arthropathy'),
      ('a3746e4b-6e88-5862-8f76-a8736be87148'::uuid, 'Thoracic facet syndrome'),
      ('a56bf5e0-8345-55c5-8a80-7e9dbb36c6d0'::uuid, 'Ilium'),
      ('aad3b90b-24bc-5d3b-a14e-9eeffa583c4b'::uuid, 'Ligamenta flava'),
      ('ae3708f4-fc8e-530f-82d1-f6c65a141b03'::uuid, 'Adductor tendinopathy'),
      ('bac26498-aa57-5884-8f37-db7cbe1e8256'::uuid, 'Pelvis and Pelvic Floor muscles'),
      ('bafa9aed-b6f1-5117-94c5-8c6533a4127c'::uuid, 'Coracohumeral ligament'),
      ('c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33'::uuid, 'Metabolic and bone-density disease'),
      ('d4697783-786e-5afc-ac99-d545cde81643'::uuid, 'Coccyx'),
      ('e52158b0-4ddb-552b-9dce-b71ddb7fa3c3'::uuid, 'Plantar plate'),
      ('ea597c4c-13f3-511e-bee3-092ab8327871'::uuid, 'Joint Disorders'),
      ('f692ed50-dd71-5244-96ec-b0e10e6ca149'::uuid, 'Joint Disorders'),
      ('fd5d6cbd-2888-5147-86a0-a65d0225b08e'::uuid, 'Coracohumeral ligament')
    ) AS want(id, name)
   WHERE NOT EXISTS (SELECT 1 FROM community.tags t
                      WHERE t.id = want.id AND t.name = want.name AND t.retired_at IS NULL);
  IF wrong > 0 THEN
    RAISE EXCEPTION '0064: % tag(s) are not what this migration expects', wrong;
  END IF;
END $$;--> statement-breakpoint

-- New tags. A copy takes its twin's synonyms and scope terms, so it matches what the twin does.
INSERT INTO community.tags (id, name, facet, parent_id, synonyms, scope_terms, sort_order) VALUES
  ('1a72d94d-31f6-5d93-936d-9d7686982801', 'Inguinal region', 'muscle', 'bac26498-aa57-5884-8f37-db7cbe1e8256', '{}', '{}', 90),
  ('be5fd895-b465-562c-a4da-4e446297d821', 'Facet arthropathy', 'pathology', (SELECT parent_id FROM community.tags WHERE id = 'a3746e4b-6e88-5862-8f76-a8736be87148'), '{}', '{}', 90);--> statement-breakpoint
INSERT INTO community.tags (id, name, facet, parent_id, synonyms, scope_terms, sort_order)
SELECT new.id::uuid, new.name, 'muscle', '1a72d94d-31f6-5d93-936d-9d7686982801',
       coalesce(twin.synonyms, '{}'), coalesce(twin.scope_terms, '{}'), new.ord
  FROM (VALUES
    ('947a2f71-47ec-503a-9d50-932c1519c218', 'Iliopsoas', 1),
    ('29b3295c-e1d9-5fb1-b9b5-fe0836b5363c', 'Rectus femoris', 2),
    ('5ca8f4a5-02a9-5877-a50e-ce00064ceb9b', 'Sartorius', 3),
    ('9d7cea31-fbe8-5c46-94a8-6587c9908ed9', 'Tensor fasciae latae', 4),
    ('83188644-d932-5b50-981e-236b519b055e', 'Adductor longus', 5),
    ('b0da77dd-51db-5595-af3b-9b8dbaaf474a', 'Adductor brevis', 6),
    ('df75a47a-6396-51ac-a7ef-44948a9d228a', 'Gracilis', 7),
    ('f1dd6cd1-b44e-5def-81cd-3fca46ce9ae5', 'Pectineus', 8),
    ('3160f684-867f-591b-a827-fd397fb31947', 'Transversus abdominis', 9),
    ('f40ae894-2d3c-523a-9e01-3145bde546d6', 'Internal oblique', 10),
    ('b1260439-e619-501d-880a-2eaf3fe3f2ec', 'External oblique', 11),
    ('0a908c76-b2f5-565e-87b9-938e6fd44815', 'Rectus abdominis', 12)
  ) AS new(id, name, ord)
  LEFT JOIN community.tags twin ON twin.name = new.name AND twin.retired_at IS NULL;--> statement-breakpoint

-- Papers on a new copy: exactly those on its twin. Iliopsoas has no twin, so it starts empty.
INSERT INTO research.article_tags (article_id, tag_id, confidence, matched_in)
SELECT at.article_id, copy.id, at.confidence, at.matched_in
  FROM community.tags copy
  JOIN community.tags twin ON twin.name = copy.name AND twin.id <> copy.id AND twin.retired_at IS NULL
  JOIN research.article_tags at ON at.tag_id = twin.id
 WHERE copy.parent_id = '1a72d94d-31f6-5d93-936d-9d7686982801'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO research.article_tags (article_id, tag_id, confidence, matched_in)
SELECT article_id, '1a72d94d-31f6-5d93-936d-9d7686982801', confidence, matched_in FROM research.article_tags
 WHERE tag_id = '378e1522-1799-5dc1-bcdc-66ae825cd721'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO research.article_tags (article_id, tag_id, confidence, matched_in)
SELECT article_id, 'be5fd895-b465-562c-a4da-4e446297d821', confidence, matched_in FROM research.article_tags
 WHERE tag_id = '9c296aad-e966-584f-a7b1-44e3d5d282ba'
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Joint Disorders: its conditions move up, and it retires with them gone.
UPDATE community.tags c SET parent_id = jd.parent_id
  FROM community.tags jd
 WHERE c.parent_id = jd.id AND c.retired_at IS NULL
   AND jd.id IN ('f692ed50-dd71-5244-96ec-b0e10e6ca149', '0af8cd37-3299-530e-b1c8-5ab7560bcd05', 'ea597c4c-13f3-511e-bee3-092ab8327871');--> statement-breakpoint

UPDATE community.tags
   SET name = 'Ligamentum flavum', synonyms = ARRAY['ligamenta flava']
 WHERE id IN ('aad3b90b-24bc-5d3b-a14e-9eeffa583c4b', '69003518-576c-532f-864d-d167b3202792', '7af35fa3-074d-572e-aa21-5e90088152dc');--> statement-breakpoint

UPDATE community.tags
   SET parent_id = 'c0b540f2-6925-52e4-8b8f-5b8b3bf6ba33',
       synonyms = ARRAY['osteoporosis-related fracture']
 WHERE id = '5bf2582e-4aea-5ebb-a156-35ab6383eb06';--> statement-breakpoint

-- Everything that pointed at a retiring tag moves to its survivor, then the tag retires.
CREATE TEMP TABLE tag_moves (old uuid PRIMARY KEY, keep uuid NOT NULL) ON COMMIT DROP;--> statement-breakpoint
INSERT INTO tag_moves VALUES
  ('7cabc7b7-e826-59dd-8a31-022862574630', '64ac2e36-5171-5f45-9e15-45cb854c112e'),
  ('24c2892f-823d-57d0-b6c3-2d2319657b56', '563c90f5-08f3-5538-9104-92c4e44a0eba'),
  ('fd5d6cbd-2888-5147-86a0-a65d0225b08e', 'bafa9aed-b6f1-5117-94c5-8c6533a4127c'),
  ('7f9ed9bd-3521-50b6-b7b5-8926c221c147', 'ae3708f4-fc8e-530f-82d1-f6c65a141b03'),
  ('825f435c-4ade-5c17-9324-73b950873610', 'e52158b0-4ddb-552b-9dce-b71ddb7fa3c3'),
  ('6948ce81-de97-524e-beab-78d82955f9b0', 'e52158b0-4ddb-552b-9dce-b71ddb7fa3c3'),
  ('6aaf2e04-28e4-55b5-aa48-dc5208f23522', 'e52158b0-4ddb-552b-9dce-b71ddb7fa3c3'),
  ('842b2f76-5fb9-59f6-9cb1-1dd09e24d376', 'd4697783-786e-5afc-ac99-d545cde81643'),
  ('8a4b1f90-ab3d-5ab7-9511-569ec035e1d0', 'a56bf5e0-8345-55c5-8a80-7e9dbb36c6d0'),
  ('206f54c7-70eb-58f7-966e-32cf21982e74', '21574b83-4d6d-5297-a514-ab072cff77b7'),
  ('913be9cb-1088-507b-a152-3f7985865499', '923eb95e-5998-5403-9bad-31c55f3811de'),
  ('0dc054a4-f24b-54be-b5be-8b5fe2a2d03a', '5bf2582e-4aea-5ebb-a156-35ab6383eb06'),
  ('2b25b676-bfd2-594b-b579-cf5c27875bb1', '5bf2582e-4aea-5ebb-a156-35ab6383eb06');--> statement-breakpoint
INSERT INTO tag_moves SELECT id, parent_id FROM community.tags
 WHERE id IN ('f692ed50-dd71-5244-96ec-b0e10e6ca149', '0af8cd37-3299-530e-b1c8-5ab7560bcd05', 'ea597c4c-13f3-511e-bee3-092ab8327871');--> statement-breakpoint
INSERT INTO research.article_tags (article_id, tag_id, confidence, matched_in)
SELECT at.article_id, m.keep, at.confidence, at.matched_in
  FROM research.article_tags at JOIN tag_moves m ON m.old = at.tag_id
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM research.article_tags at USING tag_moves m WHERE at.tag_id = m.old;--> statement-breakpoint
INSERT INTO community.post_tags (post_id, tag_id)
SELECT pt.post_id, m.keep FROM community.post_tags pt JOIN tag_moves m ON m.old = pt.tag_id
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM community.post_tags pt USING tag_moves m WHERE pt.tag_id = m.old;--> statement-breakpoint
INSERT INTO community.member_interests (handle_id, tag_id, weight)
SELECT mi.handle_id, m.keep, mi.weight FROM community.member_interests mi JOIN tag_moves m ON m.old = mi.tag_id
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM community.member_interests mi USING tag_moves m WHERE mi.tag_id = m.old;--> statement-breakpoint
UPDATE community.tags t SET retired_at = now() FROM tag_moves m WHERE t.id = m.old;--> statement-breakpoint

-- The feed's stored count has to follow (0052).
UPDATE research.articles a SET tag_count = c.n
  FROM (SELECT article_id, count(*)::int AS n FROM research.article_tags GROUP BY 1) c
 WHERE c.article_id = a.id AND a.tag_count <> c.n;
