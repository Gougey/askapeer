CREATE TYPE "community"."kudos_target_type" AS ENUM('post', 'comment');--> statement-breakpoint
CREATE TABLE "community"."kudos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "community"."kudos_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"given_by_handle_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community"."kudos" ADD CONSTRAINT "kudos_given_by_handle_id_handles_id_fk" FOREIGN KEY ("given_by_handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kudos_one_per_handle_unique" ON "community"."kudos" USING btree ("target_type","target_id","given_by_handle_id");--> statement-breakpoint
CREATE INDEX "kudos_target_idx" ON "community"."kudos" USING btree ("target_type","target_id");