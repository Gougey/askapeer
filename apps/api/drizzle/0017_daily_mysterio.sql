-- One address is one account, whatever casing it was typed in.
--
-- Order matters. The backfill runs first so the index below has nothing to trip on, and
-- so that anyone already stored with mixed case can still sign in: from this release the
-- API lower-cases every email on the way in, and a stored `Ade@x.com` would otherwise no
-- longer be found by its own owner.
--
-- If two rows differ only by case, this UPDATE hits the existing byte-wise unique
-- constraint on `email` and the migration aborts — deliberately. Two accounts for one
-- inbox raises the question of which is real, and that is a decision for a person, not
-- for a release script to make silently. Checked before writing this: zero mixed-case
-- rows and zero collisions on both the live and local databases, so it is a no-op today.
UPDATE "identity"."members" SET "email" = lower("email") WHERE "email" <> lower("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_lower_unique" ON "identity"."members" USING btree (lower("email"));
