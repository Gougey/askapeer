CREATE SCHEMA "community";
--> statement-breakpoint
CREATE TYPE "community"."handle_status" AS ENUM('active', 'suspended', 'expelled');--> statement-breakpoint
CREATE TYPE "config"."blocklist_match_mode" AS ENUM('exact', 'contains');--> statement-breakpoint
CREATE TABLE "community"."handle_name_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_id" uuid NOT NULL,
	"previous_name" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."handles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"handle_name" text NOT NULL,
	"kudos_total" integer DEFAULT 0 NOT NULL,
	"member_since" date DEFAULT now() NOT NULL,
	"status" "community"."handle_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handles_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "config"."handle_blocklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"match_mode" "config"."blocklist_match_mode" DEFAULT 'contains' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community"."handle_name_history" ADD CONSTRAINT "handle_name_history_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."handles" ADD CONSTRAINT "handles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "identity"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "handles_name_lower_unique" ON "community"."handles" USING btree (lower("handle_name"));--> statement-breakpoint
CREATE UNIQUE INDEX "handle_blocklist_term_unique" ON "config"."handle_blocklist" USING btree (lower("term"));--> statement-breakpoint
-- Seed: handle-name blocklist (EPIC-B §3). Role-impersonation terms are `contains` —
-- they must be caught anywhere in a name. `exact` is used where a substring rule would
-- produce false positives against ordinary words. This is a starting set only; the list
-- is admin-curated from here on (EPIC-J, screen G9).
INSERT INTO "config"."handle_blocklist" ("term", "match_mode", "reason") VALUES
	('admin', 'contains', 'impersonates a platform role'),
	('administrator', 'contains', 'impersonates a platform role'),
	('moderator', 'contains', 'impersonates a platform role'),
	('askapeer', 'contains', 'impersonates the platform'),
	('support', 'contains', 'impersonates a platform role'),
	('helpdesk', 'contains', 'impersonates a platform role'),
	('official', 'contains', 'implies platform endorsement'),
	('mod', 'exact', 'impersonates a platform role; substring match would reject ordinary words'),
	('staff', 'exact', 'impersonates a platform role'),
	('team', 'exact', 'impersonates a platform role'),
	('fuck', 'contains', 'profanity'),
	('shit', 'contains', 'profanity'),
	('cunt', 'contains', 'profanity'),
	('wank', 'contains', 'profanity')
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Seed: platform settings (EPIC-J §4). The paywall starts off — the PRD's free seed
-- period (§11) runs before it flips, so the billing gate is inactive until then (G-15).
INSERT INTO "config"."settings" ("key", "value", "description") VALUES
	('billing.paywall_active', 'false', 'When true, the billing gate is enforced. Off during the free seed period (PRD §11, gap G-15).')
ON CONFLICT DO NOTHING;
