-- The closed pilot: who may register (Andrew's colleagues, October 2026).
--
-- ⚠️ **Until this, live registration was open to anyone with the URL.** Verification is still
-- simulated (`VERIFICATION_SIMULATE=true`), and the stand-in identity screen offers "clear" as
-- a button, so an applicant could approve themselves. For a pilot with real clinicians this
-- table is the access control, not a convenience.
--
-- An email on the list is **approved on registration**, with a decision row saying why
-- (`AuthService.register`). Andrew vouching for a colleague stands in for the register lookup
-- and identity check, and real clinicians never see the simulated identity screen. Anyone else
-- is refused with a closed-pilot message. The administrators in `ADMIN_EMAILS` are always
-- admitted, so the founders cannot be locked out by a list that has not been imported yet.
--
-- ⚠️ **Never commit the list.** The repo is public and these are colleagues' email addresses.
-- It is loaded on the API machine with `node dist/cli/pilot.js allowlist add …`.
CREATE TABLE "config"."pilot_allowlist" (
	"email" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilot_allowlist_email_lower" CHECK ("email" = lower(btrim("email")))
);--> statement-breakpoint
-- On from the moment this deploys: live closes to strangers before the list is imported, which
-- is the safe order. Turning it off (`false`) restores the ordinary verification pipeline.
INSERT INTO "config"."settings" ("key", "value", "description") VALUES
	('access.pilot_allowlist_active', 'true', 'When true, only emails on config.pilot_allowlist (and ADMIN_EMAILS) may register, and they are approved on registration. The closed-pilot gate.')
ON CONFLICT DO NOTHING;
