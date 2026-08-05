-- Seed the first clinical synonyms on `community.tags.synonyms` (EPIC-C §4).
--
-- `synonyms` has existed and been empty since the taxonomy was seeded. Both search and the
-- research-feed classifier already fold it into matching, so this is a data top-up that
-- improves recall in two places at once with no code change.
--
-- **Every entry here is evidenced, not guessed.** Andrew Renshaw's news-feed criteria were
-- checked against the live corpus, and the gap was overwhelmingly naming rather than
-- coverage — the articles are already ingested, the classifier simply cannot see them
-- because the tag names are not the words clinicians write:
--
--   "anterior cruciate"  211 articles contain it,  17 tagged
--   "low back"            77 articles,              1 tagged
--   "quadriceps"          41 articles,              2 tagged
--   "pelvi(c|s)"          27 articles,              3 tagged
--
-- Only unambiguous mappings are included. Where a term has no clinically honest home in the
-- taxonomy it is left out and flagged for Andrew rather than approximated — a wrong synonym
-- is worse than a missing one, because it silently mis-files content instead of just failing
-- to find it.
--
-- Single-word synonyms are still title-only at match time (the classifier requires a title
-- match for one-word terms), so the multi-word forms are what open up abstract matching.

-- "Anterior cruciate ligament" is exactly what ACL expands to. The tag is scoped to rupture
-- while much of the literature is reconstruction and rehabilitation; for a *feed criterion*
-- — which is what Andrew was describing — that is the right bucket, and it is the only ACL
-- node the taxonomy has. Worth his review if he wants ACL split into injury vs procedure.
UPDATE "community"."tags" SET "synonyms" = ARRAY['anterior cruciate ligament', 'acl injury', 'acl reconstruction']
 WHERE "name" = 'ACL rupture';

-- Nobody writes "lumbar spine" in an abstract about low back pain.
UPDATE "community"."tags" SET "synonyms" = ARRAY['low back pain', 'low back', 'lumbar spine pain']
 WHERE "name" = 'Lumbar Spine';

-- The region prefix is ours, not the literature's: papers say "rotator cuff", never
-- "shoulder rotator cuff". Measured earlier — "Rotator Cuff Augmentation" matched nothing.
UPDATE "community"."tags" SET "synonyms" = ARRAY['rotator cuff']
 WHERE "name" = 'Shoulder Rotator Cuff';

-- "Calf" is the colloquial name for both muscles, and an article about calf strain concerns
-- either. Applied to both rather than picking one.
UPDATE "community"."tags" SET "synonyms" = ARRAY['calf', 'calf muscle', 'calf strain']
 WHERE "name" IN ('Gastrocnemius', 'Soleus');

-- Andrew listed these as feed criteria; the taxonomy holds them only as named pathologies,
-- so the plain muscle-group term finds nothing.
UPDATE "community"."tags" SET "synonyms" = ARRAY['quadriceps', 'quadriceps muscle', 'quadriceps injury']
 WHERE "name" = 'Quadriceps strain';
UPDATE "community"."tags" SET "synonyms" = ARRAY['hamstring', 'hamstring injury', 'hamstrings']
 WHERE "name" = 'Hamstring strain';
UPDATE "community"."tags" SET "synonyms" = ARRAY['adductor', 'adductor injury', 'adductor-related groin pain']
 WHERE "name" = 'Adductor strain';
UPDATE "community"."tags" SET "synonyms" = ARRAY['groin pain', 'groin injury', 'athletic groin']
 WHERE "name" = 'Groin';
UPDATE "community"."tags" SET "synonyms" = ARRAY['abdominal wall', 'abdominal muscle']
 WHERE "name" = 'Abdominal Wall';
UPDATE "community"."tags" SET "synonyms" = ARRAY['osteochondral', 'osteochondral defect', 'osteochondritis dissecans']
 WHERE "name" = 'Osteochondral lesion';

-- NOT MAPPED, deliberately: **Pelvis**. Andrew listed it as a criterion and the taxonomy has
-- no pelvis region — the nearest node is `Sacroiliac joint dysfunction`, which is a specific
-- condition and not the same thing. 27 articles in the corpus mention the pelvis and have
-- nowhere to go. This needs a taxonomy decision from him, not a synonym from us.
