# EPIC-B — Pseudonymous Handle and Profile System — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The second per-epic technical spec, building on the approved cross-cutting architecture in `docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md` ("the architecture spec") and directly continuing from `docs/superpowers/specs/2026-07-14-epic-a-verification-technical-spec.md` ("the EPIC-A spec"), which ends at the moment a member reaches `approved_verified` and is prompted to create a handle. Read both first, particularly the architecture spec's Section 4.2 (`community` schema) and Section 4.4 (why `identity`/`community` are separated), and the EPIC-A spec's Section 7 (authentication handoff).

Source of truth for product requirements: `docs/askapeer-prd-v0.1.md`, Section 9 (Anonymity & Safety Framework) governs this epic as much as Section 6.1's feature table — EPIC-B is where the platform's core anonymity guarantee first becomes a concrete data model and set of rules, not just a policy statement.

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [Handle creation](#3-handle-creation)
4. [Profile — what's visible, what isn't](#4-profile--whats-visible-what-isnt)
5. [API endpoints](#5-api-endpoints)
6. [Handle immutability](#6-handle-immutability)
7. [Status effects (suspended/expelled)](#7-status-effects-suspendedexpelled)
8. [Follows — handles and tags (Should-have)](#8-follows--handles-and-tags-should-have)
9. [Boundaries with other epics](#9-boundaries-with-other-epics)
10. [Failure modes and edge cases](#10-failure-modes-and-edge-cases)
11. [Non-functional notes specific to EPIC-B](#11-non-functional-notes-specific-to-epic-b)
12. [Test plan](#12-test-plan)
13. [Open questions](#13-open-questions)

---

## 1. Scope

**In scope**: handle creation immediately after `approved_verified` (the EPIC-A → EPIC-B handoff), handle-name validation rules, the public profile view (handle, kudos total, membership duration, post history), handle immutability policy, and the effect of suspension/expulsion on a profile's visibility. Also specifies the Should-have "follow" mechanism (PRD Section 6.1) — generalised (2026-07-14) to cover both following a handle and following a tag, resolving a gap identified across the EPIC-C/EPIC-G specs; see Section 8.

**Out of scope for this spec** (owned elsewhere):

- Awarding/counting kudos itself — EPIC-D. This spec only owns the `kudos_total` *column* on the handle record; EPIC-D owns writing to it (Section 9).
- Post/answer history *content* (the posts themselves) — EPIC-C. This spec only specifies that a profile surfaces a handle's post history, not the forum data model.
- Moderation actions that *change* a handle's status — EPIC-F. This spec only specifies what a profile looks like once a status change has already happened (Section 7).
- Notification preferences — EPIC-G.
- The optional "professional contact link (e.g. LinkedIn URL)" the PRD's FD-5 discussion (Section 16) floats as a DM alternative — deliberately **not** built into this spec's data model. See Section 13; it isn't in the PRD's MoSCoW feature table (Section 6.1) as committed scope, and it appears to directly conflict with PRD Section 9.3's zero-tolerance rule, which names "deliberately identifying yourself" as an expulsion trigger. That conflict needs stakeholder resolution before any such field is built, not a unilateral design call here.

---

## 2. Data model

This epic owns `community.handles`, already defined in the architecture spec, Section 4.2, reproduced here with the one addition this spec requires:

```
community.handles
  id            uuid PK                    -- the public "handle_id"
  member_id     uuid                       -- FK exists for referential integrity only;
                                             -- readable solely via IdentityService's role
                                             -- (architecture spec, Section 4.2)
  handle_name   text unique                -- case-insensitively unique; see Section 3
  kudos_total   int default 0              -- written by EPIC-D, read-only here
  member_since  date                       -- full date stored; see Section 4 for why
                                             -- display truncates to year
  status        enum(active, suspended, expelled)
  created_at    timestamptz

community.handle_name_history            -- new: append-only, admin/support use only
  id            uuid PK
  handle_id     uuid FK -> community.handles
  previous_name text
  changed_by    text            -- 'system' (first creation) or an admin's member_id
  changed_at    timestamptz
```

**Why `handle_name_history` exists**, even though Section 6 concludes handles shouldn't be freely self-service-changeable:

- The one legitimate case for a handle name ever changing is a moderator-forced rename (e.g. the name turns out to be identifying, or impersonates staff — see Section 3).
- When that happens, the old name must not vanish untraceably — a moderator action changing a member-facing identifier is exactly what the architecture spec's audit-logging philosophy (Section 4.4) says should leave a trail.
- Without it, a renamed handle's post history would look like it belonged to two different people, with no record of why.

No new schema is introduced — this all lives in `community`, consistent with the architecture spec's principle that pseudonymous, peer-facing data never touches `identity`.

---

## 3. Handle creation

Continues directly from the EPIC-A spec, Section 7: the moment `identity.members.verification_status` becomes `approved_verified`, the member is prompted to choose a handle. Until `community.handles` has a row for them, they cannot receive a full session token (EPIC-A spec, Section 7, point 3).

**Validation rules** (none of this is specified in the PRD directly — it's the technical detail the anonymity guarantee implies, and is flagged for review rather than assumed correct by construction):

- **Case-insensitive uniqueness** — `handle_name` collisions are checked ignoring case, so `DrSmith` and `drsmith` can't both exist (visually near-identical handles would otherwise be a natural phishing/impersonation vector in a trust-based community).
- **No real-name plausibility check at creation time** — the platform cannot algorithmically know whether "Andrew_R_Physio" is someone's real name. This is handled by policy and reporting (PRD Section 9.3's "deliberately identifying yourself" rule), not creation-time validation, and is explicitly out of this spec's ability to enforce technically.
- **Blocklist filtering**: profanity, slurs, and terms impersonating platform roles (`admin`, `moderator`, `askapeer`, `support`, and close variants) are rejected at creation time — this one *is* technically enforceable and prevents an obvious trust/impersonation failure mode before it reaches a human moderator. Stored in a **config table**, not a code constant (agreed by Adrian, 2026-07-17) — see Section 11 for why.
- **Length and character constraints**: **3–30 characters, alphanumeric plus underscore/hyphen** (agreed by Adrian, 2026-07-17). Not a PRD requirement, but now a settled decision rather than a placeholder.
- **No reuse of a previously-expelled handle's exact name** — checked against `community.handle_name_history` as well as current `handles` rows, so a fresh registration can't casually re-adopt an identity an expelled member used, which could otherwise confuse other members about who they're now talking to.

---

## 4. Profile — what's visible, what isn't

Directly implements PRD Section 9.2's two lists:

| Visible to peers | Never visible |
|---|---|
| `handle_name` | Real name, employer/institution |
| `kudos_total` | Geographic location |
| Approximate membership duration (year only — see below) | Specialty, grade, years of experience |
| Post/answer history (owned by EPIC-C, surfaced by reference) | |

The "never visible" fields don't exist anywhere in the `community` schema in the first place (architecture spec, Section 4.2), so there's no field to accidentally leak — the guarantee is **structural**, not a display-layer filter over data that could be requested some other way.

**`member_since` display is year-only** (e.g. "Member since 2025"), even though the stored column is a full `date`. This isn't cosmetic:

- PRD Section 9.2's own example uses year granularity.
- A precise join date is a plausible **correlation vector**: if a real person is known (from off-platform context) to have started a new job or completed registration on a specific date, an exact `member_since` timestamp narrows the search for which handle is theirs far more than a year does.
- The full date is still stored for internal/analytics use (e.g. KPI reporting, PRD Section 12) — a deliberate storage/display split, not an oversight.

**Post/answer history** on a profile is exactly the posts EPIC-C already attributes to that `handle_id` — this spec doesn't duplicate that data, it specifies that the profile endpoint (Section 5) includes a reference to it.

---

## 5. API endpoints

Consistent with the architecture spec's Section 5.3 principles: versioned under `/v1`, and — critically for this epic — **no response shape from any of these endpoints ever includes `member_id`**, only `handle_id`.

```
POST /v1/handles
  auth: pending-scoped token, only valid once (EPIC-A spec, Section 7) and only
        callable when the caller's verification_status = approved_verified
  body: { handle_name }
  -> 201, { handle_id, handle_name }
  -> issues the full handle-scoped session JWT described in the architecture
     spec, Section 5.2, replacing the pending-scoped token
  -> 409 if handle_name fails uniqueness/blocklist validation (Section 3)

GET /v1/handles/:handle_id
  -> public profile: { handle_name, kudos_total, member_since (year only),
     status, post_history_ref }
  -> if status = expelled: handle_name and member_since still shown (removing
     them would create confusing gaps in threads where the expelled handle
     posted historically), kudos_total still shown, but no ability to interact
     (follow, kudos) — see Section 7

GET /v1/handles/me
  auth: handle-scoped token
  -> same shape as above, plus fields only the member themselves needs
     (e.g. notification-preference links — owned by EPIC-G, referenced here)

--- admin-only, moderator-role JWT claim required ---

# (moderator-forced rename) — resolved 2026-07-17: NOT an EPIC-B endpoint.
# The rename is executed via EPIC-F's rename_handle moderation action
# (POST /v1/admin/.../action, action_type = rename_handle). EPIC-B still
# owns the DATA and RULES that action reuses: community.handle_name_history,
# and the same blocklist/uniqueness validation as handle creation (Section 3).
```

The moderator-forced rename was originally sketched here as a bespoke `POST /v1/admin/handles/:handle_id/rename` endpoint. **Resolved 2026-07-17 (open-questions §1.3):** a moderator-initiated rename is a moderation action in substance, so it lives in **EPIC-F's `rename_handle` action type**, not a separate EPIC-B endpoint. EPIC-B keeps ownership of the underlying data and rules the action relies on — `community.handle_name_history` (the audit trail) and the creation-time blocklist/uniqueness validation (Section 3) that EPIC-F's `rename_handle` re-runs on the new name.

---

## 6. Handle immutability

**Members cannot self-service rename their handle after creation.** Not explicitly stated in the PRD, but it follows from the anonymity model's own logic:

- **Reputation laundering**: kudos, post history, and "member since" are all reputation signals *of the handle*. A freely renameable handle would let a member shed a damaged reputation (e.g. after public disagreement or a formal warning short of expulsion) just by picking a new name while keeping the same `member_id` — undermining the "ideas win on merit" thesis, since merit is tracked per-handle.
- **Audit volume**: if renaming were self-service, every rename would need the audit trail Section 2's `handle_name_history` table provides — but at a much higher volume of events than the rare moderator-forced case it was designed for.

**The one exception** (Section 5) is a moderator-forced rename, when the handle name itself becomes a problem — later found to be identifying, or an impersonation attempt that slipped past the Section 3 blocklist. This is a moderation action in substance and **lives in EPIC-F's `rename_handle` action type** (confirmed 2026-07-17, open-questions §1.3), not a bespoke EPIC-B workflow — EPIC-B provides only the `handle_name_history` data and validation rules it reuses.

---

## 7. Status effects (suspended/expelled)

Reuses the `community.handles.status` enum already defined in the architecture spec (Section 4.2): `active`, `suspended`, `expelled`. This epic only specifies profile-visibility consequences; the *decision* to change status is EPIC-F's.

| Status | Profile visibility | Interaction |
|---|---|---|
| `active` | Full profile as Section 4 | Followable, kudos-able |
| `suspended` | Full profile, unchanged | Not followable/kudos-able while suspended (temporary) |
| `expelled` | Full profile, unchanged (see Section 5's `GET /v1/handles/:handle_id` note) | Not followable/kudos-able (permanent) |

**Why an expelled handle's profile and history stay visible rather than being deleted or hidden**: PRD Section 9.3's zero-tolerance rule is about *expelling the member*, not erasing the community's record of what they contributed — removing their post history would break threads other members' replies depend on, and the PRD's own right-to-erasure design (architecture spec, Section 9) already establishes the precedent of retaining de-linked community content rather than deleting it. The handle itself becomes inert (can't log in, can't be interacted with going forward), but it doesn't vanish from the archive.

---

## 8. Follows — handles and tags (Should-have)

Two of PRD Section 6.1's Should-have features turn out to need the same underlying mechanism:

- **"Personalised feed"** (EPIC-C) — home view based on "**tags and handles** followed"
- **"Email digest"** (EPIC-G) — weekly digest of "top-kudos content in **followed tags**"

The PRD's own language already treats following a person and following a topic as one verb applied to two target types — this spec follows that lead rather than building two separate mechanisms. (An earlier draft specified only handle-follows, leaving tag-follows as a gap other specs had to flag; see `docs/2026-07-14-technical-specs-open-questions.md`, Section 2, for that history.)

```
community.follows
  follower_handle_id   uuid FK -> community.handles
  target_type          enum(handle, tag)
  target_id            uuid          -- a handle_id or a community.tags.id,
                                        depending on target_type
  created_at           timestamptz
  primary key (follower_handle_id, target_type, target_id)
```

Design notes:

- **Not a new modelling idiom**: the `target_type`/`target_id` discriminator is the same pattern `community.kudos` and `community.reports` already use to reference another epic's tables without a single foreign key.
- **EPIC-B keeps ownership** of the table and write path (as it did for the narrower `handle_follows` this replaces) — the natural owner of a follow relationship is the follower, a handle.
- **EPIC-C and EPIC-G are read-only consumers**, filtering `WHERE target_type = 'tag'` for the personalised feed and digest respectively — the same "one epic owns the write path, others read" pattern used for kudos and notification preferences elsewhere in these specs.

```
POST   /v1/follows                    { target_type, target_id }   auth: handle-scoped token
DELETE /v1/follows/:target_type/:target_id                          auth: handle-scoped token
GET    /v1/follows/me?target_type=     -> list of followed target_ids, optionally filtered
```

Consistent with the PRD's framing for handle-follows ("You follow their ideas, not their identity") — following a handle is purely a `handle_id`-to-`handle_id` relationship, and following a tag is purely a `handle_id`-to-`tag_id` relationship; nothing here differs from any other community-schema interaction in terms of the identity boundary.

Self-follow (`target_type = handle` and `target_id` = the caller's own `handle_id`) is rejected at the API layer — not a meaningful action, and cheap to exclude. No equivalent restriction applies to tags, obviously.

**Relationship to EPIC-I's `member_interests`**: EPIC-I's `community.member_interests` (a *weighted* interest signal scoring research-article relevance) remains a deliberately separate mechanism from this *binary* follows table — they serve different purposes (relevance scoring vs. notification/feed inclusion) and this spec doesn't merge them. See EPIC-I's spec, Section 4, for that reasoning.

---

## 9. Boundaries with other epics

Several fields and behaviors on `community.handles` are written by other epics; this section exists so those specs don't have to re-derive the boundary:

- **`kudos_total`**: EPIC-D's write path (an award increments it). EPIC-B defines the column and reads it for profile display; EPIC-D is the only writer. This mirrors the architecture spec's general pattern of one clear writer per shared piece of state.
- **`status`**: EPIC-F's write path (moderation decisions). EPIC-B defines the enum and its profile-visibility consequences (Section 7); EPIC-F is the only writer.
- **Post/answer history**: entirely EPIC-C's data (`community.posts`/`community.comments` keyed by `handle_id`); EPIC-B's profile endpoint only references it.
- **Notification preferences surfaced on `/v1/handles/me`**: EPIC-G's data; included in that endpoint's response for convenience, not owned here.
- **`community.follows` (Section 8)**: EPIC-B owns the table and write path (`POST`/`DELETE /v1/follows`); EPIC-C (personalised feed) and EPIC-G (weekly digest) are read-only consumers filtering on `target_type = 'tag'`. `target_type = 'tag'` rows reference `community.tags.id`, an EPIC-C-owned table — the same cross-epic reference pattern EPIC-D's kudos and EPIC-F's reports already use against EPIC-C's `posts`/`comments`.

---

## 10. Failure modes and edge cases

| Scenario | Handling | Why / notes |
|---|---|---|
| Two applicants race to claim the same handle name | The case-insensitive unique constraint (Sections 2/3) is the source of truth; the API 409s on the race | Expected behaviour — the client should offer alternatives, not retry blindly |
| A moderator-forced rename collides with an existing handle | The rename endpoint (Section 5) runs the same blocklist/uniqueness validation as creation and rejects the collision | The admin picks a different replacement name |
| An expelled member re-registers under EPIC-A with the same registration | Blocked — `identity.members.verification_status` now has an `expelled` value and EPIC-A's constraint blocks any non-`rejected` status; the attempt is logged to `identity.reapplication_attempts` for admin review | **Resolved 2026-07-14** per Adrian's direction (prevented *and* reviewed, not silently rejected); history in `docs/2026-07-14-technical-specs-open-questions.md`, Section 2 |
| Handle expelled mid-session (moderator expels while the member is actively posting) | Existing access token stays valid up to its ~15-minute lifetime, then the refresh fails | Same mechanic the architecture spec (Section 7.2) already describes — no EPIC-B-specific handling needed |

---

## 11. Non-functional notes specific to EPIC-B

- **No new identity-schema access**: this epic's endpoints operate entirely under a `community`-schema database role; the cross-schema regression test the architecture spec requires (Section 9) should be extended to cover this epic's endpoints specifically once built, the same way the EPIC-A spec's test plan does for its own.
- **Handle-name blocklist storage**: the profanity/impersonation blocklist (Section 3) lives in a **config table**, not a code constant (agreed by Adrian, 2026-07-17). Rationale: beyond the obvious profanity/role-impersonation terms, profession-specific words will need adding over time (specialty names, credentials, professional-body abbreviations that could hint at identity or impersonate authority) — these can't be fully enumerated upfront, and coupling every addition to a code deploy is friction felt exactly when responding to abuse. A config table lets a moderator add a term without a release. No `identity`-schema involvement; ordinary `community`/config data.

---

## 12. Test plan

- **Uniqueness**: case-insensitive collision is rejected; visually-confusable-but-technically-distinct names (e.g. `drsmith` vs `dr_smith`) are *not* blocked by this rule — confirms the constraint is doing exactly what Section 3 describes, no more.
- **Blocklist**: creation attempts using reserved terms (`admin`, `moderator`, `askapeer`, close variants) are rejected; legitimate handles containing a blocklisted term as a substring only (e.g. a hypothetical clinical term that happens to contain a blocked fragment) are not — needs a real blocklist implementation decision, not just a naive substring match, to avoid false positives.
- **Expelled-name reuse**: registering a handle name matching an entry in `handle_name_history` is rejected even though the *current* `handles` table has no row with that name.
- **Profile field boundary**: an automated test asserting the `GET /v1/handles/:handle_id` response DTO has no path to `member_id`, `legal_name`, or any other `identity`-schema field — mirrors the EPIC-A spec's Section 10 approach.
- **`member_since` display**: confirm the API/display layer truncates to year even though the stored value is a full date; a regression test on this specifically, since it's a privacy-relevant behavior that a well-intentioned future refactor could quietly "fix" by exposing the full date.
- **Status-gated interactions**: a `suspended` or `expelled` handle cannot be followed or kudos'd (once EPIC-D exists to test against), but its existing profile and history remain readable.
- **Unified follows table**: following a tag and following a handle both write to `community.follows` with the correct `target_type`; self-follow rejection applies only when `target_type = handle`; `GET /v1/follows/me?target_type=tag` returns only tag follows, not a mixed list.

---

## 13. Open questions

- ~~**The FD-5 professional-contact-link tension**~~ — **resolved 2026-07-14**: confirmed not to build it, given the direct conflict with PRD Section 9.3's zero-tolerance rule. See `docs/2026-07-14-technical-specs-open-questions.md`, Section 2.
- ~~**Handle length/character rules**~~ — **resolved 2026-07-17**: 3–30 characters, alphanumeric plus underscore/hyphen, agreed by Adrian. See Section 3.
- ~~**Moderator-forced rename as a first-class moderation action**~~ — **resolved 2026-07-17** (open-questions §1.3): yes, it lives in EPIC-F's action-type enum as `rename_handle`, not a bespoke EPIC-B endpoint. EPIC-B retains the `handle_name_history` table and the blocklist/uniqueness validation that EPIC-F's action reuses (Sections 5, 6).
- ~~**Expelled-member re-registration gap**~~ — **resolved 2026-07-14**, see Section 10 above and EPIC-A/EPIC-F's specs.
- ~~**Blocklist storage/maintenance mechanism**~~ — **resolved 2026-07-17**: config table (not a code constant), so profession-specific terms can be added without a deploy. See Sections 3 and 11.
