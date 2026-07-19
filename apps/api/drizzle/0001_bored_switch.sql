CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TYPE "identity"."professional_body" AS ENUM('hcpc', 'gmc', 'basrat', 'sst');--> statement-breakpoint
CREATE TYPE "identity"."verification_status" AS ENUM('pending', 'needs_more_info', 'approved_verified', 'rejected', 'suspended', 'expelled');--> statement-breakpoint
CREATE TABLE "identity"."magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"email" text NOT NULL,
	"professional_body" "identity"."professional_body" NOT NULL,
	"registration_number" text NOT NULL,
	"registration_country" text DEFAULT 'UK' NOT NULL,
	"verification_status" "identity"."verification_status" DEFAULT 'pending' NOT NULL,
	"status_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anonymity_acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "identity"."refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."magic_links" ADD CONSTRAINT "magic_links_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_registration_unique" ON "identity"."members" USING btree ("professional_body","registration_number","registration_country") WHERE "identity"."members"."verification_status" <> 'rejected';