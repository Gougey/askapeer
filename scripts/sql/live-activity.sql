-- Who is using the app right now? Run before any deploy:  scripts/live-db-read.sh scripts/sql/live-activity.sql
--
-- Counts only, never who. A member using the app refreshes their session every 15 minutes
-- (the access token's lifetime), and the refresh token rotates once it is 10 minutes old, so a
-- token created in the last 30 minutes means that member was active in the last half hour. A
-- sign-in counts the same way. Deploying restarts the app, so someone mid-answer may lose it.
\echo == members active (session refreshed or signed in)
select count(distinct member_id) filter (where created_at > now() - interval '30 minutes') as last_30_minutes,
       count(distinct member_id) filter (where created_at > now() - interval '2 hours') as last_2_hours,
       count(distinct member_id) filter (where created_at > now() - interval '24 hours') as last_24_hours
  from identity.refresh_tokens;
\echo == writes in the last 30 minutes
select (select count(*) from community.posts where created_at > now() - interval '30 minutes') as posts,
       (select count(*) from community.comments where created_at > now() - interval '30 minutes') as answers,
       (select count(*) from community.kudos where created_at > now() - interval '30 minutes') as awards;
