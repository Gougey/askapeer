CREATE TABLE "community"."member_interests" (
	"handle_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_interests_handle_id_tag_id_pk" PRIMARY KEY("handle_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "community"."member_interests" ADD CONSTRAINT "member_interests_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "community"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."member_interests" ADD CONSTRAINT "member_interests_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "community"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_interests_handle_idx" ON "community"."member_interests" USING btree ("handle_id");