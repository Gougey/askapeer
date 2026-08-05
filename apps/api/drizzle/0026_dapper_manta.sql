CREATE TABLE "config"."admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_member_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "config"."admin_audit_log" USING btree ("created_at" DESC NULLS LAST);