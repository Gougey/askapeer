-- A qualified name does nothing while an unqualified synonym remains on the tag.
--
-- 0038 renamed three copies of "Stress fracture" and three of "Myofascial pain syndrome" to
-- name their region, on Andrew's instruction that both are qualified by where they are. The
-- reclassify afterwards showed the rename had changed nothing at all: all three myofascial
-- tags still matched **the same 45 articles**, and all three stress-fracture tags the same 27.
--
-- The names were not the only thing making them identical. Each copy also carried the same
-- unqualified synonyms — `myofascial pain`, `myofascial`, `trigger point`, `fatigue fracture`,
-- `stress injury` — seeded before the region split, and a tag matches on its name *or any
-- synonym*. So `Cervical myofascial pain syndrome` went on matching a paper about myofascial
-- release for rotator cuff tears, because "myofascial pain" appeared in it and that was
-- enough. The synonym had quietly become the duplicate the name used to be.
--
-- Every synonym here now names its region too. Where a bare term was the only thing a synonym
-- added, it is replaced by the lay form of the same region — "neck trigger point", "low back
-- myofascial pain" — which earns its place, rather than by a qualified restatement of the
-- name, which would not.
--
-- Terms that are already region-specific keep their bare form on purpose: a rib is thoracic
-- and the radius and ulna are the forearm, so `rib stress fracture` and `radial stress
-- fracture` cannot pull a paper into the wrong region.
--
-- Run a reclassify after deploying.

DO $$
DECLARE wrong int;
BEGIN
  SELECT count(*) INTO wrong FROM (VALUES
    ('adc209e2-4f21-5071-9314-811e7d4e35e4'::uuid, 'Cervical stress fracture'),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8'::uuid, 'Thoracic stress fracture'),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8'::uuid, 'Forearm stress fracture'),
    ('1b011753-51fe-588f-8838-e72b073789e8'::uuid, 'Cervical myofascial pain syndrome'),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d'::uuid, 'Thoracic myofascial pain syndrome'),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9'::uuid, 'Lumbar myofascial pain syndrome')
  ) AS expected(id, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "community"."tags" t WHERE t.id = expected.id AND t.name = expected.name
  );
  IF wrong > 0 THEN
    RAISE EXCEPTION 'clinical taxonomy has moved since 0039 was written: % of 6 tags are not where expected', wrong;
  END IF;
END $$;--> statement-breakpoint

-- Replaced wholesale rather than merged: the point is to remove the unqualified terms, and a
-- union would keep every one of them.
UPDATE "community"."tags" t
   SET "synonyms" = v.synonyms
  FROM (VALUES
    ('adc209e2-4f21-5071-9314-811e7d4e35e4'::uuid,
      ARRAY['cervical vertebral stress fracture', 'cervical fatigue fracture',
            'cervical stress injury', 'cervical spine stress injury']::text[]),
    ('7ebbd2e0-07f0-5024-9d25-1ee3e628f8e8',
      ARRAY['thoracic vertebral stress fracture', 'thoracic fatigue fracture',
            'thoracic stress injury', 'rib stress fracture']),
    ('b9ebae4c-7390-5849-a18f-f7765aadc9d8',
      ARRAY['forearm fatigue fracture', 'forearm stress injury',
            'radial stress fracture', 'ulnar stress fracture']),
    ('1b011753-51fe-588f-8838-e72b073789e8',
      ARRAY['cervical trigger point', 'neck trigger point', 'neck myofascial pain']),
    ('e77534b8-4003-505b-8fa8-bec316e68b7d',
      ARRAY['thoracic trigger point', 'mid-back myofascial pain']),
    ('c9c06e09-2f90-5155-9e45-64fd6bd016e9',
      ARRAY['lumbar trigger point', 'low back trigger point', 'low back myofascial pain'])
  ) AS v(id, synonyms)
 WHERE t."id" = v.id;--> statement-breakpoint
