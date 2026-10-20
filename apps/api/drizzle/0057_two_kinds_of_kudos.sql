-- Kudos becomes two awards: Insightful and Useful (Adrian and Andrew, 20 October 2026).
--
-- A single star said "this was good" without saying how. The two awards are independent:
-- either, both or neither may be given to a question or an answer, by anyone but its author,
-- so one handle can now hold two kudos rows for the same target — one of each kind.
--
-- **Existing kudos are split at random between the two kinds.** Every kudos row on live is
-- test data (the founders' and the seeded demo's), and none can be told apart after the fact.
-- A random split makes the screens show realistic mixed numbers until the pilot clear-down
-- empties them anyway (Adrian, 20 October).
--
-- **`handles.kudos_total` becomes the sum of the two, computed by Postgres.** It is still read
-- everywhere it was — answer ranking (by the combined score, as agreed), the leaderboard, the
-- profile — and a generated column cannot drift from its parts. The code now writes the two
-- per-kind totals instead; Drizzle's types make a write to the generated column a compile
-- error, which is what found every place that used to write it.
CREATE TYPE "community"."kudos_kind" AS ENUM('insightful', 'useful');--> statement-breakpoint
ALTER TABLE "community"."kudos" ADD COLUMN "kind" "community"."kudos_kind";--> statement-breakpoint
UPDATE "community"."kudos"
   SET "kind" = CASE WHEN random() < 0.5 THEN 'insightful'::"community"."kudos_kind" ELSE 'useful'::"community"."kudos_kind" END;--> statement-breakpoint
ALTER TABLE "community"."kudos" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
-- One of each kind per handle per target, where it used to be one in all.
DROP INDEX "community"."kudos_one_per_handle_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "kudos_one_per_handle_kind_unique" ON "community"."kudos" USING btree ("target_type","target_id","given_by_handle_id","kind");--> statement-breakpoint
ALTER TABLE "community"."handles" ADD COLUMN "insightful_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "community"."handles" ADD COLUMN "useful_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Recomputed from the rows rather than split from the old total, so each part is exactly what
-- the rows say. Content the author deleted themselves still counts — self-deletion has never
-- clawed kudos back — and content a moderator removed has no rows left to count.
WITH authored AS (
  SELECT k.kind, p.handle_id FROM "community"."kudos" k
    JOIN "community"."posts" p ON k.target_type = 'post' AND p.id = k.target_id
  UNION ALL
  SELECT k.kind, c.handle_id FROM "community"."kudos" k
    JOIN "community"."comments" c ON k.target_type = 'comment' AND c.id = k.target_id
), totals AS (
  SELECT handle_id,
         count(*) FILTER (WHERE kind = 'insightful')::int AS insightful,
         count(*) FILTER (WHERE kind = 'useful')::int AS useful
    FROM authored GROUP BY handle_id
)
UPDATE "community"."handles" h
   SET "insightful_total" = t.insightful, "useful_total" = t.useful
  FROM totals t WHERE t.handle_id = h.id;--> statement-breakpoint
ALTER TABLE "community"."handles" DROP COLUMN "kudos_total";--> statement-breakpoint
ALTER TABLE "community"."handles" ADD COLUMN "kudos_total" integer GENERATED ALWAYS AS ("insightful_total" + "useful_total") STORED NOT NULL;
