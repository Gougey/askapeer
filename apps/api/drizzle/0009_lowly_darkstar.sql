ALTER TABLE "community"."tags" DROP CONSTRAINT "tags_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "tags_parent_name_unique" ON "community"."tags" USING btree ("parent_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_root_name_unique" ON "community"."tags" USING btree (lower("name")) WHERE "community"."tags"."parent_id" is null;