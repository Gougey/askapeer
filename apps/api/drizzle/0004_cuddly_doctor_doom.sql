CREATE TYPE "community"."comment_status" AS ENUM('published', 'removed');--> statement-breakpoint
CREATE TYPE "community"."post_status" AS ENUM('published', 'removed', 'draft', 'needs_correction');--> statement-breakpoint
CREATE TYPE "community"."post_type" AS ENUM('question', 'case_discussion');--> statement-breakpoint
CREATE TYPE "community"."tag_facet" AS ENUM('region', 'muscle', 'structure', 'pathology');--> statement-breakpoint
CREATE TABLE "community"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "community"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"handle_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"body" text NOT NULL,
	"status" "community"."comment_status" DEFAULT 'published' NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(body, '')), 'D')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "community"."post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "community"."posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"type" "community"."post_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" "community"."post_status" DEFAULT 'published' NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body, '')), 'B')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "community"."tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"facet" "community"."tag_facet" NOT NULL,
	"parent_id" uuid,
	"synonyms" text[] DEFAULT '{}'::text[] NOT NULL,
	"mesh_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "community"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "community"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "community"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "community"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "community"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "community"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "community"."comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_tsv_idx" ON "community"."comments" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "post_tags_tag_idx" ON "community"."post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "posts_tsv_idx" ON "community"."posts" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "community"."posts" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "posts_category_idx" ON "community"."posts" USING btree ("category_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_handle_idx" ON "community"."posts" USING btree ("handle_id","created_at");--> statement-breakpoint
CREATE INDEX "tags_facet_idx" ON "community"."tags" USING btree ("facet","sort_order");--> statement-breakpoint
-- Seed: content-type categories (EPIC-C §3). Content type, NOT body area — body areas
-- are tags. Working set; admin-managed from here (EPIC-J, screen G7).
INSERT INTO "community"."categories" ("name", "description", "sort_order") VALUES
	('Clinical Case', 'A de-identified patient case for discussion', 10),
	('Research', 'Papers, evidence and appraisal', 20),
	('Career', 'Training, progression and working life', 30),
	('Equipment', 'Kit, devices and product experience', 40),
	('General', 'Anything else', 50)
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Seed: the unified clinical tag vocabulary, exactly as agreed with Andrew Renshaw
-- (docs/2026-07-17-taxonomy-standards-research.md, "Agreed seed vocabulary").
-- Upper limb / Lower limb are grouping parents, inserted first so the regions below can
-- reference them by name. Andrew's fuller muscle list is still to come — it extends this
-- same table via EPIC-J, no migration needed.
INSERT INTO "community"."tags" ("name", "facet", "sort_order") VALUES
	('Upper limb', 'region', 100),
	('Lower limb', 'region', 200)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "community"."tags" ("name", "facet", "parent_id", "synonyms", "sort_order")
SELECT v.name, v.facet::"community"."tag_facet", p.id, v.synonyms, v.sort_order
FROM (VALUES
	('Head and neck',   'region',    NULL,         ARRAY['cervical spine'],             10),
	('Chest',           'region',    NULL,         ARRAY[]::text[],                     20),
	('Thoracic spine',  'region',    NULL,         ARRAY[]::text[],                     30),
	('Lumbar spine',    'region',    NULL,         ARRAY['low back'],                   40),
	('Abdomen',         'region',    NULL,         ARRAY['abdominal'],                  50),
	('Pelvis',          'region',    NULL,         ARRAY[]::text[],                     60),
	('Groin',           'region',    NULL,         ARRAY[]::text[],                     70),
	('Shoulder',        'region',    'Upper limb', ARRAY[]::text[],                    110),
	('Upper arm',       'region',    'Upper limb', ARRAY[]::text[],                    120),
	('Elbow',           'region',    'Upper limb', ARRAY[]::text[],                    130),
	('Forearm',         'region',    'Upper limb', ARRAY['lower arm'],                 140),
	('Wrist/hand',      'region',    'Upper limb', ARRAY['wrist','hand'],              150),
	('Hip',             'region',    'Lower limb', ARRAY[]::text[],                    210),
	('Thigh',           'region',    'Lower limb', ARRAY[]::text[],                    220),
	('Knee',            'region',    'Lower limb', ARRAY[]::text[],                    230),
	('Lower leg',       'region',    'Lower limb', ARRAY['shin'],                      240),
	('Ankle',           'region',    'Lower limb', ARRAY[]::text[],                    250),
	('Foot',            'region',    'Lower limb', ARRAY[]::text[],                    260),
	('Hamstring',       'muscle',    NULL,         ARRAY[]::text[],                    310),
	('Quadriceps',      'muscle',    NULL,         ARRAY['quads'],                     320),
	('Adductor',        'muscle',    NULL,         ARRAY[]::text[],                    330),
	('Calf',            'muscle',    NULL,         ARRAY['gastrocnemius','soleus'],    340),
	('Anterior cruciate ligament', 'structure', NULL, ARRAY['ACL'],                    410),
	('Achilles',        'structure', NULL,         ARRAY['achilles tendon'],           420),
	('Tendinopathy',    'pathology', NULL,         ARRAY['tendinitis','tendonitis'],   510),
	('Osteochondral',   'pathology', NULL,         ARRAY[]::text[],                    520)
) AS v(name, facet, parent_name, synonyms, sort_order)
LEFT JOIN "community"."tags" p ON p.name = v.parent_name
ON CONFLICT DO NOTHING;
