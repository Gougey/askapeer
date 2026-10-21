-- Insightful and Useful are for answers only (Adrian and Andrew, 21 October 2026).
--
-- The awards say whether something helped you, which is what an answer does; the signal for
-- a good question is Follow — "I want to know this too" — which the card already counts. So
-- the awards come off questions and case posts, their routes are gone, and every member's
-- totals are recomputed from the answers alone, which also makes the grey totals beside a
-- handle a measure of how helpful that member's answers have been.
--
-- Every row removed here is test data, and the pilot clear-down would remove it anyway.
DELETE FROM "community"."kudos" WHERE "target_type" = 'post';--> statement-breakpoint
-- "Your question was marked Insightful" would now describe something that cannot happen.
DELETE FROM "community"."notifications"
 WHERE "type" = 'kudos_received' AND "payload"->>'targetType' = 'post';--> statement-breakpoint
-- Recomputed from the remaining rows, exactly as 0057 did: answers only now.
UPDATE "community"."handles" SET "insightful_total" = 0, "useful_total" = 0;--> statement-breakpoint
WITH totals AS (
  SELECT c.handle_id,
         count(*) FILTER (WHERE k.kind = 'insightful')::int AS insightful,
         count(*) FILTER (WHERE k.kind = 'useful')::int AS useful
    FROM "community"."kudos" k
    JOIN "community"."comments" c ON k.target_type = 'comment' AND c.id = k.target_id
   GROUP BY c.handle_id
)
UPDATE "community"."handles" h
   SET "insightful_total" = t.insightful, "useful_total" = t.useful
  FROM totals t WHERE t.handle_id = h.id;
