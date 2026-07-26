CREATE TYPE "community"."moderation_action_type" AS ENUM('remove_content', 'warn', 'suspend', 'expel', 'request_correction', 'rename_handle');--> statement-breakpoint
CREATE TABLE "community"."moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"target_handle_id" uuid NOT NULL,
	"action_type" "community"."moderation_action_type" NOT NULL,
	"moderator_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community"."moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "community"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."moderation_actions" ADD CONSTRAINT "moderation_actions_target_handle_id_handles_id_fk" FOREIGN KEY ("target_handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_members_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "identity"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "community"."moderation_actions" USING btree ("target_handle_id","created_at");