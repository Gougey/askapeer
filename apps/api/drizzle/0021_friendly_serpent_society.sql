CREATE SCHEMA "research";
--> statement-breakpoint
CREATE TYPE "research"."evidence_type" AS ENUM('systematic_review', 'randomised_trial', 'cohort_study', 'case_report', 'other');--> statement-breakpoint
CREATE TABLE "research"."article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"matched_in" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "research"."articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doi" text,
	"pmid" text,
	"other_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"journal" text,
	"published_date" timestamp with time zone,
	"published_year" integer,
	"evidence_type" "research"."evidence_type" DEFAULT 'other' NOT NULL,
	"open_access" boolean DEFAULT false NOT NULL,
	"url" text,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intrinsic_score" real DEFAULT 0 NOT NULL,
	"retracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research"."ingestion_cursors" (
	"source_name" text PRIMARY KEY NOT NULL,
	"last_cursor" text,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"articles_seen" integer DEFAULT 0 NOT NULL,
	"articles_stored" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research"."article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "research"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research"."article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "community"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_tags_tag_idx" ON "research"."article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_doi_key" ON "research"."articles" USING btree ("doi") WHERE "research"."articles"."doi" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_pmid_key" ON "research"."articles" USING btree ("pmid") WHERE "research"."articles"."pmid" is not null;--> statement-breakpoint
CREATE INDEX "articles_rank_idx" ON "research"."articles" USING btree ("published_date" DESC NULLS LAST,"intrinsic_score" DESC NULLS LAST);