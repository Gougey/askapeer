-- Backfill a follow row for every post and comment already authored (S15 §4).
--
-- **This is what makes the slice additive rather than a behaviour change.** Recipient
-- resolution now consults `community.follows`: a direct `reply` reaches its recipient only
-- if they still follow the thread. Without this backfill, every member who posted or
-- answered before the feature shipped would follow nothing, and every existing thread would
-- go silent overnight — the opposite of the intended effect.
--
-- With it, everyone is subscribed to exactly what they have already written, which
-- reproduces today's notifications precisely, and the only changes are additive: the two
-- new `thread_activity` cases, and a mute control that did not exist before.
--
-- `created_at` is taken from the authored content rather than defaulting to now(), so the
-- Activity › Following pane's newest-first ordering reflects when someone actually joined a
-- discussion. Defaulting would have stamped a member's entire history with one timestamp and
-- made the ordering arbitrary.
--
-- Draft and needs_correction posts are included deliberately: they are the author's own, they
-- can become published later, and a follow on an unpublished post notifies nobody anyway
-- (the handler returns early on any status but `published`).

-- Authors of posts.
INSERT INTO "community"."follows" ("follower_handle_id", "target_type", "target_id", "created_at")
SELECT "handle_id", 'post', "id", "created_at"
  FROM "community"."posts"
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Authors of comments. `min(created_at)` because a member may have answered the same thread
-- several times and the primary key allows one row per (handle, target) — the earliest is
-- when they joined the discussion, which is what the ordering above wants.
--
-- Removed comments still count: a soft-deleted answer means the member was in the discussion,
-- and dropping them here would silently unsubscribe anyone who has ever tidied up an answer.
INSERT INTO "community"."follows" ("follower_handle_id", "target_type", "target_id", "created_at")
SELECT c."handle_id", 'post', c."post_id", min(c."created_at")
  FROM "community"."comments" c
 GROUP BY c."handle_id", c."post_id"
ON CONFLICT DO NOTHING;
