CREATE TYPE "community"."case_age_band" AS ENUM('child', 'youth', 'adult');--> statement-breakpoint
CREATE TABLE "community"."case_details" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"age_band" "community"."case_age_band" NOT NULL,
	"onset_days" integer NOT NULL,
	"presenting_condition" text NOT NULL,
	"history_presenting_condition" text NOT NULL,
	"objective_findings" text NOT NULL,
	"community_question" text NOT NULL,
	"checklist_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "case_details_onset_days_range" CHECK ("community"."case_details"."onset_days" between 0 and 36500)
);
--> statement-breakpoint
CREATE TABLE "identity"."case_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"attestation_text" text NOT NULL,
	"checklist_snapshot" jsonb NOT NULL,
	"attested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" "inet"
);
--> statement-breakpoint
ALTER TABLE "community"."case_details" ADD CONSTRAINT "case_details_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "community"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."case_attestations" ADD CONSTRAINT "case_attestations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_attestations_post_idx" ON "identity"."case_attestations" USING btree ("post_id","attested_at");--> statement-breakpoint
CREATE INDEX "case_attestations_member_idx" ON "identity"."case_attestations" USING btree ("member_id","attested_at");