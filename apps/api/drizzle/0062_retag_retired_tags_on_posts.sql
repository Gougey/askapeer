-- Moves discussions off retired tags, ahead of Andrew retesting search (November 2026).
--
-- Adrian searched "ACL", saw two discussions tagged Knee Joint, added "Knee joints" in the picker
-- and got nothing. Knee Joint is retired, so the picker cannot offer it; "Knee joints" is a
-- different, live tag. Search was right, and the screen could not show why.
--
-- Normally a post keeps a retired tag (DEVELOPMENT.md, the taxonomy checklist, step 3). This is
-- a one-off, because every row here is test data the pilot clear-down would remove anyway. Each
-- tag goes to its live parent rather than simply being deleted, since removing them would have
-- taken a search for "knee" from 11 discussions to 5 and left 10 posts with no tags.
-- Nerve (elbow) has no sensible parent and is only removed.
DO $$
DECLARE
  missing int;
  stale int;
BEGIN
  SELECT count(*) INTO missing
    FROM (VALUES ('Knee', 'Lower Limb MSK conditions'),
                 ('Shoulder', 'Upper Limb MSK conditions'),
                 ('Rotator Cuff', 'Shoulder')) AS want(name, parent)
   WHERE (SELECT count(*) FROM community.tags t JOIN community.tags p ON p.id = t.parent_id
           WHERE t.name = want.name AND p.name = want.parent AND t.retired_at IS NULL) <> 1;
  IF missing > 0 THEN
    RAISE EXCEPTION '0062: % target tag(s) are not exactly one live tag', missing;
  END IF;

  -- 20 rows when this was written. Many more would mean real members' posts, which this
  -- migration was not written for.
  SELECT count(*) INTO stale
    FROM community.post_tags pt JOIN community.tags t ON t.id = pt.tag_id
   WHERE t.retired_at IS NOT NULL;
  IF stale > 100 THEN
    RAISE EXCEPTION '0062: % post_tags rows on retired tags, expected about 20', stale;
  END IF;
END $$;--> statement-breakpoint
INSERT INTO community.post_tags (post_id, tag_id)
SELECT DISTINCT pt.post_id, live.id
  FROM (VALUES ('Knee Joint', 'Knee', 'Lower Limb MSK conditions'),
               ('Knee Cartilage', 'Knee', 'Lower Limb MSK conditions'),
               ('Knee Ligaments', 'Knee', 'Lower Limb MSK conditions'),
               ('Knee Other', 'Knee', 'Lower Limb MSK conditions'),
               ('Knee Tendons', 'Knee', 'Lower Limb MSK conditions'),
               ('Shoulder Joint Disorders', 'Shoulder', 'Upper Limb MSK conditions'),
               ('Shoulder Rotator Cuff', 'Rotator Cuff', 'Shoulder')) AS map(retired, target, parent)
  JOIN community.tags old ON old.name = map.retired AND old.retired_at IS NOT NULL
  JOIN community.post_tags pt ON pt.tag_id = old.id
  JOIN community.tags par ON par.name = map.parent
  JOIN community.tags live ON live.name = map.target AND live.parent_id = par.id AND live.retired_at IS NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM community.post_tags pt
 USING community.tags t
 WHERE t.id = pt.tag_id AND t.retired_at IS NOT NULL;
