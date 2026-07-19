# EPIC-A — Registration, Identity Verification & Admin Review Queue — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The first per-epic technical spec, building on the approved cross-cutting architecture in `docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md` ("the architecture spec"). This document does not repeat that spec's stack, hosting, or schema rationale — it only adds detail specific to EPIC-A. Read the architecture spec first, particularly Sections 4 (`identity` schema) and 5.1–5.2 (verification pipeline, authentication).

Source of truth for product requirements: `docs/askapeer-prd-v0.1.md`, Section 8 (Verification & Trust Model).

EPIC-A is the foundation epic: no other epic can be built or tested end-to-end until a member can register and reach `approved_verified` status, since every community-facing feature requires an authenticated handle.

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [State machine](#3-state-machine)
4. [API endpoints](#4-api-endpoints)
5. [Verification worker](#5-verification-worker)
6. [Admin review queue](#6-admin-review-queue)
7. [Authentication handoff](#7-authentication-handoff)
8. [Failure modes and edge cases](#8-failure-modes-and-edge-cases)
9. [Non-functional notes specific to EPIC-A](#9-non-functional-notes-specific-to-epic-a)
10. [Test plan](#10-test-plan)
11. [Open questions](#11-open-questions)

---

## 1. Scope

**In scope**: applicant registration, automated register lookup (HCPC/GMC/BASRAT/SST), automated identity document check (Onfido), the resulting status state machine, the admin manual-review fallback, and the point at which a verified member is handed off to authentication (EPIC-B mints the handle itself — see Section 7).

**Out of scope for this spec** (tracked elsewhere):

- Handle creation/profile — EPIC-B, once `approved_verified` is reached.
- Periodic reverification — explicitly Phase 2 per PRD Section 8.1, Step 4.
- Formal appeals workflow for `rejected` decisions — **not built for MVP** (resolved 2026-07-17): reapplying with corrected evidence is the appeal path (Section 11), so there's no separate appeals mechanism to spec. Policy flagged for Andrew/Paul.
- Admin panel UI framework — covered generically in the architecture spec, Section 7.2; this document only specifies the queue's data and ordering requirements.

---

## 2. Data model

This epic owns the `identity.members`, `identity.verification_evidence`, and `identity.verification_decisions` tables defined in the architecture spec, Section 4.1. Reproduced here with the additions this spec requires:

```
identity.members
  id                    uuid PK
  legal_name            text
  email                 text unique
  professional_body     enum(hcpc, gmc, basrat, sst)
  registration_number   text
  registration_country  text                  -- 'UK' only for MVP; column exists
                                                -- for the international-expansion
                                                -- goal without needing a migration
  verification_status   enum(pending, needs_more_info, approved_verified,
                              rejected, suspended, expelled)
  status_updated_at     timestamptz
  created_at            timestamptz

  unique(professional_body, registration_number, registration_country)
    where verification_status != 'rejected'
    -- prevents the same real-world registration being used to create two accounts.
    -- Deliberately a blacklist (excludes only 'rejected'), not a whitelist of the
    -- statuses that should block re-registration — so any status added to the enum
    -- in future (expelled included) is blocked by default without a constraint
    -- change. This is the fix for the expulsion/re-registration gap identified
    -- while drafting EPIC-B/EPIC-F: see Section 8 and
    -- docs/2026-07-14-technical-specs-open-questions.md, Section 2.

identity.reapplication_attempts        -- immutable: INSERT-only grant
  id                    uuid PK
  matched_member_id     uuid FK -> identity.members   -- the existing row that
                                                          blocked the attempt
  attempted_legal_name  text
  attempted_email       text
  professional_body     enum(hcpc, gmc, basrat, sst)
  registration_number   text
  registration_country  text
  created_at            timestamptz

identity.verification_evidence
  id            uuid PK
  member_id     uuid FK -> identity.members
  evidence_type enum(register_lookup, onfido_check, manual_document)
  source        text
  raw_result    jsonb
  outcome       enum(pass, fail, needs_review)
  created_at    timestamptz

identity.verification_decisions        -- immutable: INSERT-only grant
  id            uuid PK
  member_id     uuid FK -> identity.members
  from_status   text
  to_status     text
  decided_by    text            -- 'system' or an admin's member_id
  reason        text
  created_at    timestamptz
```

**Why a uniqueness constraint on `(professional_body, registration_number, registration_country)`**:

- The PRD doesn't mention duplicate-registration abuse directly, but the trust proposition ("every member is a qualified professional") is undermined if one real registration can back multiple pseudonymous handles — a single practitioner could run sockpuppet accounts to manufacture apparent consensus.
- Enforced at the database level, not just application logic, consistent with the architecture spec's general approach of using schema constraints over code discipline.

**Expelled-member reapplication is deliberately more than a silent 409** (Adrian's decision, 2026-07-14, resolving the gap flagged in the EPIC-B and EPIC-F specs):

| | Ordinary duplicate (`pending`/`approved_verified`/`suspended` match) | Expelled member reapplying (`expelled` match) |
|---|---|---|
| Registration blocked? | Yes — unique constraint | Yes — same constraint |
| Logged for review? | No — just "you already have an account in progress" | Yes — writes an `identity.reapplication_attempts` row, surfaced to admins (Section 6) |
| Applicant-facing response | Generic registration-rejected message | **The same generic message** — deliberately identical |

The identical response is intentional: confirming to the applicant that the system recognised them as previously expelled would hand a bad-faith actor confirmation their identity was detected. This distinction (generic response externally, specific logging internally) is **confirmed 2026-07-17** — the generic message stands; only the *exact wording* is deferred to the pre-launch legal-counsel review (Section 11), in case compliance prefers more explicit language.

No new table is needed for the admin review queue itself — it's a filtered view over `identity.members` (Section 6), not separate storage. `identity.reapplication_attempts` (above) is a separate, append-only log reviewed the same way (Section 6).

---

## 3. State machine

```
                 register
                    |
                    v
              +-----------+
              |  pending  |<------------------+
              +-----+-----+                   |
                    |                          |
     automated checks run (worker, Section 5:  |
     register lookup + Onfido identity check)  |
                    |                          |
         +----------+-----------+              |
         |                      |               
    both pass              fail / ambiguous /    admin requests
         |                 register unavailable  more evidence
         v                      |                          
  +----------------+            v                          
  | approved_      |    +----------------+                
  |  verified      |    |  admin review  |------------------+
  +-------+--------+    |    queue       |
          |              +-------+--------+
          |                      |
          |            +---------+---------+
          |            |                   |
          |     admin approves       admin rejects
          |            |                   |
          |            v                   v
          |    approved_verified       rejected
          |
   lapsed registration
   or policy violation
          |
          v
     suspended

          (also, from approved_verified, via EPIC-F's `expel` moderation
           action rather than anything internal to this epic's own worker)
          |
          v
      expelled   -- terminal; see Section 8 for the reapplication block
```

### Transition rules, per status

| Status | Entered from | Set by | Exits to |
|---|---|---|---|
| `pending` | — (initial state on registration) | `POST /v1/auth/register` | `approved_verified` (auto), or held in `pending` for admin review |
| `needs_more_info` | admin review queue **only** | a human admin requesting further evidence — the automated checks never set this (Section 5's two checks either both pass cleanly or fall through to manual review) | `approved_verified` or `rejected`, by admin decision |
| `approved_verified` | `pending` or `needs_more_info` | auto-approve (both Section 5 checks pass: register lookup + Onfido identity check) or admin approval | `suspended` or `expelled` |
| `rejected` | `pending` or `needs_more_info` | admin decision, `reason` required | terminal — though a fresh registration attempt is permitted (Section 2) |
| `suspended` | `approved_verified` **only** | admin/system — lapsed registration or policy violation (PRD Section 8.1, Step 4); never self-service | potentially temporary per the PRD; reinstatement mechanics are not defined in this spec |
| `expelled` | `approved_verified` **only** | EPIC-F's `expel` moderation action (its spec, Section 3) — never this epic's own verification worker | terminal, no transition out — re-registration is blocked and the attempt logged (Sections 2, 6, 8) |

### Rules that apply across the whole machine

- **Every transition writes an audit row.** Each status change writes an `identity.verification_decisions` row (`from_status`, `to_status`, `decided_by`, `reason`) in the same database transaction as the status update — no status field ever changes without a corresponding decision row. This is what makes the audit trail authoritative rather than incidental.
- **There is no path back to `pending`.** After the initial automated pass, `needs_more_info` is the only "still awaiting a human decision" state — keeping that to one state, not two overlapping ones.
- **`suspended` and `expelled` are deliberately distinct.** Suspension is framed by the PRD (Section 8.1) as potentially temporary — a lapsed registration can be corrected. Expulsion is the zero-tolerance rule's permanent outcome (PRD Section 9.3). Conflating them into one status is exactly the mistake the original architecture spec made by having no `expelled` value at all (since fixed — see the amendment note at the top of that spec).

---

## 4. API endpoints

Builds directly on the architecture spec, Section 5.1's registration flow and Section 5.3's API principles (versioned under `/v1`, no non-`IdentityService` endpoint ever returns `member_id` or `legal_name`).

```
POST /v1/auth/register
  body: { legal_name, email, professional_body, registration_number, registration_country }
  -> 201, { member_id, verification_status: "pending" }
     (member_id here is only ever returned to the registering applicant themselves,
      pre-handle, as a reference for polling their own status — never surfaced to
      any other member)
  -> 409 if (professional_body, registration_number, registration_country) already
     has a non-rejected member row
  -> enqueues the verification job (Section 5)

GET /v1/auth/verification-status
  auth: pending-scoped token (Section 7)
  -> { verification_status, status_updated_at, needs_more_info_reason? }
     Powers the holding page — the only thing a non-approved_verified session
     can call.

--- admin-only, moderator-role JWT claim required (architecture spec, Section 5.3) ---

GET /v1/admin/verification-queue?status=pending,needs_more_info&cursor=...
  -> paginated list, ordered per Section 6

GET /v1/admin/verification-queue/:member_id
  -> full detail: verification_evidence rows, prior decisions, applicant-submitted
     fields. This is a legitimate IdentityService read (the admin is doing the job
     verification exists for), not a moderation identity_access_log event — see
     Section 9 for why this distinction matters.

POST /v1/admin/verification-queue/:member_id/decide
  body: { to_status: approved_verified | rejected | needs_more_info, reason }
  -> writes identity.verification_decisions, updates identity.members.verification_status
  -> on approved_verified: triggers EPIC-B handle-creation prompt (Section 7)
  -> on rejected/needs_more_info: triggers a notification (EPIC-G) with `reason`
```

---

## 5. Verification worker

Runs on the background-worker ECS service defined in the architecture spec (Section 3), driven by BullMQ. One job per registration, two sequential steps:

**Step A — register lookup.** Query the professional body's public register by `registration_number`, fuzzy-match `legal_name` against the register's returned name. Write `identity.verification_evidence` with `evidence_type = register_lookup`. A fuzzy-match rather than exact-match is necessary because registers store legal names with formatting variance (middle names, punctuation) that shouldn't cause a false fail.

**Register availability (researched 2026-07-17):** HCPC and GMC both publish queryable registers. **BASRAT** and **SST** both publish a *public register-check web page* ([BASRaT Register Check](https://www.basrat.org/registercheck); [SST Check the Register](https://thesst.org/check-the-register/)) — searchable by name/number, showing registration status — **but no documented public API was found**. So for MVP, **BASRAT/SST applicants route straight to manual review** (Section 8), not automated Step A; the follow-up is a direct enquiry to each body about API or data-sharing access (registrar@basrat.org, admin@thesst.org). Note the **FD-1 interplay**: if the MVP launches physio-first (the PRD's own recommendation), HCPC is the primary register and BASRAT/SST — sport rehabilitators/therapists, a different professional group — may not be needed at launch at all.

**Step B — identity document check.** Submit an Onfido check binding the applicant's uploaded document + selfie to the claimed identity. This step is what proves the *person registering* is the person named on the register — Step A alone only proves the registration number is real. Onfido is async; the job waits on a webhook rather than polling, per the architecture spec's worker-handles-anything-that-shouldn't-block-a-request principle. Result written as `evidence_type = onfido_check`.

**Decision logic** (executed once both results are in, or on evidence of definitive failure from either):

| Register lookup | Onfido check | Outcome |
|---|---|---|
| pass | clear | auto-approve → `approved_verified` |
| fail | (any) | → admin review queue, stays `pending` |
| needs_review / register unavailable | (any) | → admin review queue, stays `pending` |
| pass | needs_review / fail | → admin review queue, stays `pending` |

Auto-approval is the only decision this worker makes unattended; every other outcome is a queue entry, not an auto-reject — a false auto-reject would permanently and wrongly block a real practitioner, whereas a false queue entry only costs admin time. This is a deliberate asymmetry: the automated path is only trusted to say "yes, cleanly," never "no."

---

## 6. Admin review queue

A view over `identity.members` where `verification_status IN (pending, needs_more_info)`, filtered to rows where the automated worker has already run (i.e., excluding the brief pending window while the worker job is still in flight) — this keeps the queue showing applicants who genuinely need a human, not ones still mid-automated-check.

**Ordering**: oldest `status_updated_at` first within each status, `needs_more_info` entries before fresh `pending` entries that fell through to review — an applicant who has already responded to an admin's request for more evidence shouldn't wait behind a fresh queue entry. (This queue has no `identifiable_patient_information`-style priority category — that ordering rule from the architecture spec, Section 7.2, is specific to the moderation-reports queue, not this one.)

**Admin actions available per entry**: approve (→ `approved_verified`), reject (→ `rejected`, `reason` required), request more info (→ `needs_more_info`, `reason` required — surfaced to the applicant so they know what to provide).

**Prior-rejection context (resolved 2026-07-17).** When an applicant is a *reapplication* — a fresh `identity.members` row created after an earlier rejection (Section 8; the unique constraint permits this because the old row is `rejected`) — the queue detail surfaces the **prior rejected registration(s)** matching the same `(professional_body, registration_number, registration_country)`, with each prior rejection's `reason` and date (from `identity.verification_decisions`). This is a lookup across member rows by professional-registration identity, not just the current row's own decisions (a reapplication has a *new* `member_id`, so its prior history lives on a different row). No schema change — the data already exists in `verification_decisions`. It lets the reviewer spot a repeated pattern or avoid re-doing work, without any cooldown or automatic lockout on the reapplication itself.

Verification is founder-led at MVP scale (PRD Section 8.3) — this queue is designed for a handful of admins reviewing a low volume of edge cases per day, not a high-throughput ops tool. A dedicated verification-operations function, if the platform scales, is a staffing decision, not something this spec needs to design ahead of.

**A separate admin view, `GET /v1/admin/reapplication-attempts`, lists `identity.reapplication_attempts` rows for review** — distinct from the verification queue above, since these aren't applicants awaiting a decision (the registration was already blocked automatically) but flagged events an admin should be aware of, e.g. to judge whether a repeat or aggressive reapplication pattern warrants escalation beyond the automatic block (a legal referral, for instance, if the PRD's underlying policy violation was serious enough). No ordering/priority logic beyond newest-first is specified here, since volume is expected to be very low.

---

## 7. Authentication handoff

EPIC-A ends at `approved_verified`; EPIC-B (handles/profile) begins immediately after. The precise handoff, since both epics touch the same registration flow:

1. On `POST /v1/auth/register`, no handle exists yet and no session is issued — the applicant only has a `member_id` to poll their own status with (Section 4).
2. While `verification_status` is anything other than `approved_verified`, any authenticated call is scoped to a **pending token** that grants access only to `GET /v1/auth/verification-status` — matching the PRD's "all other statuses see a holding page only" and the architecture spec's Section 5.2 note that non-verified members get a holding-status-scoped token.
3. The moment `verification_status` transitions to `approved_verified` (whether by auto-approve or admin decision), the member is prompted to choose a handle. Only once `community.handles` has a row for them does `IdentityService` issue the full handle-scoped JWT described in the architecture spec, Section 5.2 — EPIC-A never issues a handle-scoped token itself, since it has no concept of handles.

This spec does not define the handle-creation endpoint itself (`community.handles` insert, uniqueness/profanity checks on `handle_name`) — that's EPIC-B's spec. It only guarantees the trigger point and the shape of what EPIC-B receives (`member_id`, resolved server-side, never exposed to the applicant's own client beyond the initial registration response).

---

## 8. Failure modes and edge cases

| Scenario | Handling | Why / notes |
|---|---|---|
| Register API down or rate-limited | Worker marks the `register_lookup` evidence row `outcome = needs_review` (raw error in `raw_result`) and routes to the admin queue | Better than retrying indefinitely with the applicant in limbo; the PRD's risk register (Section 13) already names this risk with manual review as the designed mitigation |
| BASRAT/SST public register has no documented API (researched 2026-07-17, Section 5) | Every applicant from these two bodies routes straight to manual review, regardless of Onfido outcome | A deliberate, explicit fallback — a public register-check web page exists but no API; follow-up is a direct enquiry to each registrar. May be moot at launch if physio-first (FD-1) |
| Onfido webhook never arrives (delivery failure, or applicant abandons the document upload) | Job timeout — **configurable, default 48 hours** (`verification.onfido_timeout_hours`, EPIC-J config) — after which the applicant surfaces in the admin queue as `needs_more_info` with automatic reason "identity check not completed" | Onfido itself returns in minutes (researched 2026-07-17), so this window only guards an applicant who *abandons* their upload — long enough for a real person to return and finish, tunable without a deploy |
| Reapplication by a `rejected` member | Permitted — the unique constraint only blocks non-`rejected` rows; a fresh attempt creates a new `identity.members` row. **The admin reviewing the new attempt sees the prior rejection(s)** — reason + date — surfaced on the queue detail (Section 6). No cooldown | A genuinely rejected applicant isn't locked out forever (e.g. after resolving a registration lapse), but the reviewer gets the prior-rejection context to spot a pattern or avoid repeating work. Resolved 2026-07-17 (Section 11) |
| Reapplication by an `expelled` member | Blocked by the same constraint (`expelled` ≠ `rejected`), and logged to `identity.reapplication_attempts` for admin review (Section 6) | Resolved 2026-07-14 — previously a real gap (no `expelled` value existed on `identity.members`); history in `docs/2026-07-14-technical-specs-open-questions.md`, Section 2 |
| Applicant email doesn't match register-held contact details | Not treated as a verification signal | The register lookup matches on `legal_name` + `registration_number`, not email — professional registers don't reliably expose a queryable email field |

---

## 9. Non-functional notes specific to EPIC-A

- **Why admin queue reads aren't `identity_access_log` events** (**confirmed 2026-07-17** — the interpretation below is accepted):
  - The architecture spec (Section 4.4) draws the line at "routine automated system access" vs. moderator-initiated identity access.
  - Reviewing a *pending applicant's own submitted evidence* is the core, ordinary function `IdentityService` exists to perform.
  - That is meaningfully different from a moderator looking up an *existing verified member's* real identity behind their handle — which is what PRD Section 9.4's access rule and `identity_access_log` protect against.
  - Conflating the two would make routine verification work indistinguishable from genuine identity-access events, undermining the log's value as a trust artifact.
- **PII handling in transit/rest**: `legal_name`, `raw_result` (which may embed applicant-submitted document data from Onfido), and `registration_number` are exactly the category of data the architecture spec's `identity` schema access grants exist to protect — no change needed here beyond confirming this epic's code paths only ever run under the `IdentityService` database role.
- **Rate limiting**: `POST /v1/auth/register` and `POST /v1/auth/request-link` are the two endpoints explicitly called out in the architecture spec, Section 5.3, for Redis-backed per-IP rate limiting — registration is an obvious target for automated abuse (e.g. scripted submission of stolen registration numbers to probe the register-lookup step).

---

## 10. Test plan

- **State machine**: every transition in Section 3 has a corresponding test; explicitly test that no transition exists that skips writing a `verification_decisions` row (e.g. by asserting the two writes happen in one database transaction and a forced failure of either rolls back both).
- **Uniqueness constraint**: registering the same `(professional_body, registration_number, registration_country)` twice while the first is `pending`/`approved_verified`/`needs_more_info`/`suspended`/`expelled` is rejected; while `rejected`, a new row is allowed.
- **Expelled reapplication logging**: a blocked registration attempt matching an `expelled` row writes exactly one `identity.reapplication_attempts` record with the correct `matched_member_id`, and the applicant-facing response is indistinguishable from an ordinary duplicate-registration rejection (no confirmation of expelled status leaks to the caller).
- **Worker decision table**: each row of the Section 5 table covered by a test with mocked register-lookup and Onfido responses, including the "register unavailable" case.
- **Access-control regression** (extends the architecture spec's Section 9 cross-schema test): confirm no EPIC-A endpoint response DTO includes `legal_name` or raw `identity.members` fields beyond `member_id` and `verification_status`.
- **Timeout handling**: simulate an Onfido webhook that never arrives and assert the applicant surfaces in the admin queue after the timeout window, not stuck silently in `pending`.

---

## 11. Open questions

- ~~**BASRAT/SST register access**~~ — **resolved 2026-07-17** (researched): both publish a *public register-check web page* but **no documented API** (Section 5). MVP routes BASRAT/SST applicants to manual review; follow-up is a direct enquiry to each registrar (registrar@basrat.org, admin@thesst.org) about API/data access. May be moot at launch if physio-first (FD-1) — HCPC is then the primary register. *(External action item, not a design gap.)*
- ~~**Rejection cooldown/reapplication**~~ — **resolved 2026-07-17**: a `rejected` applicant may resubmit immediately (no cooldown), and the admin reviewing the new attempt **sees the prior rejection(s)** — reason + date — on the queue detail (Sections 6, 8). Transparency for the reviewer without locking out a legitimate reapplicant who has fixed the issue.
- ~~**Appeals process**~~ — **resolved 2026-07-17** (working call): for MVP there is **no separate appeals workflow** — reapplying with corrected/additional evidence *is* the appeal path, re-reviewed fresh by an admin (founder-led verification makes a formal appeals queue overkill at MVP scale). **Flagged for Andrew Renshaw / Paul Gouge to confirm the policy** (see the standing items in the open-questions doc §4).
- ~~**Onfido webhook timeout value**~~ — **resolved 2026-07-17**: **configurable, default 48 hours** (`verification.onfido_timeout_hours`, EPIC-J config). Onfido itself returns in minutes (researched), so this window only guards an applicant who abandons their upload — tunable without a deploy, consistent with the billing grace-period-as-config decision.
- ~~**Identity-access-log boundary (Section 9)**~~ — **confirmed 2026-07-17**: routine admin verification-queue review is **not** an `identity_access_log` event (that log is for a moderator revealing an existing verified member's real identity behind their handle — PRD §9.4). Reviewing a pending applicant's own submitted evidence is the ordinary function `IdentityService` exists for; logging it would dilute the log's value as a trust artifact.
- ~~**Exact applicant-facing rejection wording for the expelled-reapplication case** (Section 2)~~ — **resolved 2026-07-17**: keep the **generic** message (do not confirm expelled status to the applicant — confirming it would hand a bad-faith actor certainty their identity was detected). The *exact wording* is folded into the pre-launch legal-counsel review already bundled with the right-to-erasure / DPIA work (open-questions doc §4), in case compliance prefers more explicit language — but the default is generic.

---

## 12. Screen-spec reconciliation (2026-07-19)

The screen & functional spec surfaced gaps that land in this epic. Clear technical additions are folded in; two items carry a decision, recorded with a recommendation.

### 12.1 Responding to `needs_more_info` / resuming the identity check (gaps G-1, G-2)

The holding page (screen A5) showed the member their `needs_more_info` reason and a "provide the requested information" action — but **no applicant endpoint existed** to act on it, and the Onfido capture (A4) had no defined resume path. Added:

```
POST /v1/auth/verification/resubmit
  auth: pending-scoped token; only valid while verification_status = needs_more_info
  -> re-opens the identity-check step: re-enqueues the verification job and, where
     the reason is an incomplete/failed Onfido check, issues a fresh Onfido SDK
     session so the applicant can re-capture (resolves the A4<->A5 resume path, G-2)
  -> transitions needs_more_info -> pending (the applicant re-enters the automated
     pipeline / admin queue); writes the verification_decisions audit row
```

This closes the one place the state machine (Section 3) had a dead end for the applicant.

### 12.2 Professional-body picker launch set (gap G-18)

The registration form's `professional_body` options (`hcpc`/`gmc`/`basrat`/`sst`, Section 2) are **FD-1-dependent**: if the MVP launches physio-first (the PRD's own recommendation), **HCPC is the primary/only register offered at launch**, with GMC/BASRAT/SST added as scope widens. A scope link for the composer, not a new mechanism — noted so the picker isn't hardcoded to all four before FD-1 is settled.

### 12.3 Onboarding anonymity acknowledgement (gap G-13) — DECISION, recommendation below

The zero-tolerance anonymity rule is *shown* at registration and onboarding (screen A7), but nothing currently **records** the member's acknowledgement. Given expulsion is the rule's consequence, a recorded acknowledgement is worth having for legal defensibility — mirroring how the case-discussion attestation is recorded.

- **Recommendation**: record it — an `identity.members.anonymity_acknowledged_at timestamptz` (or a small `identity.policy_acknowledgements` row if multiple policy versions need tracking), written when the member confirms at A7. Cheap, and it makes "they agreed to this" answerable.
- **Status**: pending Adrian/legal confirmation (bundle with the DPIA / legal review). Not build-blocking.

### 12.4 Account deletion / right-to-erasure member flow (gap G-20) — DECISION, recommendation below

The architecture sets the erasure *default* (hard-delete the `identity` row, retain de-linked/anonymised community content) but flags it for legal; there is **no member-facing deletion flow or endpoint** (screen F7 needs one). Recommended shape:

```
POST /v1/account/deletion-request
  auth: handle-scoped token
  -> initiates erasure: confirmation step, then (per the arch default) hard-deletes
     the identity.members row and severs member_id from community content (the
     handle + posts remain as de-linked archive, per architecture §4 / right-to-
     erasure default). Consider a short cancellable grace window.
```

- **Recommendation**: build a member-initiated deletion request (GDPR right-to-erasure is not optional for a UK service handling this PII), implementing the architecture's stated default, with the exact retention/anonymisation behaviour **confirmed by legal counsel** first (already on the standing legal-review list, open-questions §4).
- **Status**: needs the legal confirmation before build; the endpoint shape is otherwise clear.

### 12.5 Gap cross-reference

| Gap | Resolution |
|---|---|
| G-1 | `POST /v1/auth/verification/resubmit` (§12.1) |
| G-2 | Onfido resume via the same endpoint (§12.1) |
| G-13 | Record acknowledgement — recommended, pending legal (§12.3) |
| G-18 | FD-1 scope link for the body picker (§12.2) |
| G-20 | Member deletion-request endpoint — recommended, pending legal (§12.4) |
