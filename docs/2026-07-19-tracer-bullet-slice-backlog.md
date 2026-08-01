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

## S7 — Discovery: follows, personalised feed, trending, search  [parallel-able] [Should + Must(search)]

- **Delivers**: following a tag/handle shapes the Discussions home; an empty feed falls back to trending; full-text search returns posts.
- **Touches**: EPIC-B (`community.follows`, `POST`/`DELETE /v1/follows`); EPIC-C (§8 personalised feed `GET /v1/feed` + adaptive trending fallback; §4 search `GET /v1/search`, Postgres FTS + `pg_trgm` + synonym dictionary seeded from `tags.synonyms`). Screens C2, C3, C1 (personalised).
- **Depends on**: S4 (posts to follow/search), S3 (handles).
- **Notes**: **search is Must-have**, the personalised feed is Should-have — separable in priority though they share the discovery surface. Follow buttons appear on threads/profiles (`follows_*` DTO fields).

---

## S8 — Interests → research / news feed  [parallel-able] [Must]

- **Delivers**: the Feed tab shows research/news articles scored to the member's clinical interests, with "recommended because…" explanations; article detail links out.
- **Touches**: EPIC-I (`member_interests`, `GET`/`PUT /v1/me/interests` G-14; ingestion worker + scoring; `GET /v1/research-feed` + list DTO G-17; `GET /v1/research-feed/:articleId` G-16). Screens B1, B2, F5/A7 interests.
- **Depends on**: S3 (handles/interests), the tag vocabulary (S4's seed).
- **Notes**: a distinct pillar — can proceed in parallel with the forum slices once S3 lands. The research-feed prototype (`prototypes/research-feed/`) is prior art to draw on. MeSH mapping is the internal matching mechanism. Splittable: 8a ingestion+scoring, 8b feed UI.

---

## S9 — Case discussions (checklist + attestation)  [parallel-able] [Must] — *the differentiator* — **built 2026-08-01**

> **Status.** Built. The template is **six fields, not the PRD's nine** — Andrew Renshaw's clinical review on 2026-08-01 answered the three questions that shaped the schema (age bands, field set, what the timeline counts from); see EPIC-E §2 and §12. Three review questions remain open and were deliberately not blocking, because each is one line of data: a sport-specific checklist item, patient consent, and whether the attestation's regulatory-referral promise is one we would act on. **Deferred**: `request_correction` — the moderator action that puts a published case into `needs_correction` — is **S11f (issue #40)**, so the author-side re-attest path exists and works but nothing can currently trigger it.

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

## S11 — Reporting, moderation & audited identity access  [Must]

- **Delivers**: any member can report content/handles; a moderator triages a priority-ordered queue and takes actions (remove/warn/suspend/expel/request-correction/rename); the audited reveal-identity action works; the manual **verification review** queue is operable.
- **Touches**: EPIC-F (`community.reports` incl. `handle` target + `anonymity_violation` priority; `moderation_actions` immutable incl. all six action types; `POST /v1/reports`; `/v1/admin/reports…/action`; `reveal-identity` → `identity_access_log`, field set G-24); EPIC-D kudos clawback on `remove_content`; EPIC-A manual review queue (G4/G5/G6). Screens X1, G1–G6. The **moderator** JWT claim.
- **Depends on**: S4/S5 (content to moderate), S2 (verification review branch).
- **Notes**: where the two founding guarantees (anonymity, no-PHI) are enforced. `suspend`/`expel` wire to the handle/identity status + the session-revocation gate. Needed before opening to real users.

---

## S12 — Subscription, billing gate & lapsed holding  [Must]

- **Delivers**: a member subscribes (Stripe); a lapsed/cancelled subscription gates community access to a reactivation holding page; the provider billing portal manages payment/plan.
- **Touches**: EPIC-H (`billing.subscriptions`/`invoices`/`webhook_events`; `StripeProvider` behind `PaymentProvider`; `subscribe`/`cancel`/`me`/`webhook`/`portal-session` G-19; the billing gate + billing-lapsed token + H2 holding; grace period + `paywall_active` flag G-15 with the seed grace-window). Screens A8, F6, H2.
- **Depends on**: S3 (the gate + shell).
- **Notes**: **can land later than the community slices** precisely because the seed period runs with the billing gate off — free access first, paywall flipped later (business-timed). FD-2 sets real pricing before wiring `StripeProvider` to live numbers.

---

## S13 — Admin configuration surfaces  [Should-operationally]

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
