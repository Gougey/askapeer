# Askapeer Technical Specs — Consolidated Open Questions

**Status**: For discussion
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), compiled with Claude Code

Every open question and flagged conflict from the architecture spec and all nine per-epic technical specs (`docs/superpowers/specs/`), gathered into one place for review. This document exists so Adrian, Paul, and Andrew can work through them together rather than hunting across ten documents. Each item names its source spec/section so the fuller reasoning can be looked up if needed. Items get moved to Section 2 as they're decided, rather than deleted, so the document also serves as a decision log.

Organised in four parts:

1. [Cross-epic conflicts and gaps](#1-cross-epic-conflicts-and-gaps) — issues that span more than one spec and need a single coordinated answer
2. [Already resolved](#2-already-resolved) — decided, kept here for traceability
3. [Per-epic open questions](#3-per-epic-open-questions) — smaller items local to one spec
4. [Standing PRD/business items](#4-standing-prdbusiness-items) — carried over from the architecture spec, not new

---

## 1. Cross-epic conflicts and gaps

These are the items most worth discussing as a group, since a decision on one may constrain the others.

### 1.1 `member_interests` vs. `community.follows` — possible duplicate concepts

EPIC-I's `community.member_interests` (a *weighted* interest signal used to score research-article relevance) and EPIC-B's `community.follows` with `target_type = tag` (a *binary* follow relationship, resolved 2026-07-14 — see Section 2) are both, conceptually, "a member's interest in a topic." They could be unified into one mechanism feeding both the research feed and the forum's personalised feed, or deliberately kept separate since they serve different content types with different scoring needs.

**Needs**: a deliberate choice — not an assumption either way.

*Source: EPIC-I spec §4.*

### 1.2 Taxonomy unification (three unreconciled vocabularies)

The forum's category/tag taxonomy (EPIC-C, FD-4's hybrid model), Andrew Renshaw's existing body-area list (referenced in PRD §15/FD-4), and the research-feed prototype's `taxonomy.json` (`prototypes/research-feed/data/taxonomy.json`, whose own README already flags it as "a starting point... not the final FD-4 forum taxonomy") are three overlapping-but-not-identical lists right now. EPIC-I's `member_interests.tag` depends on whichever vocabulary EPIC-C settles on.

**Needs**: FD-4 formally closed (still an open stakeholder decision, not just an implementation detail) and a single controlled vocabulary chosen before EPIC-C or EPIC-I can be built as specced.

**Input available**: `docs/2026-07-17-taxonomy-standards-research.md` researches standard medical taxonomies as candidate anchors — recommends a curated member-facing list (from Andrew's body-part list) mapped to **MeSH** (the vocabulary PubMed/Europe PMC already index with, so it unifies the forum tags and the research feed for free), with **OSIICS v16** (CC BY, sports-medicine-native) as a reference for the injury/condition tags. Both are free and machine-readable. Pending the conversation with Andrew.

*Source: EPIC-C spec §3 and §12, EPIC-I spec §5; taxonomy-standards research note.*

### 1.3 Moderator-forced handle rename — where does it live?

EPIC-B's spec originally proposed a bespoke `POST /v1/admin/handles/:handle_id/rename` endpoint for the case where a handle name itself turns out to be identifying or impersonating. EPIC-F's spec later proposed folding this into its own moderation `action_type` enum as `rename_handle`, on the grounds that a moderator-initiated rename is a moderation action in substance.

**Needs**: confirmation that EPIC-F's resolution is accepted (this is a proposed fix already reflected in EPIC-F's spec, awaiting sign-off rather than being fully open).

*Source: EPIC-B spec §13, EPIC-F spec §3/§10.*

### 1.4 Two independent access-control gates: moderation status and billing status

EPIC-H proposes that community access requires **both** a `community.handles.status` of `active` (EPIC-B/F's concern) **and** a non-lapsed `billing.subscriptions.status` (EPIC-H's concern) — deliberately kept as two separate gates rather than one combined status, on the reasoning that a moderation suspension and a billing lapse are different in kind (resolved by an appeal vs. resolved by paying). This is new design not anticipated by the architecture spec.

**Needs**: sign-off that two independently-checked gates is the right model, and that reusing EPIC-A's pending-token pattern for a new "billing-lapsed" token scope is an acceptable mechanism.

*Source: EPIC-H spec §4.*

---

## 2. Already resolved

Decided, kept here for the record rather than deleted.

- **The missing tag-follow mechanism — resolved 2026-07-14.** Three PRD features assumed a member could "follow a tag" — EPIC-C's Should-have personalised feed ("tags **and handles** followed"), EPIC-G's Should-have email digest ("top-kudos content in **followed tags**") — but EPIC-B originally only specified `community.handle_follows` (following a *handle*), not a tag equivalent. **Adrian asked**: what's the recommendation, and are handles and tags being confused as the same thing? **Answer**: they're not the same thing (a handle is *who*, a tag is *what*) — the PRD itself already treats "follow" as one verb applying to both target types, so there's no need for separate terminology. The real duplication risk was three separate "interest" mechanisms (handle-follows, a not-yet-built tag-follow, and EPIC-I's weighted `member_interests`), not the handle/tag distinction itself. **Decision**: generalise EPIC-B's `community.handle_follows` into a single `community.follows` table (`follower_handle_id`, `target_type` enum of `handle`/`tag`, `target_id`) — the same `target_type`/`target_id` discriminator pattern already used by `community.kudos` and `community.reports`, not a new modelling idiom. EPIC-B keeps ownership (it already owned the narrower table and the follow endpoints); EPIC-C's personalised feed (now specified, its spec §8) and EPIC-G's weekly digest (its spec §7) are read-only consumers filtering `WHERE target_type = 'tag'`. `member_interests` (EPIC-I) remains a deliberately separate, weighted mechanism — whether *that* should eventually be unified with `community.follows` is its own still-open question (Section 1.1, above). *(EPIC-B spec §8/§9/§13; EPIC-C spec §8/§9/§12; EPIC-G spec §7/§11; EPIC-I spec §4/§9.)*
- **The expulsion/re-registration gap — resolved 2026-07-14.** `identity.members.verification_status` (EPIC-A) had no `expelled` value, while `community.handles.status` (EPIC-B) does — so when EPIC-F's `expel` action set a handle to `expelled`, nothing updated the identity-side status, and as specced a permanently expelled practitioner could re-register with the same professional credentials and get a brand-new handle. **Adrian's decision**: add an `expelled` value to `identity.members.verification_status`; if an expelled member attempts to re-register, the attempt must be prevented *and* logged/reviewed, not just silently rejected. Implemented as: the architecture spec's `identity.members` schema now includes `expelled` (Section 4.1, amended); EPIC-F's `expel` action writes both `community.handles.status = expelled` and an `identity.verification_decisions` transition to `expelled`, atomically (its spec, §3, §7); EPIC-A's existing uniqueness constraint blocks any non-`rejected` status by construction, so `expelled` is covered automatically, and a blocked attempt now additionally writes to a new `identity.reapplication_attempts` table, surfaced via `GET /v1/admin/reapplication-attempts` for admin review (EPIC-A spec, §2, §6, §8). One related sub-question remains open — see EPIC-F's per-epic list in Section 3, and the exact applicant-facing rejection wording — see EPIC-A's per-epic list in Section 3. *(Architecture spec — amendment note above §1; EPIC-A spec §2/§6/§8/§10/§11; EPIC-B spec §10/§13; EPIC-F spec §3/§7/§9/§10.)*
- **FD-5 professional contact link**: confirmed **not** to build a LinkedIn/contact-link field on the handle profile. EPIC-B's spec had already flagged that the PRD's FD-5 discussion (recommending such a field, §16) directly conflicts with the PRD's own zero-tolerance anonymity rule (§9.3, "deliberately identifying yourself" is an expulsion offence). Decision: leave it out. *(EPIC-B spec §1, §13.)*
- **Handle length/character rules — resolved 2026-07-17.** Agreed by Adrian: **3–30 characters, alphanumeric plus underscore/hyphen**. Not a PRD requirement, but now settled rather than a placeholder. *(EPIC-B spec §3, §13.)*
- **Handle-name blocklist storage — resolved 2026-07-17.** Config table, not a code constant — so profession-specific terms (specialty names, credentials, professional-body abbreviations) can be added without a deploy, since they can't be fully enumerated upfront. *(EPIC-B spec §3, §11, §13.)*
- **Search design — resolved 2026-07-17.** Stays in PostgreSQL for MVP (no third-party engine — Algolia-style SaaS ruled out on trust/data-residency grounds; self-hosted OpenSearch kept as a documented later upgrade). Firmed up as: weighted `tsvector` + GIN, `websearch_to_tsquery`, `pg_trgm` for typo tolerance, and a clinical synonym dictionary (ACL ⇄ anterior cruciate ligament, etc.). The synonym dictionary is seeded from the tag vocabulary — so it has a forward dependency on FD-4/taxonomy (§1.2), and MeSH entry-terms give the synonyms largely for free if the tag→MeSH mapping is adopted. Resolves the PRD's "(to be discussed/confirmed)" hedge on Search. *(EPIC-C spec §4, §12.)*
- **Forum edit/delete policy — resolved 2026-07-17.** Agreed: 15-minute no-marker edit window, `edited_at` shown after, author self-delete as soft-delete for ordinary posts, moderator-only removal for attested case discussions. *(EPIC-C spec §6, §12.)*
- **Could-have scope + image-attachment deferral — resolved 2026-07-17.** Best-answer marker and polls are **in MVP**; **image attachments are deferred** (remain a future Could-have) on privacy grounds — images are the highest-risk vector for inadvertent patient identification (faces, tattoos, scars, EXIF, identifiable settings), which EXIF-stripping alone can't mitigate. Knock-on effect: EPIC-E case discussions are **text-only at MVP**, so the de-identification checklist is six items (1–5, 8) not eight; items 6/7 (image content, EXIF) return when image support lands. The `checklist_snapshot` records whichever items were live at attestation, so no schema change is needed for the reduction or its later restoration. *(EPIC-C spec §7, §12; EPIC-E spec §4, §12.)*
- **"Trending" fallback-feed definition — resolved 2026-07-17.** Platform-wide, with an **adaptive** time window (start 24h; widen 24h → 7d → 30d → all-time until ≥ N results, proposed N = 10), ranked by kudos with recency tiebreak. Adaptive rather than fixed-24h to avoid an empty fallback feed at low launch volume — the fallback is a new member's first impression, so it must never look dead. *(EPIC-C spec §8, §12.)*
- **EPIC-D (kudos) — all four questions resolved 2026-07-17.** (1) **Repeated award** = silent no-op, not 409. (2) **Retract** is supported. (3) **Moderation clawback** = yes: kudos on moderation-removed content is reversed out of the author's `kudos_total` (author self-delete does *not* claw back — the clawback keys on *why* content was removed). (4) **No public leaderboard**, but the same kudos ranking drives a **top-contributor badge** (top ~1% of active handles above a minimum floor, tunable) — consistent with the no-ego thesis since the badge is merit-earned, not rank/seniority. Introduces one new coupling: EPIC-F's `remove_content` now triggers the EPIC-D clawback. *(EPIC-D spec §3, §6, §7, §9, §10; EPIC-F spec §3.)*
- **EPIC-F (moderation) — all four local questions resolved 2026-07-17.** (1) **`anonymity_violation` is a priority report category**, alongside `identifiable_patient_information`. The zero-tolerance anonymity rule (PRD §9.3/9.5) is a founding guarantee described in equally-or-more-severe terms than the patient-privacy rule; leaving it in the ordinary queue would be an odd asymmetry. (2) **`suspend` does *not* write to `identity.members.verification_status`** — a handle-level moderation suspension and the identity-level `suspended` status (EPIC-A's lapsed-registration state) are deliberately separate events, resolved by different means (appeal vs. re-verification). Unlike `expel`, there's no re-registration loophole to close, since suspension is reversible and doesn't release the credential for reuse — the same "two independent gates" logic as §1.4. (3) **Working moderation-response SLA targets adopted** — priority (PHI / anonymity) reports < 4h, standard reports < 48h — marked illustrative pending ops/staffing sign-off from Paul (same "working example" status as the pricing figure), so alerting/staffing plans have a concrete number to build against. (4) **Five-category working report list accepted** (2 priority + `harassment`/`spam`/`other`) so the report form is buildable; the three non-priority categories remain **flagged for Andrew Renshaw's domain review** and may change once he weighs in. *(EPIC-F spec §4, §7, §8, §9, §10.)*
- **EPIC-E (case discussions) — all questions resolved 2026-07-17, including the former cross-epic schema-amendment item (old §1.3).** (1) **Structural enforcement of checklist items 3/4** (age-band selector, relative-timeline input) — agreed, now a settled requirement. (2) **Corrected resubmission mechanics** — Adrian's "what about kudos/answers?" question settled it: **same post** (preserves comments + kudos), unpublished to a new `needs_correction` state, whole thread hidden, author re-attests to restore; **kudos are *not* clawed back** (the key distinction from `remove_content` — correction is fix-and-restore, not removal). (3) **Draft visibility to moderators** — **no**, unattested drafts are not visible before publish. (4) **Schema amendments actioned**: EPIC-C's `posts.status` gains `draft` and `needs_correction` (case-discussion-only); EPIC-F's `request_correction` effect refined to the `needs_correction`/preserve-kudos semantics. (5) Image dependency already resolved (images deferred → six-item checklist). *(EPIC-E spec §4, §8, §9, §11, §12; EPIC-C spec §2; EPIC-F spec §3.)*

---

## 3. Per-epic open questions

Smaller items, local to a single spec, not part of a larger cross-epic conflict.

### EPIC-A — Verification
- **BASRAT/SST register access unconfirmed**: whether either body publishes a queryable API or only a manual/scrape-only register — determines whether automated verification is even possible for these two bodies, or whether they're manual-review-only from day one.
- **Rejection cooldown/reapplication**: should a rejected applicant be able to resubmit immediately (current design allows this), and should a reviewing admin see the prior rejection?
- **Appeals process**: the PRD doesn't describe one beyond reapplying from scratch — worth confirming whether MVP needs something more formal.
- **Onfido webhook timeout**: 72 hours is this spec's own placeholder, not sourced from Onfido's actual typical turnaround.
- **Identity-access-log boundary**: confirm that routine admin verification-queue review is correctly *not* treated as an `identity_access_log` event — this is an interpretation of PRD §9.4, not an explicit statement.
- **Exact applicant-facing rejection wording for the expelled-reapplication case** (§2 above): this spec proposes a generic message that doesn't confirm expelled status to the applicant — worth a final check that this is the right call versus a legal/compliance preference for more explicit language.

### EPIC-B — Handles/Profile
*(No local open questions remain. The moderator-forced rename is covered in §1.3 above; the handle length/character rules, blocklist storage, expulsion/re-registration gap, and tag-follow mechanism are all resolved — see §2.)*

### EPIC-C — Forum
*(No local open questions remain. Taxonomy unification is covered in §1.2 above; the search design, edit/delete policy, Could-have scope, "trending" fallback definition, and personalised-feed follow mechanism are all resolved — see §2.)*

### EPIC-D — Kudos
*(No local open questions remain — all four resolved 2026-07-17; see §2.)*

### EPIC-E — Case Discussions
*(No local open questions remain — all resolved 2026-07-17; see §2. One minor implementation detail (a timeout for un-corrected cases) noted in the spec's §12, not a design question.)*

### EPIC-F — Moderation
*(No local open questions remain — all four resolved 2026-07-17; see §2. One residual downstream dependency: the three non-priority report categories (`harassment`/`spam`/`other`) are accepted as a working set but flagged for Andrew Renshaw's domain review, and the moderation-response SLA targets are illustrative pending ops sign-off from Paul — neither blocks building. The `rename_handle` action-type ownership is covered in §1.3 above; `request_correction` and the expulsion/re-registration gap are resolved — see §2.)*

### EPIC-G — Notifications
- **Column-level hardening of `NotificationService`'s identity access**: should a database view restrict it to `email` only (rather than relying on application discipline over a full-table grant on `identity.members`)? Recommended, not yet built.
- **Non-optional `verification_status_change` email**: this spec proposes members can't disable this one notification channel, since it's account-critical — needs confirmation that removing member control here is acceptable.
- **Digest cadence/unsubscribe mechanics**: assumed weekly, email-only per the PRD's own naming — no further design done beyond that assumption.

*(The tag-follow mechanism the digest depends on is resolved — see §2.)*

### EPIC-H — Subscription/Payments
- **FD-2 itself**: pricing, trial length, and processor choice (Stripe vs. WorldPay) all still formally open — this spec is written to be indifferent to the outcome, but a concrete choice is needed to actually build against.
- **Grace period length**: 7 days (before a `past_due` subscription loses access) is this spec's own placeholder.
- **Cancellation access timing**: this spec proposes access continues until the end of the paid period, not immediate revocation — standard SaaS practice, but needs confirming as a deliberate choice.
- **Trial-length configurability**: the data model allows a per-cohort trial length (relevant to the university-partnership idea, FD-6), but no invite-code/cohort feature is designed — needs a decision once FD-6 is confirmed one way or the other.

*(The billing-lapse access-gating design is covered in §1.4 above.)*

### EPIC-I — Research Feed
- **PRD update still pending**: EPIC-I needs adding to PRD §6.1's MoSCoW list — a standing item, not new.
- **Three carried-forward pre-launch items** (unchanged from the architecture spec): DOAJ integration (predatory-journal check), Retraction Watch/Crossref integration (withdrawn-paper flagging), and a direct enquiry to PEDro about API access. Plus an unresolved abstract-redistribution licensing review, relevant only if a commercial source (Elsevier/Scopus/Cochrane) is ever added.

*(The `member_interests`/`community.follows` unification question is covered in §1.1 above; taxonomy unification in §1.2.)*

### EPIC-J — Administration & Configuration (added 2026-07-17)
New epic (a scope addition, like EPIC-I) giving a single owner to the platform's reference-data and settings management — categories, tag vocabulary, search synonym dictionary, handle blocklist, and tunable thresholds — surfaces that earlier specs called "admin-managed" but none owned. Local open questions:

- **PRD update**: EPIC-J is beyond the PRD's original eight-epic list — should be added to §6.1 / the roadmap when the PRD is next revised (same status as EPIC-I). Arguably always implied by the PRD's Administrator persona.
- **New `config` schema**: introduces a fifth schema (an architecture amendment) — vs. putting config tables in `community`. Recommended as-is; needs an explicit nod.
- **Administrator/Moderator role split**: refines the architecture spec's single "moderator-role claim" (§5.3) into two claims. Confirm before build.
- **Billing config boundary**: do trial-length/cohort settings live in EPIC-J's settings store or stay in EPIC-H? Recommendation: semantics stay in EPIC-H.
- **MVP trimming**: categories, blocklist, and settings management are needed for launch; tag-merge and the synonym dictionary are deferrable within the epic.

*(EPIC-J was created in response to Adrian's question, 2026-07-17, about where admin/config functions should live — decided: a dedicated epic, not folded into EPIC-F. See `docs/superpowers/specs/2026-07-17-epic-j-administration-configuration-technical-spec.md`.)*

---

## 4. Standing PRD/business items

Carried over from the architecture spec's own "Open follow-ups" (Section 11) — not new findings from the per-epic specs, but still open and worth keeping on the same list so nothing gets lost across documents:

- **PRD update**: EPIC-I (research/news feed) **and EPIC-J (administration & configuration)** should be formally added to the PRD's MVP epic list (§6.1) — both are real scope additions beyond the original eight that Paul Gouge and Andrew Renshaw should be aware of. (Also restated in each epic's own spec.)
- **Legal review**: the right-to-erasure default (hard-delete identity, retain de-linked community content) should be confirmed with legal counsel before launch.
- **DPIA**: a Data Protection Impact Assessment should be commissioned before launch, given the volume of professional-registration data processed.
- **FD-1, FD-3, FD-4, FD-5**: all still formally open stakeholder decisions that the architecture and per-epic specs have designed *against* the PRD's own recommendations for, in order to keep moving — none of these are closed just because a spec assumes an answer.
- **FD-2 (processor/pricing)**: no material architectural impact from the choice itself, but a concrete decision is still needed before EPIC-H's `StripeProvider` implementation can be built against real numbers.
- **FD-6 (university partnership)**: an operational decision, not technical, but touches EPIC-H's trial-length design (§7 there) if it proceeds.
- **FD-7, FD-8**: brand/trademark confirmation and competitor-research refresh — unchanged, no technical dependency.
