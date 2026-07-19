# Askapeer — Screen & Functional Specification (mobile-first)

**Status**: Draft — calibration pass (navigation map + two exemplar screens); exemplar detail approved by Adrian 2026-07-19, with two cross-cutting additions folded in (biometric sign-in §1.6, i18n §1.7)
**Date**: 18 July 2026 (updated 19 July 2026)
**Author**: Adrian Hall (Technical Lead), with Claude Code

## Purpose and scope

This document maps the technical specs (`docs/superpowers/specs/`) onto **how they are surfaced in the app** — the screens a member moves through, what each screen contains, what data it needs, and what actions it offers. It is the missing bridge between the specs (organised by *domain*: verification, kudos, moderation…) and the app (organised by *screens and flows*).

**What this is:**

- A **functional / information-architecture** spec: navigation, per-screen content blocks, the **data each screen needs → which endpoint/DTO provides it**, and the **actions (buttons/gestures) → which API call** they trigger.
- **Mobile-first** — the MVP is a responsive web app (PWA); screens are designed for a phone viewport first.
- A **stress-test of the tech specs**: mapping a screen to concrete data/actions surfaces missing endpoints, under-specified response shapes, and over/under-fetching. Those findings are collected per screen under **Spec-gaps surfaced** and reconciled back into the epic specs (which remain the source of truth).

**What this is *not*:**

- **Not visual design.** No colours, type, spacing, or components — that is the separate style guide. This document stops at *what is on the screen and what it does*.
- **Not exhaustive.** It stays at functional altitude and is a **living document** — building the first tracer-bullet slices will feed corrections back here. It deliberately does not enumerate every micro-state.

## How this drives the build

Once the screen inventory and per-screen data/action mappings exist, the **tracer-bullet slices define themselves**: each slice is "make one screen work end-to-end." Register → holding page is slice 1 because it is the first screen in the first flow. Pipeline: **screen spec → slice backlog → build.**

---

## 1. Global patterns

Cross-cutting conventions specified once here rather than repeated on every screen.

### 1.1 App shell and primary navigation

A persistent **bottom navigation bar** (five destinations) is the app shell for every verified, in-app screen. Agreed high-level model:

| Tab | Label | Purpose | Primary epic(s) |
|---|---|---|---|
| 1 | **Feed** | News + research feed — curated articles scored to the member's clinical interests | EPIC-I |
| 2 | **Discussions** | The forum — personalised post feed, browse, search, threads | EPIC-C / D / E |
| 3 | **➕ (centre)** | Create — chooser for a new **Question** or **Case discussion** | EPIC-C / E |
| 4 | **Activity** | My questions/answers + notifications | EPIC-G + own content |
| 5 | **Profile** | My account, options, news-feed (interest) choices | EPIC-B / G / H / I |

The bottom nav is **only present once a member is verified and inside the app**. Onboarding/auth screens and the two holding pages (verification, billing) render **without** it.

### 1.2 Access gating (two independent gates)

Every in-app screen requires **both** gates to pass (architecture §5.2; resolved open-questions §1.4):

- **Handle/moderation gate** — a handle-scoped token with `community.handles.status = active` (not `suspended`/`expelled`).
- **Billing gate** — a non-lapsed `billing.subscriptions.status`.

Failing either gate routes to a **holding page**, not the app shell:

- Not yet `approved_verified` → **verification holding page** (Screen A5) via a pending-scoped token.
- Billing lapsed/cancelled past grace → **billing-lapsed holding page** (Screen H2) via a billing-lapsed-scoped token.
- Moderation `suspended`/`expelled` → a moderation holding/blocked page (out of MVP screen-detail scope; the token simply isn't handle-scoped).

### 1.3 Standard screen states

Unless a screen says otherwise, each list/detail screen has: **loading** (skeleton), **empty** (contextual prompt), **error/offline** (retry), and **content**. These are not re-listed per screen except where the empty/variant copy is meaningful (e.g. the trending fallback for an empty personalised feed).

### 1.4 Mandated domain surfaces (non-negotiable placements)

The domain rules require specific content to appear in specific places. The screen spec is where those placements are pinned:

- **Zero-tolerance anonymity reminder** — surfaced at **registration**, during **onboarding**, and in **every posting UI** (the create-post and reply composers). (CLAUDE.md domain constraints; PRD §9.3.)
- **De-identification checklist + attestation** — gate the **case-discussion create flow** before publish; cannot be bypassed (EPIC-E).
- **Platform disclaimer** — rendered on every **case-discussion** post (EPIC-E §7).
- **No PHI** — no screen ever invites identifiable patient data; the case template uses structural age-band/relative-date inputs, not free date fields (EPIC-E §4).

### 1.5 Role-scoped areas

Member screens (below, areas A–F) are the MVP focus. **Moderator** and **Administrator** surfaces (area G) are role-gated (two-claim split, EPIC-J §2), share the `/admin/*` shell, and are primarily desktop-web; they are inventoried here but specced later.

### 1.6 Authentication, session & biometric sign-in (added 2026-07-19)

The auth model is **passwordless** (architecture §5.2) — **there is no password to create**. Registration collects professional details; a **magic link** emailed to the member is the *one-time bootstrap* that establishes the session. It is important to separate three distinct layers, because they answer different questions:

- **Session (stay signed in) — automatic, no re-auth per open.** The magic link exchanges for a short-lived **access token (~15 min)** plus a **rotating refresh token** (HttpOnly secure cookie on web; platform secure storage on native). The client silently refreshes the access token in the background, so across closing and reopening the app **the member stays signed in** — no repeat magic link, no biometric needed for day-to-day use.
- **Re-authentication — only when the session actually ends.** A member re-authenticates only when the refresh token is gone: it **expired** (inactivity / max-lifetime window — see gap **G-11**) or was **revoked** (sign-out, moderation `suspend`/`expel`, billing lapse via the revocable-refresh mechanism §7.2 / EPIC-H §4, or a security event). At that point they sign in again — via a **fresh magic link**, *or*, if enabled, an **instant passkey** (this is the passkey's real value: it replaces the *repeat magic link*, not the persistent session).
- **App-lock — optional, a separate privacy feature (DECISION PENDING).** A biometric gate on *every* app open, even while the session is valid, for shared-device privacy. This is independent of session validity. **Recommendation: ship it as an opt-in setting, off by default** — extra privacy for those who want it without forcing friction on everyone. Awaiting Adrian's call.

**Biometric mechanism = a passkey** (WebAuthn platform authenticator: Face ID / Touch ID / Android biometric / Windows Hello). After the first magic-link sign-in, the member is offered **Enable biometric sign-in** (A9), which triggers the OS **permission prompt** and registers a platform passkey. Passkeys are phishing-resistant, first-party (no third party), per-device, and carry unchanged from the PWA to future native apps. Managed in **Settings → Sign-in & security** (F8): enable/disable, list registered devices, revoke.

- **Build-timing is an open decision (MVP vs. fast-follow)** — magic-link + persistent session are sufficient to launch; biometrics are a strong mobile-UX addition. Mechanism logged as spec-gap **G-9** (EPIC-A / architecture §5.2 additions: WebAuthn register/assert endpoints + an `identity.webauthn_credentials` table).

### 1.7 Internationalisation — strings externalised from day one (added 2026-07-19)

- **Every user-facing string** (labels, buttons, messages, empty/error copy, and the mandated anonymity-reminder / disclaimer / attestation text) is referenced by a **message key**, resolved at render time from **per-locale message catalogs** (resource files keyed by id) — never a hardcoded literal in a component.
- **MVP ships a single `en-GB` catalog.** This is a translation-*readiness* discipline, **not** multi-language delivery — shipping other languages remains Won't-have for MVP (PRD §6.1) — but externalising strings now avoids an expensive retrofit when the stated international-expansion aspiration arrives.
- **Not a database table.** UI copy is developer-owned and versioned with the code; a DB "language table" adds query/caching/deploy coupling for no MVP benefit. DB-backed translation is only for user/admin-managed content that needs translating — of which the MVP has essentially none (member posts are authored English content). So: **catalog files, not a DB table.**
- The i18n layer also owns **locale-aware formatting** — dates/relative timelines, numbers, currency (£), and the case-template age-bands — so those aren't hardcoded either.
- **Consequence for this spec:** screen content below is written in English for readability, but each string maps to a message key at build time. Logged as spec-gap **G-10** (a client-architecture / frontend pattern, not an epic change).

---

## 2. Navigation map / screen inventory

Grouped by area. Routes are indicative (mobile-web PWA paths). "Shell" = whether the bottom nav is present.

### A. Onboarding & authentication (pre-shell)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| A1 | Landing / sign-in (magic link; **biometric if a passkey exists** on device) | `/` | no | EPIC-A |
| A2 | Register (professional details) | `/register` | no | EPIC-A |
| A3 | Magic-link sent / check email (passwordless — no password step) | `/auth/sent` | no | EPIC-A (§5.2) |
| A4 | Identity check capture (Onfido document + selfie) | `/verify/capture` | no | EPIC-A (§5B) |
| **A5** | **Verification holding page** (pending / needs_more_info / rejected) | `/status` | no | EPIC-A — **exemplar 1** |
| A6 | Choose handle | `/onboarding/handle` | no | EPIC-B |
| A7 | Onboarding: anonymity acknowledgement + pick interests | `/onboarding/setup` | no | domain rule + EPIC-I |
| A8 | Start subscription / trial (paywall) | `/onboarding/subscribe` | no | EPIC-H |
| A9 | Enable biometric sign-in (permission prompt → register passkey) | `/onboarding/biometric` | no | EPIC-A/auth (§1.6) |

### B. Feed tab — news & research (EPIC-I)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| B1 | Research/news feed home (scored articles) | `/feed` | yes | EPIC-I |
| B2 | Article detail (abstract, source, link out, save) | `/feed/:articleId` | yes | EPIC-I |

### C. Discussions tab — the forum (EPIC-C/D/E/F)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| C1 | Discussions home (personalised feed; trending fallback) | `/discussions` | yes | EPIC-C (§8) |
| C2 | Browse by category / tag | `/discussions/browse` | yes | EPIC-C (§3) |
| C3 | Search (query + results) | `/search` | yes | EPIC-C (§4) |
| **C4** | **Thread / post detail** (question or case discussion) | `/t/:postId` | yes | EPIC-C/D/E/F — **exemplar 2** |

### D. Create (the ➕ button) (EPIC-C/E)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| D1 | Create chooser (Question · Case discussion) | `/create` | overlay | EPIC-C/E |
| D2 | Compose question (category, tags, title, body, optional poll) | `/create/question` | yes | EPIC-C |
| D3 | Compose case discussion (template → checklist → attestation) | `/create/case` | yes | EPIC-E |
| D4 | My drafts (case-discussion drafts / needs-correction) | `/create/drafts` | yes | EPIC-E/C |

### E. Activity tab (EPIC-G + own content)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| E1 | Notifications | `/activity` | yes | EPIC-G |
| E2 | My questions & answers | `/activity/mine` | yes | EPIC-C/D |
| E3 | Saved / bookmarked | `/activity/saved` | yes | EPIC-C (Should-have) |

### F. Profile tab (EPIC-B/G/H/I)

| ID | Screen | Route | Shell | Primary epic |
|---|---|---|---|---|
| F1 | My profile (handle, kudos, badge, post history) | `/profile` | yes | EPIC-B/D |
| F2 | Public handle profile (another member) | `/u/:handle` | yes | EPIC-B |
| F3 | Settings hub | `/settings` | yes | — |
| F4 | Notification preferences (in-app/email/push — push greyed-out) | `/settings/notifications` | yes | EPIC-G |
| F5 | News-feed / interest choices (tag interests) | `/settings/interests` | yes | EPIC-I |
| F6 | Subscription & billing | `/settings/billing` | yes | EPIC-H |
| F7 | Account & legal (policy, terms, sign out) | `/settings/account` | yes | EPIC-A/legal |
| F8 | Sign-in & security (biometric / passkey management) | `/settings/security` | yes | EPIC-A/auth (§1.6) |
| H2 | Billing-lapsed holding page | `/reactivate` | no | EPIC-H (§4) |

### G. Moderator / Administrator (role-gated, `/admin/*`, desktop-first — inventory only)

| ID | Screen | Role | Primary epic |
|---|---|---|---|
| G1 | Moderation report queue | moderator | EPIC-F |
| G2 | Report detail + actions (remove/warn/suspend/expel/request-correction/rename) | moderator | EPIC-F |
| G3 | Reveal identity (audited, reason-coded) | moderator | EPIC-F (§5) |
| G4 | Verification review queue | moderator | EPIC-A (§6) |
| G5 | Applicant detail + decide (approve/reject/needs-more-info) | moderator | EPIC-A |
| G6 | Reapplication-attempts review | moderator | EPIC-A (§6) |
| G7 | Config: categories | administrator | EPIC-J |
| G8 | Config: tag vocabulary (facet/grouping/synonyms; merge; retire) | administrator | EPIC-J |
| G9 | Config: handle blocklist | administrator | EPIC-J |
| G10 | Config: platform settings (thresholds, grace/trial/onfido) | administrator | EPIC-J |

### Global overlays

| ID | Screen | Trigger | Primary epic |
|---|---|---|---|
| X1 | Report content sheet (category + comment) | report action anywhere | EPIC-F |
| X2 | Kudos control (award/retract) | inline on posts/comments | EPIC-D |
| X3 | Compose reply (with anonymity reminder) | answer/reply action | EPIC-C |

---

## 3. Per-screen template

Each fully-specced screen uses these fields:

- **ID / Name / Route / Shell**
- **Purpose** — one line.
- **Access & gating** — token scope, role, verification/billing/content state required.
- **Entry points** — how a member arrives.
- **Exits / navigation** — where they can go.
- **Content blocks** — top-to-bottom on a phone, at content level.
- **Data required → source** — each datum mapped to an endpoint/DTO field.
- **Actions → API** — each button/gesture mapped to an API call or navigation.
- **States & variants** — loading/empty/error plus role/state variants that matter.
- **Mandated surfaces** — any domain-required content (§1.4).
- **Spec-gaps surfaced** — API/spec issues this mapping revealed (feedback to the epic specs).

---

## 4. Exemplar screen 1 — Verification holding page

**ID** A5 · **Route** `/status` · **Shell** none (pre-app-shell)

**Purpose**: tell an unverified applicant exactly where their verification stands and what, if anything, they must do next. This is the *only* screen a non-`approved_verified` session can reach (PRD §8.1 "holding page only").

**Access & gating**: a **pending-scoped token** (EPIC-A §7). Any attempt to reach an in-app route with this token redirects here. No bottom nav.

**Entry points**:

- Immediately after registration (A2) + passwordless sign-in (A3).
- Any subsequent sign-in while `verification_status != approved_verified`.

**Exits / navigation**:

- On transition to `approved_verified` → **Choose handle** (A6).
- **Register again** (rejected state) → Register (A2).
- **Sign out** → Landing (A1).

**Content blocks** (phone, top-to-bottom):

1. Brand mark (minimal, no nav).
2. **Status banner** — the current state, in plain language.
3. **Explanation** — what is happening / what it means.
4. **Next-step action** — state-dependent (see variants); may be none.
5. Secondary: contact/support link; **Sign out**.

**Data required → source**:

| Datum | Source |
|---|---|
| `verification_status` | `GET /v1/auth/verification-status` (EPIC-A §4) |
| `status_updated_at` | same |
| `needs_more_info_reason?` | same (present only in `needs_more_info`) |

**Actions → API**:

| Action | Call / nav |
|---|---|
| (auto) poll status | `GET /v1/auth/verification-status` on an interval |
| Provide requested information (needs_more_info) | **→ no endpoint defined (gap 1)** |
| Register again (rejected) | nav → A2 |
| Sign out | session/token revoke → A1 |

**States & variants**:

- **`pending`** — "We're verifying your registration." Passive; no action beyond waiting; the automated checks (register lookup + Onfido) are in flight. Poll for change.
- **`needs_more_info`** — show `needs_more_info_reason` (e.g. "identity check not completed"); primary action *Provide the requested information*.
- **`rejected`** — show the **generic** rejection message (EPIC-A §2 — deliberately generic, incl. the expelled-reapplication case, so status isn't confirmed to a bad-faith actor); primary action *Register again*.
- Loading / error as §1.3.

**Mandated surfaces**: this screen *is* the PRD-mandated holding page for non-verified states. No community content is reachable from here.

**Spec-gaps surfaced**:

1. **No applicant-facing endpoint to respond to `needs_more_info`.** EPIC-A §4 defines the admin *decide* endpoint and the applicant status *GET*, but nothing lets the applicant **submit additional evidence / re-run the identity check**. The `needs_more_info` reason "identity check not completed" (EPIC-A §8) implies a resumable Onfido capture. **Action:** add an applicant endpoint (e.g. `POST /v1/auth/verification/resubmit` → re-enqueues the check / reopens Onfido) to EPIC-A §4, and define how it re-enters the state machine (`needs_more_info` → `pending`).
2. **Status-change delivery.** How does the applicant learn the status changed — poll only, or also the pre-handle `verification_status_change` email (EPIC-G §4)? **Action:** confirm the holding page polls (define interval) *and* that the email fires; note the pre-handle email path already exists (EPIC-G §4).
3. **Onfido capture placement.** Is A4 (document/selfie capture) always completed before A5, or can it be *resumed* from A5 after abandonment (ties to the 48h `onfido_timeout_hours`, EPIC-A §8)? **Action:** clarify the A4↔A5 relationship in EPIC-A §5/§7 — resolves alongside gap 1.

---

## 5. Exemplar screen 2 — Thread / post detail

**ID** C4 · **Route** `/t/:postId` · **Shell** yes (stacked within Discussions)

**Purpose**: read a discussion in full and participate — answer, award kudos, follow, report; for case discussions, read the structured, de-identified case.

**Access & gating**: handle-scoped token, both gates pass (§1.2). Content-state variants below.

**Entry points**: Discussions feed (C1), Browse (C2), Search results (C3), a notification deep-link (reply/mention/kudos — E1), a profile's post history (F1/F2).

**Exits / navigation**: tag chip → Browse (C2); author → public profile (F2); back → prior screen; report → Report sheet (X1); reply → Compose reply (X3).

**Content blocks** (phone, top-to-bottom):

1. **Header** — back; overflow (report post, follow author, share).
2. **Post block**:
   - Category chip; **title**.
   - **Author row** — handle, kudos total, top-contributor badge (if any), member-since.
   - **Body** — *question type*: free-text body. *Case-discussion type*: the nine structured template fields rendered as labelled sections + the **platform disclaimer** (never a free body).
   - **Tags** — tappable chips.
   - **Kudos control** + count (X2); created/edited timestamp (edited marker only after the 15-min window).
   - **Poll** (if present) — options + result after voting.
3. **Best answer** (if marked) — pinned at the top of the answers list.
4. **Answers section** — count; ordered by **kudos rank** (EPIC-D). Each answer: author row, body, kudos control + count, reply, report, threading indent, edited marker; the post author additionally sees **Mark as best answer**.
5. **Add answer** → Compose reply (X3), carrying the anonymity reminder.

**Data required → source** (the crux — a single composite read):

| Datum | Source epic | In `GET /v1/posts/:post_id`? |
|---|---|---|
| post: title, body, type, status, category, tags, created/edited | EPIC-C | yes |
| author: handle_name, **kudos_total, top-contributor badge**, member_since | EPIC-B + **EPIC-D** | **needs join — gap 2** |
| case_details (9 fields) + disclaimer flag (if case) | EPIC-E | needs inclusion — gap 6 |
| poll + options + counts + **viewer's vote** | EPIC-C | **gap 4** |
| **best_answer_comment_id** | EPIC-C | **gap 3** |
| viewer context: **has_kudosed** (post), **is_author**, **follows_author**, **follows_tag[]** | EPIC-D/B | **gap 1** |
| comments[]: author (+kudos_total/badge), body, kudos_count, **viewer has_kudosed**, parent_comment_id, edited_at, best-answer flag | EPIC-C/D | partial — gaps 1/2 |

**Actions → API**:

| Action | Call |
|---|---|
| Award / retract kudos (post or any answer) | `POST` / `DELETE /v1/kudos` (EPIC-D); button reflects `has_kudosed`; **disabled on own content** (self-kudos rejected) |
| Add answer / reply | `POST /v1/comments` (EPIC-C) |
| Follow author / tag | `POST` / `DELETE /v1/follows` (EPIC-B) |
| Report post / comment / handle | Report sheet (X1) → `POST /v1/reports` (EPIC-F) |
| Mark best answer (author only) | **→ endpoint not defined (gap 3)** |
| Edit (author, within 15-min no-marker window) | `PATCH /v1/posts/:id` or `/v1/comments/:id` (EPIC-C §6) |
| Vote on poll | **→ endpoint not enumerated (gap 4)** |

**States & variants**:

- Loading skeleton; not-found/error.
- **Removed post** (`status = removed`) — body replaced with a removal notice; comments remain readable (EPIC-C).
- **Case discussion in `needs_correction`** — hidden from public: a non-author gets not-found/hidden; the **author** sees a "This case needs correction" banner + edit/re-attest CTA (EPIC-E §8). Requires an `is_author` + status-driven variant.
- **Empty answers** — "Be the first to answer."
- **Viewer is author** — edit controls; Mark-best-answer control on answers.
- **Own content** — kudos control non-interactive (self-kudos rejected, EPIC-D).
- **Expelled/removed author handle** — rendered neutrally; never leak status (EPIC-C §9).

**Mandated surfaces**:

- Case-discussion posts render the **platform disclaimer** (EPIC-E §7).
- The **reply composer** (X3) surfaces the **zero-tolerance anonymity reminder** (§1.4; posting UI).

**Spec-gaps surfaced**:

1. **Viewer-context fields in the thread DTO.** Rendering kudos buttons, follow buttons, and author/edit controls needs per-viewer, per-item state: `has_kudosed` (post + each comment), `is_author`, `follows_author`, `follows_tag[]`. None are specified on EPIC-C's `GET /v1/posts/:post_id`. **Action:** enrich the response DTO with a `viewer_context` block rather than forcing N extra round-trips (mobile latency). Specify in EPIC-C §? / architecture read-model note.
2. **Author reputation in the DTO (cross-epic join).** Every author row (post + each comment) needs `kudos_total` + top-contributor badge — EPIC-B/EPIC-D data returned inside an EPIC-C read. **Action:** define the thread read model to join handle → `kudos_total` + badge; confirm this is EPIC-C's endpoint's responsibility.
3. **Best-answer marker — storage + endpoint.** Best-answer is a Could-have that's **in MVP** (EPIC-C §7), but (a) `community.posts` has no `best_answer_comment_id` column in the schema, and (b) no endpoint sets/unsets it. **Action:** add the column (EPIC-C §2) and an author-only endpoint (e.g. `PUT /v1/posts/:id/best-answer { comment_id | null }`).
4. **Poll — payload + vote endpoint + viewer vote.** `community.polls` / `poll_votes` exist (EPIC-C §7) but the thread DTO's poll payload, the **vote endpoint** (`POST /v1/polls/:id/vote`), and `viewer_vote` are not enumerated. **Action:** add to EPIC-C.
5. **Anonymity-reminder placement confirmed as a build requirement** in the reply composer (X3) and both create composers (D2/D3) — pin in EPIC-C/E as UI-surface requirements (currently a domain rule without an explicit surface list).
6. **`needs_correction` visibility rule** needs an explicit is-author variant at the read layer: non-author → hidden/not-found; author → correction CTA. **Action:** confirm EPIC-C/`GET posts` returns `needs_correction` posts *only* to the author, hidden to others (EPIC-E §8 implies it; make the read-layer rule explicit).

---

## 6. Consolidated spec-gaps from this pass

A first taste of the payoff — mapping just **two** screens surfaced G-1…G-8; Adrian's 2026-07-19 review added G-9…G-10. All are concrete, actionable items for the tech specs:

| # | Gap | Affects | Suggested action |
|---|---|---|---|
| G-1 | No applicant endpoint to respond to `needs_more_info` / resume identity check | EPIC-A §4 | Add `POST .../verification/resubmit`; define `needs_more_info → pending` |
| G-2 | Onfido capture (A4) resumability vs. holding page (A5) | EPIC-A §5/§7 | Clarify A4↔A5; ties to 48h timeout |
| G-3 | Thread DTO lacks per-viewer context (`has_kudosed`, follows, `is_author`) | EPIC-C read model | Add a `viewer_context` block to `GET /v1/posts/:id` |
| G-4 | Author reputation (`kudos_total`, badge) must join into thread DTO | EPIC-C + B/D | Define the thread read model's cross-epic join |
| G-5 | Best-answer marker has no storage column or endpoint | EPIC-C §2 | Add `best_answer_comment_id` + author-only set/unset endpoint |
| G-6 | Poll payload, vote endpoint, and `viewer_vote` not enumerated | EPIC-C §7 | Add poll to thread DTO + `POST /v1/polls/:id/vote` |
| G-7 | Anonymity-reminder UI surfaces not explicitly listed | EPIC-C/E | Pin composer placements as a build requirement |
| G-8 | `needs_correction` author-only visibility not explicit at read layer | EPIC-C/E | Make the read-layer visibility rule explicit |
| G-9 | **Biometric sign-in** has no auth-method mechanism | EPIC-A / architecture §5.2 | Add passkeys (WebAuthn): register/assert endpoints + `identity.webauthn_credentials` table; A9 permission prompt + F8 management screens. **Decide MVP vs. fast-follow** |
| G-10 | **UI strings not externalised** | client-architecture / frontend | Adopt message-catalog i18n (keyed message ids, per-locale files, `en-GB` at MVP); locale-aware formatting; **not** a DB table. Reflect in architecture §7.2 frontend note |
| G-11 | **Refresh-token lifetime / inactivity policy unspecified** | architecture §5.2 | The spec says "rotating refresh token" but not *how long* — this single parameter sets how often members re-authenticate. Pin an explicit value (e.g. sliding inactivity window + absolute max, with rotation + reuse-detection) and make it a **tunable** like the other thresholds (EPIC-J config) |

None are blockers; all are exactly the cheap-to-fix-now, expensive-to-discover-mid-build items this exercise exists to catch. They will be reconciled into the epic specs (the source of truth) as the inventory is fleshed out. **Two items need a decision, not just reconciliation:** G-9's build-timing (MVP vs. fast-follow), and whether to offer the optional biometric **app-lock** (§1.6 — recommendation: opt-in, off by default).

---

## 7. Next steps

1. **Calibrate** — review this pass: is the template altitude right? Is the inventory complete and correctly grouped?
2. On sign-off, **fan out** the remaining member screens (areas A–F), then the admin area (G), each at the same functional altitude.
3. Reconcile the accumulating **spec-gaps** back into the epic specs.
4. Derive the **tracer-bullet slice backlog** from the completed inventory + flows.
