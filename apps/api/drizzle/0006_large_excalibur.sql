CREATE TYPE "community"."report_category" AS ENUM('identifiable_patient_information', 'anonymity_violation', 'harassment', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "community"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "community"."report_target_type" AS ENUM('post', 'comment', 'handle');--> statement-breakpoint
CREATE TABLE "community"."reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_handle_id" uuid NOT NULL,
	"target_type" "community"."report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"category" "community"."report_category" NOT NULL,
	"comment" text,
	"priority" boolean GENERATED ALWAYS AS (category in ('identifiable_patient_information', 'anonymity_violation')) STORED,
	"status" "community"."report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community"."reports" ADD CONSTRAINT "reports_reporter_handle_id_handles_id_fk" FOREIGN KEY ("reporter_handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_queue_idx" ON "community"."reports" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "community"."reports" USING btree ("target_type","target_id");