CREATE TYPE "community"."follow_target_type" AS ENUM('handle', 'post');--> statement-breakpoint
ALTER TYPE "community"."notification_type" ADD VALUE 'thread_activity';--> statement-breakpoint
CREATE TABLE "community"."follows" (
	"follower_handle_id" uuid NOT NULL,
	"target_type" "community"."follow_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_handle_id_target_type_target_id_pk" PRIMARY KEY("follower_handle_id","target_type","target_id")
);
--> statement-breakpoint
ALTER TABLE "community"."follows" ADD CONSTRAINT "follows_follower_handle_id_handles_id_fk" FOREIGN KEY ("follower_handle_id") REFERENCES "community"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_target_idx" ON "community"."follows" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "follows_follower_idx" ON "community"."follows" USING btree ("follower_handle_id","target_type","created_at");