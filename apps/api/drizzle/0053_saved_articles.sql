-- A member's private list of articles to come back to (design doc 2026-10-09).
--
-- Andrew asked for "email this article to me"; he and Adrian settled on a list in the app
-- instead. Email is write-only — you cannot see what you sent yourself or change your mind —
-- and every click would be an outbound send against a sender reputation that had to be
-- repaired on 7 October.
--
-- ⚠️ **Not `community.follows`, despite the resemblance.** That table is already polymorphic
-- and adding an `article` target looks like a one-line change. It is the wrong table: `follows`
-- means *tell me when this changes* — it feeds `thread_activity` notifications and is what
-- unfollow mutes — while saving means *I want to read this again*, with no notification
-- semantics at all. Sharing one table would put an exclusion clause in every follow query and
-- let the two meanings drift under one name. It also cannot carry a foreign key, because its
-- `target_id` points at two different tables.
--
-- Keyed by **handle**, like `member_interests` and `feed_preferences`: everything member-facing
-- here is handle-scoped, and it means a moderator-forced rename carries the list with it.
--
-- ⚠️ **No snapshot of the article, decided knowingly.** A DOI column was considered and
-- declined. Nothing deletes articles today — ingestion only inserts and merges — so the
-- cascade below is a backstop rather than a path we expect to take. The accepted exposure: if
-- a cleanup is ever written it will empty members' lists silently, and a DOI added later could
-- only cover saves made after it.
CREATE TABLE IF NOT EXISTS "research"."saved_articles" (
  "handle_id" uuid NOT NULL
    REFERENCES "community"."handles"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL
    REFERENCES "research"."articles"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  -- The primary key *is* the uniqueness rule, so saving twice is idempotent and the API need
  -- never ask whether something was already saved.
  CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("handle_id", "article_id")
);--> statement-breakpoint

-- "What have I saved", newest first — the only query the list screen makes, and the count in
-- the My Research header, which runs on every render of that page.
CREATE INDEX IF NOT EXISTS "saved_articles_mine_idx"
  ON "research"."saved_articles" ("handle_id", "created_at" DESC);
