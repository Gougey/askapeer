CREATE TYPE "identity"."identity_access_reason" AS ENUM('reported_violation', 'legal_request', 'safety_escalation');--> statement-breakpoint
CREATE TABLE "identity"."identity_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"handle_id" uuid NOT NULL,
	"accessed_by" uuid NOT NULL,
	"reason_code" "identity"."identity_access_reason" NOT NULL,
	"reason_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."identity_access_log" ADD CONSTRAINT "identity_access_log_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."identity_access_log" ADD CONSTRAINT "identity_access_log_accessed_by_members_id_fk" FOREIGN KEY ("accessed_by") REFERENCES "identity"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_access_log_member_idx" ON "identity"."identity_access_log" USING btree ("member_id","created_at");