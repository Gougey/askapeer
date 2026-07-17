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

*Source: EPIC-C spec §3 and §12, EPIC-I spec §5.*

### 1.3 Cross-spec schema amendments needed for EPIC-E

Writing EPIC-E surfaced two small but real changes to specs that were already committed before EPIC-E was drafted:

- **EPIC-C's `community.posts.status` enum** (currently `published, removed`) needs a `draft` value added, to support case discussions' multi-step publish flow (fill template → checklist → attestation → publish). Ordinary forum posts don't need this; case discussions do.
- **EPIC-F's moderation `action_type` enum** needs a `request_correction` value, to match PRD §10.4's "request a corrected resubmission" for case discussions with de-identification problems.

**Status**: EPIC-F's spec has already proposed adding `request_correction` (and, separately, `rename_handle` — see 1.4) to its own action-type enum, which would resolve the second bullet. The `draft` status addition to EPIC-C is not yet reflected back into EPIC-C's committed spec.

**Needs**: confirmation that EPIC-F's proposed resolution is accepted, and a decision on whether to amend EPIC-C's spec directly or treat `draft` as an EPIC-E-specific extension.

*Source: EPIC-E spec §9, EPIC-F spec §3.*

### 1.4 Moderator-forced handle rename — where does it live?

EPIC-B's spec originally proposed a bespoke `POST /v1/admin/handles/:handle_id/rename` endpoint for the case where a handle name itself turns out to be identifying or impersonating. EPIC-F's spec later proposed folding this into its own moderation `action_type` enum as `rename_handle`, on the grounds that a moderator-initiated rename is a moderation action in substance.

**Needs**: confirmation that EPIC-F's resolution is accepted (this is a proposed fix already reflected in EPIC-F's spec, awaiting sign-off rather than being fully open).

*Source: EPIC-B spec §13, EPIC-F spec §3/§10.*

### 1.5 Two independent access-control gates: moderation status and billing status

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
*(No local open questions remain. The moderator-forced rename is covered in §1.4 above; the handle length/character rules, blocklist storage, expulsion/re-registration gap, and tag-follow mechanism are all resolved — see §2.)*

### EPIC-C — Forum
- **Search's PRD hedge**: the PRD lists full-text search as Must-have but flags it "(to be discussed/confirmed)" in the same table row — worth checking whether that hedge is still live or was resolved verbally and never updated in the document.
- **Edit/delete policy**: entirely this spec's own proposal (15-minute no-marker edit window, case-discussion delete restriction, whether kudos-bearing comments should be edit-restricted too) — needs sign-off, no PRD basis.
- **Could-have scope confirmation**: whether best-answer marker, image attachments, or polls are actually being built for MVP, or deferred — a sequencing/resourcing question, not architectural.
- **"Trending" definition**: the personalised feed's fallback view (§8 there) needs a concrete definition (time window, platform-wide vs. category-scoped) — this spec's kudos-in-a-time-window heuristic is only a placeholder.

*(Taxonomy unification is covered in §1.2 above. The personalised feed's underlying follow mechanism is resolved — see §2.)*

### EPIC-D — Kudos
- **Idempotency of a repeated award**: should awarding kudos twice 409, or silently no-op? Minor, but affects client error-handling.
- **Un-award/retract**: this spec's own addition — worth confirming it's wanted, versus kudos being a one-way permanent signal (a deliberate choice some reputation systems make to prevent award/retract gaming).
- **Reputation clawback on moderation**: if a member is warned/suspended for a specific piece of content, should kudos already earned from it be clawed back, or does `kudos_total` stay purely historical? No PRD guidance either way.
- **"Top contributors" leaderboard**: not in the PRD's MVP scope — the Redis leaderboard design assumes it might exist eventually, but it isn't a committed feature. Flagged so it isn't mistaken for confirmed scope.

### EPIC-E — Case Discussions
- **Structural enforcement of checklist items 3/4** (age-banding, relative dates): should these be structurally restricted fields (e.g. an age-band selector) rather than relying purely on the attestation checkbox? This spec recommends yes — a stronger safeguard than the PRD strictly requires — and needs sign-off.
- **Image attachment dependency**: checklist items 6/7 assume case discussions can carry images, but EPIC-C only lists images as Could-have. If case discussions need images to be clinically usable, this may need to become Must-have specifically for this epic.
- **Corrected resubmission mechanics**: does a correction create a new post, or unpublish/re-edit/re-attest the same one? The PRD names the action, not the mechanics.
- **Draft visibility to moderators**: should an unattested, in-progress draft ever be visible to moderation (e.g. a safety escalation before publish)? Likely no, but not addressed by the PRD.

*(The two schema-amendment items are covered in §1.3 above.)*

### EPIC-F — Moderation
- **`anonymity_violation` as a priority report category**: proposed by this spec (on the reasoning that the zero-tolerance anonymity rule is at least as serious as the patient-information rule, which *is* explicitly named as priority in PRD §10.4) but not a PRD-stated requirement — needs explicit confirmation.
- **Should `suspend` also write to `identity.members.verification_status`**: unlike the now-resolved `expel` case (§2 above), this is genuinely open — a handle-level suspension (this epic's action) and the identity-level `suspended` status (EPIC-A's, covering lapsed registration) may or may not be intended as the same event. Lower-stakes than expulsion since suspension is reversible either way, but still needs a decision.
- **No numeric moderation-response SLA**: the PRD's KPIs say response time "must be fast" without a figure — needed before building alerting/staffing plans.
- **Full report-category list**: `harassment`, `spam`, `other` alongside the two priority categories is this spec's own proposal — worth sanity-checking with Andrew given his domain familiarity with what reports will actually look like in practice.

*(The new action-type additions — `request_correction`, `rename_handle` — are covered in §1.3 and §1.4 above. The expulsion/re-registration gap is resolved — see §2.)*

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

*(The billing-lapse access-gating design is covered in §1.5 above.)*

### EPIC-I — Research Feed
- **PRD update still pending**: EPIC-I needs adding to PRD §6.1's MoSCoW list — a standing item, not new.
- **Three carried-forward pre-launch items** (unchanged from the architecture spec): DOAJ integration (predatory-journal check), Retraction Watch/Crossref integration (withdrawn-paper flagging), and a direct enquiry to PEDro about API access. Plus an unresolved abstract-redistribution licensing review, relevant only if a commercial source (Elsevier/Scopus/Cochrane) is ever added.

*(The `member_interests`/`community.follows` unification question is covered in §1.1 above; taxonomy unification in §1.2.)*

---

## 4. Standing PRD/business items

Carried over from the architecture spec's own "Open follow-ups" (Section 11) — not new findings from the per-epic specs, but still open and worth keeping on the same list so nothing gets lost across documents:

- **PRD update**: EPIC-I (research/news feed) should be formally added to the PRD's MVP epic list (§6.1) — a real scope addition Paul Gouge and Andrew Renshaw should be aware of. (Also restated in EPIC-I's own spec, §9.)
- **Legal review**: the right-to-erasure default (hard-delete identity, retain de-linked community content) should be confirmed with legal counsel before launch.
- **DPIA**: a Data Protection Impact Assessment should be commissioned before launch, given the volume of professional-registration data processed.
- **FD-1, FD-3, FD-4, FD-5**: all still formally open stakeholder decisions that the architecture and per-epic specs have designed *against* the PRD's own recommendations for, in order to keep moving — none of these are closed just because a spec assumes an answer.
- **FD-2 (processor/pricing)**: no material architectural impact from the choice itself, but a concrete decision is still needed before EPIC-H's `StripeProvider` implementation can be built against real numbers.
- **FD-6 (university partnership)**: an operational decision, not technical, but touches EPIC-H's trial-length design (§7 there) if it proceeds.
- **FD-7, FD-8**: brand/trademark confirmation and competitor-research refresh — unchanged, no technical dependency.
