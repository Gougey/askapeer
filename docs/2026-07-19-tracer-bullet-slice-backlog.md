# Askapeer — Tracer-Bullet Slice Backlog

**Status**: Draft — for review. The last planning artifact before code.
**Date**: 19 July 2026
**Author**: Adrian Hall (Technical Lead), with Claude Code

## Purpose

The specs are organised by *domain* (epics) and the app by *screens*; this document turns both into an **ordered build sequence** of thin, independently-grabbable **vertical slices**.

A **tracer-bullet slice** goes all the way through the stack for one narrow capability — migration → service → API → minimal UI — and produces something **observable end-to-end**. You build thin and complete, then thicken, rather than building all of one layer before the next. Each slice below names what it *delivers* (the observable outcome), what it *touches* (specs), what it *depends on*, and key *notes* (mocks, decisions already applied).

**How to read the tags:**

- **[critical path]** — sequential spine; each blocks the next.
- **[parallel-able]** — can start once its dependency lands, alongside other work.
- **[fast-follow]** / **[deferred]** — post-launch, per resolved decisions.
- **[Must]/[Should]/[Could]** — PRD §6.1 MoSCoW.

The first six slices (S0–S5) are the **walking skeleton of a member and the core thesis loop** — get these working and the platform's central bet is proven end-to-end.

---

## Getting started: infra & UI approach (decided 2026-07-19)

**Infrastructure — prove-then-migrate.** Build the early slices (S0–S5, the thesis) on **Fly.io** (London region — already in use for the docs site / prototype), with **test/synthetic data and mocked verification**, so the core bet is validated fast and cheaply. **Migrate to the approved AWS `eu-west-2` stack before onboarding real practitioners** (real PII + UK-GDPR data residency) and before scale. AWS remains the **production target** (architecture spec) — this is a build-phase choice, not a change to the production architecture; the API-first design makes the host swappable. Local development (Docker Compose: NestJS + Next.js + Postgres + Redis) comes before any deploy.

**UI — build to the style guide.** Do **not** build on the `mobile-lookfeel` prototype (a disposable taster); it is a reference for the bottom-nav *shape* only, not production code. Build **mobile-first** screens straight from the screen & functional spec.

> **Superseded (2026-07-29).** This section originally read *"functional now, style guide later"* — build minimally-styled screens and let the in-progress style guide drop in later as a theming pass. That was right while the guide was being written; it is **no longer the position**. `docs/style-guide/STYLE_GUIDE.md` has landed and is applied to `apps/web`, its values live in `packages/design-tokens`, and CI enforces parts of it (`lint:tokens` fails on raw hex or default Tailwind palette classes; `lint:inputs` on sub-16px controls). New screens are built to the guide.
>
> "Theming pass, not a rewrite" survives, but it means something narrower than it reads here: tokens are defined once and referenced through `var()`, so *changing* the design system propagates without rewriting components. It was never a licence to defer styling.

**Accounts to start applying for now** (business-verification lead times, even though their slices are later): **Onfido** (S2), **Stripe**/processor (S12; FD-2 working target is Stripe), an **email sender** (SES or e.g. Postmark, S10).

---

## S0 — Walking skeleton / infrastructure spine  [critical path]

- **Delivers**: an empty but fully wired system — a deployed Next.js web app that calls a deployed NestJS API that reads a Postgres database, over one trivial path (a `/health` + version rendered on a page). Proves the deploy pipeline, DB connectivity, and front↔back wiring.
- **Touches**: architecture spec (stack, hosting, CI/CD) — this slice **commits the application stack** (NestJS modular monolith, Next.js, Postgres, Redis, BullMQ). **Deploy target for the early phase is Fly.io** (prove-then-migrate — see "Getting started" above); AWS `eu-west-2` remains the production target for the migration before real members.
- **Depends on**: nothing.
- **Notes**: local Docker Compose first; migration framework + one migration; CI to a Fly staging app on merge; the i18n message-catalog scaffold (G-10) and the module-per-epic layout established here so nothing is retrofitted; the themeable UI layer (style guide applied later). No auth, no domain yet.

---

## S1 — Passwordless auth + register → pending holding page  [critical path] [Must]

- **Delivers**: a person can register with professional details, receive a magic link, and land — signed in with a **pending-scoped token** — on the verification holding page showing `pending`.
- **Touches**: EPIC-A (§2 `identity.members`, register, `POST /v1/auth/request-link`, magic-link exchange, `GET /v1/auth/verification-status`); architecture §5.2 (passwordless, access + rotating refresh token, refresh-token lifetime tunables G-11). Screens A1, A2, A3, A5.
- **Depends on**: S0.
- **Notes**: the whole session mechanism lands here (magic link is the one-time bootstrap; persistent session). Duplicate registration → generic 409 (no leak). Anonymity notice shown at registration (mandated surface).

---

## S2 — Automated verification → `approved_verified`  [critical path] [Must]

- **Delivers**: a registered applicant's status moves `pending → approved_verified` via the verification worker; the holding page reflects it live (poll + the pre-handle status-change email).
- **Touches**: EPIC-A (§3 state machine, §5 worker: register lookup + Onfido, `verification_evidence`, `verification_decisions` immutable audit, `POST /v1/auth/verification/resubmit` for `needs_more_info` G-1).
- **Depends on**: S1.
- **Notes**: build against a **mocked `RegisterLookup` + `IdentityCheck` behind interfaces first**, then wire real **HCPC** + **Onfido** (Onfido timeout is a config tunable, 48h default). Auto-approve is the only unattended decision; every other outcome routes to the manual review queue (built in S11-admin). FD-1 determines which registers exist at launch (physio-first → HCPC).

---

## S3 — Handle creation → the app shell  [critical path] [Must]

- **Delivers**: a verified member picks a pseudonymous handle and enters the authenticated **app shell** (bottom nav: Feed / Discussions / ➕ / Activity / Profile — empty screens), with a full handle-scoped session.
- **Touches**: EPIC-B (`GET /v1/handles/availability` G-12, `POST /v1/handles`, `community.handles`, immutability); EPIC-A §7 handoff; the **two-gate access middleware** (§1.2) with the **seed-period billing bypass** (G-15, `billing.paywall_active` off); onboarding acknowledgement recorded (`anonymity_acknowledged_at` G-13) + interest pick (A7). Screens A6, A7, the shell.
- **Depends on**: S2.
- **Notes**: at this point a person can go from nothing → inside the app — the onboarding tracer bullet is complete. Interests (A7) can be a stub picker until the tag vocabulary lands in S4.

---

## S4 — Post a question → list + thread  [critical path] [Must]

- **Delivers**: a member composes a question (category + tags), and sees it in the Discussions list and on its own thread page.
- **Touches**: EPIC-C (§2 `posts`/`comments`/`tags`/`categories`, `POST /v1/posts`, `GET /v1/posts`, `GET /v1/posts/:id` with the §13 thread/list DTOs, `GET /v1/categories`/`tags`); the content-type categories + the seed **tag vocabulary** (loaded via migration for now). Screens D1, D2, C1 (chronological), C4 (read). Search (EPIC-C §4) can attach here or in S7.
- **Depends on**: S3.
- **Notes**: first content slice. Tags are select-only from the seeded vocabulary (admin management is S13). Anonymity reminder in the composer (mandated).

---

## S5 — Answer + kudos + ranking  [critical path] [Must] — *proves the thesis*

- **Delivers**: members answer a question, award/retract kudos, and answers rank by kudos within the thread — the "ideas win on merit, not rank" loop working end-to-end.
- **Touches**: EPIC-C (`POST /v1/comments`, reply composer X3); EPIC-D (`POST`/`DELETE /v1/kudos`, `kudos_total` write, in-thread ranking, self-kudos rejection, the top-contributor badge); the `viewer_context` DTO fields (has_kudosed etc., G-3).
- **Depends on**: S4.
- **Notes**: **this is the key tracer bullet** — the platform's central bet. Kudos clawback on moderation removal wires up in S11.

---

## S6 — Best-answer marker + polls  [parallel-able] [Could, in MVP]

- **Delivers**: a question author marks a best answer (pinned above the ranked list); posts can carry a poll members vote on.
- **Touches**: EPIC-C (`accepted_comment_id` G-5 + `PUT …/accepted-answer`; `community.polls`/`poll_votes` + `POST /v1/polls/:id/vote` G-6, `viewer_vote`).
- **Depends on**: S5.
- **Notes**: small; completes the question surface.

---

## S7 — Discovery: follows, personalised feed, trending, search  [parallel-able] [Should + Must(search)] — **search built 2026-08-02**

> **Status.** The **Must-have half is in**: `GET /v1/search` (EPIC-C §4 — weighted tsvector with tag and category names folded in, `websearch_to_tsquery`, `pg_trgm` typo fallback, `ts_rank_cd` → recency → kudos tiebreak) and screen C3. **Not built**: the personalised feed and the trending fallback — both Should-have and separable, as the note below anticipated.
>
> **Scope narrowed 2026-08-06.** `community.follows` now lands in **S15** (post-follows), which creates the table; S7 adds the `handle` target type and the personalised list that consumes it. **Tag-following is retired** — that half is `community.member_interests`, built in S8b. See `docs/2026-08-06-post-follow-design.md` §2–3 for the reasoning and the EPIC-B §8 amendment it proposes.
>
> Fixed on the way: a tag filter did an **exact match**, so filtering on any parent region returned 0 posts while its subtree held dozens. The composer's picker drops an ancestor when a descendant is chosen precisely because it assumes query-time broadening; that half was missing. Both the list and search now expand a tag to its subtree.
>
> **Outstanding and needing Andrew, not code:** `community.tags.synonyms` was seeded for 11 tags on 2026-08-05 (#92), taking feed classification coverage 45% → 55%; **most of the 588 remain empty**. §4 calls the clinical synonym dictionary the single most important search-quality feature for this audience; it is a data top-up on the existing tags.

- **Delivers**: following a handle shapes the Discussions home; an empty feed falls back to trending; full-text search returns posts.
- **Touches**: EPIC-B (`follows.target_type = handle` — the table itself comes from S15; `POST`/`DELETE /v1/follows`); EPIC-C (§8 personalised feed `GET /v1/feed` + adaptive trending fallback; §4 search `GET /v1/search`, Postgres FTS + `pg_trgm` + synonym dictionary seeded from `tags.synonyms`). Screens C2, C3, C1 (personalised).
- **Depends on**: S4 (posts to follow/search), S3 (handles), S15 (`community.follows`).
- **Notes**: **search is Must-have**, the personalised feed is Should-have — separable in priority though they share the discovery surface. Follow buttons appear on threads/profiles (`follows_*` DTO fields). The tag half of the original personalisation idea is `member_interests` (S8b), not a follow.

---

## S8 — Interests → research / news feed  [parallel-able] [Must] — **COMPLETE 2026-08-04**

> **Status.** Complete. S8a (ingestion, classification, scoring, screens B1/B2) landed
> 2026-08-03; S8b (`member_interests`, the picker at F5, the personalised ranking) on
> 2026-08-04.
>
> **The deferral paid off.** The interests picker was held back deliberately so the shape
> could be chosen from evidence rather than guessed — and the evidence was decisive: only
> **227 of 588 tags have ever matched an article**. The picker is therefore built from
> `research.article_tags` ordered by real article count, showing the count on each chip,
> rather than being a second drill-down through a tree that is two-thirds unreachable.
> Guessing would have produced the wrong screen.
>
> Two findings worth carrying: **`research.article_tags` is a table EPIC-I never specified**
> and the feed cannot work without it (the topic-match half of the score has nowhere else to
> live), and the predicted **false-positive risk from 588 tags was real** — requiring a title
> match for single-word tags cut matches from 3,049 to 1,393 with no loss of good ones.


- **Delivers**: the Feed tab shows research/news articles scored to the member's clinical interests, with "recommended because…" explanations; article detail links out.
- **Touches**: EPIC-I (`member_interests`, `GET`/`PUT /v1/me/interests` G-14; ingestion worker + scoring; `GET /v1/research-feed` + list DTO G-17; `GET /v1/research-feed/:articleId` G-16). Screens B1, B2, F5/A7 interests.
- **Depends on**: S3 (handles/interests), the tag vocabulary (S4's seed).
- **Notes**: a distinct pillar — can proceed in parallel with the forum slices once S3 lands. The research-feed prototype (`prototypes/research-feed/`) is prior art to draw on. MeSH mapping is the internal matching mechanism. Splittable: 8a ingestion+scoring, 8b feed UI.

---

## S9 — Case discussions (checklist + attestation)  [parallel-able] [Must] — *the differentiator* — **built 2026-08-01**

> **Status.** Built. The template is **six fields, not the PRD's nine** — Andrew Renshaw's clinical review on 2026-08-01 answered the three questions that shaped the schema (age bands, field set, what the timeline counts from); see EPIC-E §2 and §12. The other three were closed on 2026-08-01 with **no change** — no sport-specific checklist item (the combination risk is accepted and handled by priority moderation), no consent item, and the attestation wording kept as it stands, since "may result in" states a consequence rather than committing the platform to anything. The correction loop it pairs with — `request_correction`, **S11f (issue #40)** — landed straight after, so the loop is now closed end to end.

- **Delivers**: a member creates a de-identified case discussion through the gated flow — draft → six-item checklist → attestation → publish — with structural age-band/relative-date fields and the disclaimer.
- **Touches**: EPIC-E (`case_details`, `case_attestations` immutable, `POST /v1/case-discussions` draft, `PATCH`, `PUT …/checklist`, `POST …/attest`); EPIC-C `posts.status` `draft`/`needs_correction`; the author-private drafts read (`/v1/me/drafts` G-8/G-21). Screens D3, D4; C4 case rendering.
- **Depends on**: S4 (posts infrastructure).
- **Notes**: highest-value/highest-risk surface — the "no PHI" policy in action. Text-only at MVP (images deferred). `needs_correction` re-attest path pairs with S11 (`request_correction`).

---

## S10 — Notifications (in-app + email)  [parallel-able] [Must] — **built 2026-07-29**

> **Status.** Built, with the scope agreed at the time: the in-app inbox (E1), per-type preferences (F4) and the settings hub (F3), **My questions & answers** (E2, gap G-21), and account-status notices for every moderation action. **Deferred**: real email delivery (the sender is a single stub seam; toggles save but nothing is sent yet), the `identity.member_emails` view (it needs the per-role split), `mention` (needs EPIC-C's parser), the weekly digest (needs `community.follows`, S7), and the push subscription registry (the channel ships inert per §6.2, with the preference stored and greyed). Fixed along the way: **suspension and expulsion previously notified nobody on any channel.**

- **Delivers**: members are notified in-app (Activity tab) and by email for replies, mentions, kudos, and verification/status changes; per-type preferences work.
- **Touches**: EPIC-G (`community.notifications`/`notification_preferences` incl. `push_enabled`; the BullMQ workers reacting to domain events; SES email; the **email-only `identity.member_emails` view**; digest; `verification_status_change` email non-optional). Screens E1, F4.
- **Depends on**: the events it reacts to — S2 (verification), S5 (reply/kudos). 
- **Notes**: **push ships inert** (greyed toggle) per the resolved decision — no delivery at MVP. Weekly digest reads `community.follows` (needs S7).

---

## S11 — Reporting, moderation & audited identity access  [Must] — **complete 2026-08-01**

> **Status.** All of S11 is built: reporting (S11b), the queue (S11c), handle enforcement (S11d), the audited reveal (S11e), the read-only console + verification actions (S11a), and — last — **`request_correction` (S11f, issue #40)**, which was blocked on case discussions and landed once S9 did. All **seven** action types are now live.
>
> Two things worth carrying from S11f. It **does not claw back kudos**, which is the whole reason it is not `remove_content`: a correction says the case is worth keeping, and the answers under it were given in good faith. And it **clears the stored checklist**, without which an author could re-attest unchanged content the moment the notice arrived — the composer would refuse, but the composer is not the gate.

- **Delivers**: any member can report content/handles; a moderator triages a priority-ordered queue and takes actions (remove/warn/suspend/expel/request-correction/rename); the audited reveal-identity action works; the manual **verification review** queue is operable.
- **Touches**: EPIC-F (`community.reports` incl. `handle` target + `anonymity_violation` priority; `moderation_actions` immutable incl. all seven action types; `POST /v1/reports`; `/v1/admin/reports…/action`; `reveal-identity` → `identity_access_log`, field set G-24); EPIC-D kudos clawback on `remove_content`; EPIC-A manual review queue (G4/G5/G6). Screens X1, G1–G6. The **moderator** JWT claim.
- **Depends on**: S4/S5 (content to moderate), S2 (verification review branch).
- **Notes**: where the two founding guarantees (anonymity, no-PHI) are enforced. `suspend`/`expel` wire to the handle/identity status + the session-revocation gate. Needed before opening to real users.

---

## S12 — Subscription, billing gate & lapsed holding  [Must]

- **Delivers**: a member subscribes (Stripe); a lapsed/cancelled subscription gates community access to a reactivation holding page; the provider billing portal manages payment/plan.
- **Touches**: EPIC-H (`billing.subscriptions`/`invoices`/`webhook_events`; `StripeProvider` behind `PaymentProvider`; `subscribe`/`cancel`/`me`/`webhook`/`portal-session` G-19; the billing gate + billing-lapsed token + H2 holding; grace period + `paywall_active` flag G-15 with the seed grace-window). Screens A8, F6, H2.
- **Depends on**: S3 (the gate + shell).
- **Notes**: **can land later than the community slices** precisely because the seed period runs with the billing gate off — free access first, paywall flipped later (business-timed). FD-2 sets real pricing before wiring `StripeProvider` to live numbers.

---

## S13 — Admin configuration surfaces  [Should-operationally] — **tag vocabulary built 2026-08-05**

> **Status.** Screen **G8 (tag vocabulary) is in**, in two phases: synonyms with a dry-run
> preview (#96) and the structural operations — add, rename, re-parent, retire, merge (#98,
> #99). `config.admin_audit_log` was created alongside it; EPIC-J had required it from the
> start and nothing had made it, because nothing was editable until now.
>
> Built because three taxonomy problems surfaced in one week and every one needed a
> developer and a migration: Pelvis has no region, the generic condition groups are
> mis-parented under Cervical Spine, and most tags still match nothing. The synonym loop was
> the worst of it — Andrew sends terms, someone writes SQL, deploys, reclassifies.
>
> **Two spec corrections found while building.** Merge must repoint **three** tables —
> `post_tags`, `research.article_tags` and `community.member_interests` — where EPIC-J names
> only the first, written before the other two existed; missing the last silently deletes
> members' interests. And re-parenting must refuse cycles: every read of `tags` is a
> recursive CTE, so a loop hangs the picker, search and the feed rather than corrupting a row.
>
> **Not built**: G7 (categories), G9 (handle blocklist), G10 (platform settings), and the
> `administrator`/`moderator` claim split — with three founders on an email allowlist that is
> ceremony without benefit.


- **Delivers**: an Administrator manages categories, the tag vocabulary (facet/grouping/synonyms/merge/retire — where Andrew's muscle list loads), the handle blocklist, and tunable settings — instead of migration-seeding.
- **Touches**: EPIC-J (`config` schema, `config.settings`/`handle_blocklist`/`admin_audit_log`; management endpoints; the **administrator** JWT claim, split from moderator). Screens G7–G10.
- **Depends on**: S4 (categories/tags exist), S3 (roles).
- **Notes**: MVP seeds the vocabulary via migration (S4); this slice makes it editable without a deploy. All of EPIC-J is in MVP per the scope decision, but it can land after the forum works.

---

## S14 — Passkeys / biometric sign-in  [fast-follow] [Phase 1.x]

- **Delivers**: after first sign-in, a member enables a passkey and signs in with biometrics; optional app-lock.
- **Touches**: architecture §5.2 (WebAuthn register/assert, `identity.webauthn_credentials`); screens A9, F8.
- **Depends on**: S1 (auth).
- **Notes**: **fast-follow, not initial release** (resolved) — magic-link + persistent session ship first. App-lock offered opt-in/off.

---

## S15 — Follow a discussion  [parallel-able] [Should] — **designed 2026-08-06, not built**

> **Status.** Designed in `docs/2026-08-06-post-follow-design.md`, which is the specification; this entry is the summary. Taken out of S7 and built ahead of it because it is the piece with the best value-to-cost ratio and the only one that needs nothing else first.
>
> **It fixes a defect, not just a gap.** `notifications.service.ts` resolves exactly one recipient per comment — the parent comment's author, else the post author. So answering a question tells you nothing when *someone else* answers it too: the member who contributed is the last to know the discussion moved on. Auto-following on authoring closes that.
>
> **And it delivers the off-switch the product has never had.** The follow row becomes the thread's one subscription record, which `reply` consults too — so unfollowing genuinely silences a thread, and a member can mute one noisy question without turning off reply notifications everywhere. With rows backfilled for existing content it is additive: nobody's current notifications change.
>
> **Retires "tag follow".** EPIC-B §8's `target_type enum(handle, tag)` becomes `enum(handle, post)`; the tag half is already owned by `community.member_interests` (S8b), with a picker over the full taxonomy already in front of members. Three acts, two verbs: follow a discussion, follow a handle, choose your interests.

- **Delivers**: a Follow control on a thread; authoring a post or comment auto-follows it; unfollow mutes the thread outright; later replies arrive as one collapsing notification per thread ("3 new replies on …"); a fourth Activity pane listing followed discussions the member did **not** write in (My Q&A keeps the ones they did).
- **Touches**: EPIC-B (`community.follows` — this slice creates it; `POST`/`DELETE /v1/follows`, `GET /v1/follows/me`); EPIC-G (new `thread_activity` notification type — a migration, per `community.schema.ts:507`'s stated price; sixth row in the F4 matrix); EPIC-C (`viewerContext.isFollowing` on the thread DTO). Screens C4, E1, new E3 (Activity › Following).
- **Depends on**: S4 (posts), S10 (the notification pipeline it reuses wholesale).
- **Notes**: the collapsing upsert in §6 of the design doc is the load-bearing part — without it a busy thread puts one notification per reply into every follower's inbox and the feature gets switched off. Three decisions open (design doc §12), of which the EPIC-B amendment is the only one that changes an existing spec.

---

## Deferred (post-MVP)

- **Saved / bookmarked** (G-22) — shape specced (`community.saves`, EPIC-I §10.2); deferred post-launch.
- **Native iOS/Android** — Phase 2 (the API-first build makes them additive).
- **1:1 messaging, private groups, multi-language delivery, paid surveys, CE/CPD** — PRD Won't-have.

---

## Ordering at a glance

- **Critical path (sequential spine):** S0 → S1 → S2 → S3 → S4 → S5. Nothing else is truly testable until a member can register, verify, get a handle, post, and earn kudos.
- **After S3/S4/S5, these can run in parallel** (team size permitting): S6 (question extras), S7 (discovery), S8 (research feed — most independent), S9 (case discussions), S10 (notifications), S11 (moderation).
- **Can land late:** S12 (billing — seed period buys time), S13 (admin config — migration-seed first).
- **Fast-follow:** S14 (passkeys).

**Minimum launchable set** (Must-haves): S0–S5, S7 (search), S8, S9, S10, S11, S12. S6/S13 desirable; S14 fast-follow.

## Next step

Each slice maps to **one or a few GitHub issues** (a slice may split into migration / API / UI tasks). The `/prd-to-issues` flow can turn this backlog into independently-grabbable issues on `github.com/Gougey/askapeer` when you're ready to start building. Recommended first issue: **S0**, immediately followed by **S1**.
