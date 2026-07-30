-- The email-only projection of identity.members (EPIC-G §3).
--
-- NotificationService needs exactly one column from the identity schema — `email` — and
-- must never read `legal_name`. Every template addresses a member by their handle.
--
-- This view is what turns that from application discipline into a permission. At the AWS
-- migrate step, when per-role grants land (architecture spec §4.1), the notification role
-- is granted on THIS VIEW and not on identity.members:
--
--     grant usage  on schema identity        to askapeer_notifications;
--     grant select on identity.member_emails to askapeer_notifications;
--     -- and deliberately NO grant on identity.members
--
-- at which point a query selecting legal_name fails at the database rather than in review.
-- Under the prove phase's single role the view enforces nothing on its own; reading
-- through it now is what makes the hardening a grant rather than a refactor, and stops
-- anything new accreting a direct members read in the meantime.
create or replace view identity.member_emails as
  select id as member_id, email
    from identity.members;
