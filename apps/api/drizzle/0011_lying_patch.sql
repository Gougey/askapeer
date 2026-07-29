CREATE TYPE "community"."notification_type" AS ENUM('reply', 'mention', 'kudos_received', 'verification_status_change', 'weekly_digest');--> statement-breakpoint
CREATE TABLE "community"."notification_preferences" (
	"handle_id" uuid NOT NULL,
	"type" "community"."notification_type" NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "notification_preferences_handle_id_type_pk" PRIMARY KEY("handle_id","type"),
	CONSTRAINT "notification_preferences_verification_email_locked" CHECK (not (type = 'verification_status_change' and email_enabled = false))
);
--> statement-breakpoint
CREATE TABLE "community"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_id" uuid NOT NULL,
	"type" "community"."notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community"."notification_preferences" ADD CONSTRAINT "notification_preferences_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."notifications" ADD CONSTRAINT "notifications_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_handle_idx" ON "community"."notifications" USING btree ("handle_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "community"."notifications" USING btree ("handle_id") WHERE read_at is null;