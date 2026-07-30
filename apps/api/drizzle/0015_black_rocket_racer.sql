CREATE TYPE "identity"."email_suppression_kind" AS ENUM('hard_bounce', 'spam_complaint', 'manual');--> statement-breakpoint
CREATE TABLE "identity"."email_suppressions" (
	"email" text PRIMARY KEY NOT NULL,
	"kind" "identity"."email_suppression_kind" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "email_suppressions_active_idx" ON "identity"."email_suppressions" USING btree ("created_at") WHERE cleared_at is null;