# EPIC-E — Case Discussions with De-identification Enforcement — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The fifth per-epic technical spec. Builds directly on EPIC-C's forum spec (`docs/superpowers/specs/2026-07-14-epic-c-forum-technical-spec.md`) — a case discussion is a `community.posts` row with `type = case_discussion` — and on the architecture spec's Section 4.3 (`identity.case_attestations`, "the deliberate exception" where identity and community data are joined). Read both first.

Source of truth: `docs/askapeer-prd-v0.1.md`, Section 6.2 (template fields) and Section 10 (Case Discussions & Patient Safety Policy) in full — this epic exists entirely to implement Section 10's policy, which the PRD itself calls out as simultaneously "among the highest-value features of the platform and the highest-risk."

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [Publish flow](#3-publish-flow)
4. [The de-identification checklist](#4-the-de-identification-checklist)
5. [The attestation](#5-the-attestation)
6. [API endpoints](#6-api-endpoints)
7. [Disclaimer and priority reporting](#7-disclaimer-and-priority-reporting)
8. [Post-publish editing](#8-post-publish-editing)
9. [Cross-epic dependencies introduced by this spec](#9-cross-epic-dependencies-introduced-by-this-spec)
10. [Non-functional notes specific to EPIC-E](#10-non-functional-notes-specific-to-epic-e)
11. [Test plan](#11-test-plan)
12. [Open questions](#12-open-questions)

---

## 1. Scope

**In scope**: the structured case-discussion template (PRD Section 6.2), the mandatory de-identification checklist and attestation gate (PRD Section 10.2–10.3) that must complete before a case discussion becomes visible to any other member, the platform disclaimer (Section 10.5), and the priority-reporting category this content type requires (Section 10.4, completed by EPIC-F).

**Out of scope**: general forum mechanics (posting, commenting, tagging, search — EPIC-C, which this epic's published case discussions become ordinary participants in), the moderation queue and action types themselves (EPIC-F), kudos on case discussion answers (EPIC-D, unchanged for this post type).

---

## 2. Data model

A case discussion is a `community.posts` row (EPIC-C's table) with `type = case_discussion`, extended with a 1:1 structured-fields table — the template is a set of distinct structured questions, not a single free-text body, so a dedicated table is more faithful to the requirement than overloading EPIC-C's generic `title`/`body` columns.

> **Amended 2026-08-01, after Andrew Renshaw's clinical review.** The PRD's Section 6.2 template had nine prose fields; the built template has **four**, plus the two structural fields. `relevant_history` and `subjective_findings` fold into the presenting condition and its history; `red_flags_considered`, `differential_diagnosis`, `interventions_tried` and `response_to_treatment` collapse into the closing question, since a practitioner asking for help states what they tried and what it did as part of asking. The judgement behind the cut: fewer, larger fields get better answers than nine boxes half of which get filled with "n/a". The age bands were cut from nine demographic decades to three clinical ones, and the timeline became an integer day count rather than free text. **This section, not PRD §6.2, is now the built shape.**

```
community.case_details
  post_id                       uuid PK, FK -> community.posts
  age_band                      case_age_band  -- child (0–11) | youth (12–17) | adult (18+)
  onset_days                    integer        -- days since onset; CHECK between 0 and 36500
  presenting_condition          text           -- location, nature/severity, aggravating and
                                               -- easing factors
  history_presenting_condition  text           -- how/when it started; mechanism (acute/gradual)
  objective_findings            text
  community_question            text           -- what was tried, what worked, what is needed
  checklist_state               jsonb          -- draft working state; NOT the audit record
```

`age_band` and `onset_days` are the **structural** half of de-identification (Section 4): a three-option select and an integer mean the composer has no field anywhere that will accept a date of birth or a calendar date. Checklist items 3 and 4 are therefore enforced by the form's shape rather than trusted to the member — which is what makes them hold even when someone ticks without reading.

`checklist_state` is mutable draft state, cleared on every edit (Section 8). The audit record is the immutable `checklist_snapshot` written at attestation, below.

**`posts.title` and `posts.body` are still populated for a case**, derived from these fields at write time: the title is the presenting condition truncated at a word boundary, and the body is the labelled fields concatenated so EPIC-C's generated full-text column indexes the whole case. Both are a *projection* — `case_details` is canonical, screen C4 renders the structured fields, and the list card pairs the derived title with the author's `community_question` rather than the machine-phrased body. Deriving them rather than adding a title field back to the template is deliberate: the clinical review removed the title, and a screen that demanded one anyway would be overriding it.

The attestation itself lives in `identity.case_attestations` (architecture spec, Section 4.3) — reproduced here for reference, not redefined:

```
identity.case_attestations
  id                 uuid PK
  member_id          uuid FK -> identity.members
  post_id            uuid FK -> community.posts
  attestation_text   text
  checklist_snapshot jsonb          -- the exact checklist state at the moment of attestation
  attested_at        timestamptz
  ip_address         inet
```

`checklist_snapshot` captures the Section 4 checklist as it stood *at the moment of attestation* — not a live reference to some other mutable checklist state — so the audit record is self-contained even if the checklist's own wording changes in a future policy update.

---

## 3. Publish flow

```
1. Draft creation
   POST /v1/case-discussions  { category_id, tag_ids[], <9 template fields> }
   -> community.posts (type=case_discussion, status=draft), community.case_details row
   -- "draft" is a status value EPIC-C's posts.status enum now carries (added for this
      epic, alongside "needs_correction"); see Section 9 and EPIC-C spec §2.

2. Editing
   PATCH /v1/case-discussions/:post_id     -- freely editable while status=draft

3. Checklist completion
   PUT /v1/case-discussions/:post_id/checklist   { the live checklist items, Section 4 }
   -> every live item must be true before step 4 is reachable
      (MVP = six items, since images are deferred; eight when image support lands — Section 4)

4. Attestation and publish
   POST /v1/case-discussions/:post_id/attest     { confirms the Section 5 attestation text }
   -> requires: all checklist items true (server-side re-check, not just a client gate)
   -> writes identity.case_attestations (member_id resolved server-side from the
      caller's session — never supplied by the client)
   -> flips community.posts.status: draft -> published, in the same transaction
      as the attestation write
```

The checklist and attestation are two distinct steps rather than one combined submit, so the UI can show the checklist as a genuine gate (each item individually checkable, reviewable before commitment) with the attestation as a separate, deliberate final action — matching the PRD's own framing of the attestation as something recorded "with timestamp" as a specific event, not incidental to checking the boxes (six at MVP — Section 4).

---

## 4. The de-identification checklist

The eight items are exactly PRD Section 10.2's list — this spec doesn't add or remove any:

1. No patient names, initials, or aliases
2. No address, postcode, or identifying location data
3. No exact date of birth — age expressed as a band (Child / Youth / Adult, per the 2026-08-01 clinical review; the PRD's "40–49 years" example predates it)
4. No exact treatment dates — timelines expressed as relative (a day count since onset)
5. No facility, club, or team name that would uniquely identify the patient
6. No patient photographs showing faces, unique tattoos, scars, or identifying features
7. Images reviewed for embedded metadata — platform strips EXIF automatically; content compliance confirmed
8. No uploaded documents contain patient identifiers

How each item can actually be enforced differs — the PRD frames all eight as checklist items, but they fall into three groups:

| Items | Enforcement | Why |
|---|---|---|
| 1, 2, 5, 8 (names, locations, facility names, document identifiers) | **Attestation only** — checkbox plus the member's signed declaration | The platform cannot algorithmically detect a patient name or a uniquely-identifying facility name in free text (the same limitation the EPIC-B spec notes for handle names encoding a real identity) |
| 3, 4 (age bands, relative dates) | **Structural enforcement — agreed** (Adrian, 2026-07-17): an age-band selector (fixed set of bands, no free date-of-birth field) and a relative-timeline input ("X weeks post-injury") built into the `community.case_details` template | Meaningfully stronger than trusting an author to remember to phrase a free-text field as a band — the identifying value simply can't be entered. Now a settled requirement, not a proposal |
| 6, 7 (image content, EXIF) | **Not applicable at MVP — case discussions are text-only** | Image attachments were **deferred** on privacy grounds (Adrian, 2026-07-17; EPIC-C Section 7). Since no images can be uploaded, checklist items 6 and 7 are dropped from the MVP checklist and restored when image support lands. This is the safest possible resolution — the highest-risk identification vector simply isn't present for launch |

**MVP checklist is six items, not eight**: with images deferred, items 6 (identifying photographs) and 7 (EXIF review) don't apply, so the launch checklist is items 1–5 and 8. The `checklist_snapshot` (Section 2) captures whichever items were live at attestation time, so this reduction is naturally recorded rather than needing a schema change — and when images return, the checklist grows back to eight without any historical attestation becoming inconsistent.

---

## 5. The attestation

Exact wording, PRD Section 10.3:

> *"I confirm that this case discussion is de-identified in accordance with Askapeer's patient privacy policy. I understand that any breach of patient confidentiality is a serious professional and legal matter and may result in permanent removal from the platform and referral to my professional regulatory body."*

Implementation points:

- **The exact text is stored** in `attestation_text`, not just a boolean "attested = true" — if the wording is ever revised, historical attestations remain an accurate record of what the member actually agreed to at the time (architecture spec's audit-immutability philosophy, Section 4.4).
- **`ip_address` is captured server-side** from the request, per the PRD's "recorded with timestamp and linked to the member's verified identity" requirement.
- This is exactly the scenario the architecture spec's Section 4.3 "deliberate exception" describes — no new identity-boundary reasoning is needed beyond pointing at it.

---

## 6. API endpoints

Already laid out in Section 3's flow; reproduced as a flat list for reference:

```
POST /v1/case-discussions
PATCH /v1/case-discussions/:post_id                 -- draft only
PUT   /v1/case-discussions/:post_id/checklist
POST  /v1/case-discussions/:post_id/attest
GET   /v1/case-discussions/:post_id                 -- published view; renders the Section 7
                                                        disclaimer; never exposes attestation_text,
                                                        ip_address, or member_id — those stay behind
                                                        IdentityService per the architecture spec's
                                                        access rules, same as everywhere else
```

A published case discussion is otherwise an ordinary EPIC-C post from that point forward — commentable, taggable, searchable, kudos-able (EPIC-D) — no separate rendering path beyond the disclaimer banner and the structured-field layout instead of a free body.

---

## 7. Disclaimer and priority reporting

Every case-discussion page carries the exact disclaimer text from PRD Section 10.5:

> *"This discussion is for peer learning purposes only. Responses represent individual practitioner perspectives and do not constitute clinical advice. Practitioners remain responsible for applying professional judgement appropriate to their individual clinical context and local scope of practice."*

This is static content rendered by the client on any `type = case_discussion` post — no data-model weight.

**Priority reporting** (PRD Section 10.4): the report category `identifiable_patient_information` (already present in the architecture spec's `community.reports.category` enum, Section 4.2, with `priority boolean generated from category`) must be selectable when reporting *any* case discussion — this epic's responsibility is only to confirm that category exists and is offered on this content type; the queue ordering and moderator actions themselves belong to EPIC-F.

---

## 8. Post-publish editing and corrected resubmission

**Published case discussions are not freely author-editable.** The attestation (Section 5) is tied to a specific `checklist_snapshot` at a specific moment — free edits after publish would let the content diverge from what was attested to, silently invalidating the record's meaning.

**When a correction is genuinely needed** (PRD Section 10.4's "request a corrected resubmission" moderation action, e.g. an `identifiable_patient_information` report is upheld), the mechanics are as follows (agreed by Adrian, 2026-07-17, resolving the "what about kudos and answers?" question):

- **Same post, not a new one.** The correction keeps the original `post_id`. This is the whole answer to the kudos/answers question — a case discussion accrues comments (answers) and kudos, all keyed to `post_id`; creating a fresh post would orphan every one of them. Preserving the post keeps them attached.
- **Immediately unpublished** to a new `needs_correction` state (EPIC-C `posts.status` — Section 9). The identifying content is off public view at once (the urgent safety action), while nothing is destroyed. The **whole thread hides** while in this state — not just the post body — because answers may quote or reference the identifying detail; showing them without the post would be both confusing and potentially still-identifying.
- **Comments and kudos are preserved**, hidden along with the post, and **restored intact on republish**. In particular, **kudos are *not* clawed back** — this is the key distinction from EPIC-F's `remove_content` (which *does* claw back kudos, per EPIC-D Section 7). A corrected resubmission is a *fix-and-restore*, not a removal: the clinical contribution is still valued and stays in the community; only a compliance defect is being cleaned up. Removal ends a contribution; correction preserves it.
- **Author re-edits and re-attests** against a fresh checklist. A new `identity.case_attestations` row is written; the prior one remains in the immutable log, so the record shows the case was corrected and re-attested (not that the original attestation vanished).
- **Scope of a correction is de-identification, not clinical rewriting** — it changes identifying specifics (names, exact dates, unique facility names), not the clinical substance, so existing answers remain relevant when the thread reappears. If a specific *answer* itself contains identifying information, that's handled separately by `remove_content` on that comment, not by correcting the whole case.
- **If the author never resubmits**, the case stays in `needs_correction` indefinitely — which is safe (the identifying content is not public). A timeout after which an un-corrected case is treated as `removed` is worth setting but is not safety-critical, since the content is already off view (flagged in Section 12).

---

## 9. Cross-epic dependencies introduced by this spec

This epic requires two additions to other specs, **actioned 2026-07-17** rather than left as flags:

- **EPIC-C's `community.posts.status` enum** gains **two** values for case discussions: `draft` (the multi-step publish flow, Section 3) and `needs_correction` (the corrected-resubmission state, Section 8). Ordinary questions/answers use only `published`/`removed`; case discussions use all four. Actioned in EPIC-C's spec, Section 2.
- **EPIC-F's moderation-action-type enum** needs `request_correction` (PRD Section 10.4's "request a corrected resubmission"). **Already present** — EPIC-F's spec, Section 3, includes `request_correction`; its effect is now refined there to reference the `needs_correction` state and the preserve-comments-and-kudos semantics above (in particular, that — unlike `remove_content` — it does *not* claw back kudos).

---

## 10. Non-functional notes specific to EPIC-E

- **The attestation write is the one case in this whole epic that crosses into `identity`-schema territory** from an otherwise community-facing flow — exactly the exception the architecture spec documents (Section 4.3). The `POST .../attest` endpoint's implementation needs the same care as `IdentityService`'s own endpoints: it must resolve `member_id` server-side from the session, never accept it from the client, and never echo it back in the response.
- **EXIF stripping** (checklist item 7) is already specified generically at the architecture level (Section 3, S3 worker) — this epic doesn't need its own mechanism, only to confirm image upload exists at all for case discussions specifically (Section 4's flagged gap).

---

## 11. Test plan

- **Checklist gate**: `POST .../attest` is rejected server-side if any checklist item is false, even if the client's own UI would have blocked submission — the server must not trust client-side gating alone.
- **Attestation immutability**: `identity.case_attestations` rows cannot be updated or deleted (INSERT-only grant, same mechanism as `identity.verification_decisions` in the EPIC-A spec).
- **Draft privacy**: a `draft` case discussion is visible only to its author — **not to moderators** (Adrian, 2026-07-17: no moderator visibility before publish) — and must not leak into search, feeds, or another member's `GET /v1/posts` results before publish.
- **Post-publish edit lock**: `PATCH /v1/case-discussions/:post_id` is rejected once `status = published`.
- **Disclaimer rendering**: every case-discussion page includes the exact Section 7 text.
- **Age-band/relative-date structural fields**: a free-text date of birth or absolute treatment date cannot be submitted in fields 3/4 at all, not merely discouraged by the checklist.
- **Corrected resubmission**: `request_correction` moves the case to `needs_correction`, hides the whole thread (post + comments), preserves comments and kudos (no clawback), and on re-attestation restores the thread intact with a new `case_attestations` row (the prior one still present in the immutable log).

---

## 12. Open questions

All resolved by Adrian on 2026-07-17:

- ~~**Structural enforcement of checklist items 3/4**~~ — **resolved: agreed.** Age-band selector and relative-timeline inputs are a settled requirement (Section 4), not just a proposal.
- ~~**Image attachment dependency**~~ — **resolved**: image attachments deferred on privacy grounds (EPIC-C Section 7), so case discussions are **text-only at MVP** and the checklist is six items (1–5, 8). Items 6/7 return when image support lands. See Section 4.
- ~~**EPIC-C schema amendment**~~ — **resolved (actioned)**: EPIC-C's `posts.status` enum gains `draft` and `needs_correction` for case discussions. Done in EPIC-C's spec, Section 2 (Section 9).
- ~~**EPIC-F action-type addition**~~ — **resolved (already present)**: `request_correction` is in EPIC-F's action-type enum; its effect refined there to the `needs_correction` / preserve-kudos semantics (Section 9).
- ~~**Corrected resubmission mechanics**~~ — **resolved**: same post (preserves comments + kudos), unpublished to `needs_correction`, re-attested; kudos are *not* clawed back (distinct from `remove_content`). Full mechanics in Section 8.
- ~~**Draft visibility to moderators**~~ — **resolved: no.** An unattested draft is not visible to moderators before publish — nothing has been published or attested yet, so there's nothing to moderate, and pre-publish visibility would be surveillance overreach inconsistent with the trust model.

**Remaining minor implementation detail** (not a design open question): a timeout after which an un-corrected `needs_correction` case is treated as `removed` (Section 8) — worth setting, but not safety-critical since the content is already off public view.

---

### Clinical review, 2026-08-01 (Andrew Renshaw)

Six questions were put to Andrew ahead of building S9, as a working mockup of the composer (`docs/2026-07-30-case-discussion-mockup.html`). Three were answered and are **built**; three remain open and are **not blocking**, because each changes copy or one list entry rather than the schema.

**Answered and built:**

- ~~**What are the right age bands?**~~ — **resolved: three clinical bands**, Child (0–11) / Youth (12–17) / Adult (18+), replacing the nine demographic decades in the mockup. Decade banding implies a precision the platform neither needs nor wants to carry, and the boundaries that matter in sports medicine are skeletal maturity and adolescent growth, not decades.
- ~~**Are these the right nine fields?**~~ — **resolved: four prose fields**, plus the two structural ones. See Section 2 for the mapping from the PRD's nine and the reasoning.
- ~~**What does the timeline count from?**~~ — **resolved: days since onset.** "Onset" rather than "injury" precisely because overuse and gradual-onset presentations — a large share of sports medicine — have no injury event to count from. Stored as an integer day count (`onset_days`), rendered back in the units a clinician would speak in ("3 weeks since onset").

**Open, and safe to answer after the build:**

- **Does the checklist need a sport-specific item?** In sport the clinical facts alone can identify someone — "23-year-old male, Championship-level footballer, ACL rupture, 3 weeks ago" breaks no listed rule and may describe one findable person. The proposed item is *no combination of sport, level and timing that could identify someone*, with a possible distinction between elite and recreational. **Cost to add: one entry in `CHECKLIST_ITEMS`** (`apps/api/src/cases/case-policy.ts`) — the composer renders the list from the API and the attest route gates on it, so nothing else changes. Note that the answered timeline question sharpens this one rather than settling it: a day count plus a visible publish date gives an approximate onset date, which is exactly the "combination" concern.
- **Consent, and who may read these.** Whether a practitioner needs patient consent to discuss a properly de-identified case, and whether that should be a further checklist item. Same one-line cost as above.
- **Would we really make the regulatory referral?** The attestation promises it, and that sentence is why members read the checklist rather than click through it. An attestation nobody would act on is worse than a softer one that would be. Changing it means editing `ATTESTATION_TEXT`; past attestations are unaffected, since each stores the exact wording it was given.

The build is deliberately shaped so all three land as data rather than as schema: the checklist and the attestation text are served from `GET /v1/case-discussions/policy`, so there is one copy of the policy and the composer cannot drift from what the publish route enforces.
