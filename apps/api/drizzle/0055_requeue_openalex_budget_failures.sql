-- Put back the OpenAlex backfill slices that a metered budget wrote off (2026-10-15 to 17).
--
-- OpenAlex began metering its API: without a key, every request shares a $0.10/day budget with
-- the whole IP address, and on Fly that IP is shared. Once it was spent each request was a 401,
-- which the backfill treated as a permanent fault, so 174 slices (2010-2025) were marked failed.
-- `OPENALEX_API_KEY` now gives us our own budget, and a 401 now rests the source instead
-- (`restUntilBudgetResets`). This undoes the damage already done.
--
-- Only 401s, so a genuine fault stays written off. `page_cursor` is kept, so each slice resumes
-- from the page it reached instead of starting its year again. Live only: no local database
-- holds these rows, and the statement is a no-op there.
UPDATE "research"."backfill_slices"
   SET "status" = 'pending', "last_error" = NULL, "updated_at" = now()
 WHERE "source_name" = 'open-alex'
   AND "status" = 'failed'
   AND "last_error" LIKE 'OpenAlex HTTP 401%';
