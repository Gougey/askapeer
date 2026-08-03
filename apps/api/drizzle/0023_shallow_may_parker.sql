ALTER TABLE "identity"."magic_links" ADD COLUMN "code_hash" text;--> statement-breakpoint
ALTER TABLE "identity"."magic_links" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;