CREATE TYPE "identity"."evidence_outcome" AS ENUM('pass', 'fail', 'needs_review');--> statement-breakpoint
CREATE TYPE "identity"."evidence_type" AS ENUM('register_lookup', 'onfido_check', 'manual_document');--> statement-breakpoint
CREATE TYPE "identity"."identity_check_state" AS ENUM('awaiting_capture', 'complete', 'timed_out');--> statement-breakpoint
CREATE TABLE "identity"."identity_check_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"state" "identity"."identity_check_state" DEFAULT 'awaiting_capture' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_check_sessions_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
CREATE TABLE "identity"."reapplication_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matched_member_id" uuid NOT NULL,
	"attempted_legal_name" text NOT NULL,
	"attempted_email" text NOT NULL,
	"professional_body" "identity"."professional_body" NOT NULL,
	"registration_number" text NOT NULL,
	"registration_country" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."verification_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"decided_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."verification_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"evidence_type" "identity"."evidence_type" NOT NULL,
	"source" text NOT NULL,
	"raw_result" jsonb NOT NULL,
	"outcome" "identity"."evidence_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."members" ADD COLUMN "needs_more_info_reason" text;--> statement-breakpoint
ALTER TABLE "identity"."identity_check_sessions" ADD CONSTRAINT "identity_check_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."reapplication_attempts" ADD CONSTRAINT "reapplication_attempts_matched_member_id_members_id_fk" FOREIGN KEY ("matched_member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."verification_decisions" ADD CONSTRAINT "verification_decisions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."verification_evidence" ADD CONSTRAINT "verification_evidence_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_check_sessions_member_idx" ON "identity"."identity_check_sessions" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_decisions_member_idx" ON "identity"."verification_decisions" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_evidence_member_idx" ON "identity"."verification_evidence" USING btree ("member_id","created_at");