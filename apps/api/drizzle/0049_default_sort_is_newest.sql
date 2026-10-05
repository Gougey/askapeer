-- The cleared-panel baseline is "newest first" (Adrian, 2026-10-05).
--
-- 0048 moved this column's vocabulary from 'for_you' to 'recommended' and left 'recommended'
-- as the default. Pressing Clear now returns the panel to blank keyword / any type / any time
-- / **newest first**, and a column default that disagrees with the baseline the member is
-- shown is the kind of quiet inconsistency that surfaces years later as a bug nobody can
-- explain. The service always supplies a sort, so this never fires in practice — which is
-- exactly why it should be right rather than left to rot.
ALTER TABLE "community"."feed_preferences" ALTER COLUMN "sort" SET DEFAULT 'newest';
