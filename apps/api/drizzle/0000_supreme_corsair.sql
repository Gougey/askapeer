CREATE SCHEMA "config";
--> statement-breakpoint
CREATE TABLE "config"."app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
