-- Give the kudos notifications written before 0057 a kind (Adrian, 20 October 2026).
--
-- A `kudos_received` row written before kudos became Insightful and Useful has no `kind`, so
-- Activity drew it with the retired gold star and the words "received kudos" — the one place
-- the old single kudos was still on screen. There is no way to recover which award a notice
-- was about, and every row is test data, so each is assigned a kind at random, exactly as 0057
-- split the kudos themselves. The screen's fallback for a row with no kind stays, for safety,
-- but no row needs it after this.
UPDATE "community"."notifications"
   SET "payload" = "payload" || jsonb_build_object('kind', CASE WHEN random() < 0.5 THEN 'insightful' ELSE 'useful' END)
 WHERE "type" = 'kudos_received'
   AND NOT ("payload" ? 'kind');
