# Askapeer — Screen & Functional Specification (mobile-first)

**Status**: Draft — **screen inventory fully mapped**. Exemplars approved 2026-07-19; cross-cutting patterns (auth/session/biometric §1.6, i18n §1.7); **all member areas A–F and the admin area G specced (§6)**. Next: reconcile the G-1…G-24 spec-gaps into the epic specs, resolve the open decisions, and derive the slice backlog.
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

## 6. Member screen specifications

Fanned-out specs for the member-facing screens, at functional altitude. **A5** (verification holding page) and **C4** (thread/post detail) are specced above as exemplars (§4, §5) and not repeated. Simple screens are kept brief; richer screens carry the full template. New spec-gaps continue the numbering (G-12+) and are consolidated in §7.

### 6.A — Onboarding & authentication

The first flow: unauthenticated → verified → handle → in-app. No bottom-nav shell until it completes. This flow contains **tracer-bullet slice 1** (A1→A2→A3→A5).

#### A1 — Landing / sign-in · `/` · no shell

- **Purpose**: entry point for a returning or new user; start sign-in or registration.
- **Access**: unauthenticated.
- **Content**: brand; **Sign in** (magic link) primary; **Register** secondary; if a **passkey exists on this device**, a **Sign in with biometric** option (§1.6).
- **Actions → API**: Sign in → `POST /v1/auth/request-link { email }`; Sign in with biometric → WebAuthn assertion (gap G-9); Register → A2.
- **States**: default; passkey-present variant (biometric affordance shown).

#### A2 — Register (professional details) · `/register` · no shell

- **Purpose**: collect the details needed to verify a practitioner.
- **Access**: unauthenticated.
- **Content**: form — email; **professional body** picker; **registration number**; **registration country** (UK-only at MVP, field present per EPIC-A §2); the **zero-tolerance anonymity notice** (mandated surface §1.4); submit.
- **Data → source**: professional-body options — the `professional_body` enum (`hcpc`, `gmc`, `basrat`, `sst`); *which are offered at launch depends on FD-1* (physio-first → HCPC primary).
- **Actions → API**: Submit → `POST /v1/auth/register` (EPIC-A §4) → `201 {member_id, pending}` or `409` duplicate → A3. On `409`, show the generic "you may already have an account" message (no info leak).
- **States**: validation errors (per field); duplicate (generic); submitting.
- **Spec-gaps**: **G-18** — the professional-body picker's launch options are FD-1-dependent; confirm the launch set (not a new mechanism, a scope link).

#### A3 — Magic-link sent / check email · `/auth/sent` · no shell

- **Purpose**: tell the user a sign-in link was emailed; there is **no password**.
- **Content**: confirmation ("We've emailed a sign-in link to …"); resend; change email; help.
- **Actions → API**: Resend → `POST /v1/auth/request-link` (rate-limited, EPIC-A §9); the link itself lands the user authenticated → routes by status (→ A4/A5 or, if already verified with a handle, the app).
- **States**: sent; resend cooldown.

#### A4 — Identity check capture (Onfido) · `/verify/capture` · no shell

- **Purpose**: capture the document + selfie that binds the person to the registration (EPIC-A §5B).
- **Access**: pending-scoped token.
- **Content**: the Onfido SDK capture flow (document, then selfie), embedded; guidance copy.
- **Actions → API**: hands off to Onfido SDK → Onfido posts back via webhook (EPIC-A §5); on completion → A5.
- **States**: capture steps; upload; abandoned/resume (ties to gaps G-1/G-2 — resumability).
- **Spec-gaps**: see **G-1/G-2** (resuming an abandoned capture; the applicant-side path).

#### A6 — Choose handle · `/onboarding/handle` · no shell

- **Purpose**: pick the pseudonymous handle (EPIC-B) — the first post-verification step.
- **Access**: `approved_verified`, pre-handle token.
- **Content**: handle input with **live availability + rule feedback** (3–30 chars, alphanumeric + `_`/`-`, not on blocklist); explanation that the handle is **permanent** (no self-rename, EPIC-B §6); confirm.
- **Actions → API**: check availability (as-you-type) → **gap G-12**; confirm → `POST /v1/handles` (EPIC-B) → mints handle-scoped session → A7.
- **States**: available / taken / invalid / blocked; confirming.
- **Spec-gaps**: **G-12** — no handle-availability endpoint is specified; needs `GET /v1/handles/availability?name=` (uniqueness + blocklist + rule check) for real-time feedback rather than only failing on submit.

#### A7 — Onboarding setup: anonymity acknowledgement + interests · `/onboarding/setup` · no shell

- **Purpose**: record the member's acknowledgement of the zero-tolerance rule, and seed their clinical interests (feeds the research feed + personalised forum feed).
- **Access**: handle-scoped.
- **Content**: (1) the **zero-tolerance anonymity rule** in full + an explicit **acknowledgement** control (mandated surface §1.4); (2) **pick interests** — selectable tags from the unified vocabulary, grouped by facet/region (EPIC-I / `community.tags`).
- **Actions → API**: acknowledge → **gap G-13** (record it); set interests → **gap G-14**; continue → A8 (or the app, if seed period).
- **Spec-gaps**: **G-13** — is the onboarding anonymity acknowledgement *recorded* (timestamped against the member) for compliance, as the case attestation is? Currently unspecified. **G-14** — needs a selectable-tags read (facet-filtered `community.tags`) and a bulk **set-interests** write (`member_interests`, EPIC-I) — neither enumerated.

#### A8 — Start subscription / trial · `/onboarding/subscribe` · no shell

- **Purpose**: begin the subscription/trial (EPIC-H).
- **Access**: handle-scoped.
- **Content**: plan(s) + trial terms; payment capture (Stripe Elements handoff, EPIC-H §6); the pricing figures are FD-2-illustrative.
- **Actions → API**: subscribe → `POST /v1/billing/subscribe { plan }` (EPIC-H §6) → provider client step → the app.
- **Spec-gaps**: **G-15** — monetisation specifies a **free seed period before the paywall** (PRD §11): during the seed period A8 is skipped/deferred, and the billing gate (§1.2) is inactive. The *trigger* that switches the paywall on is undefined — needs an EPIC-H seed-period flag/decision.

#### A9 — Enable biometric sign-in · `/onboarding/biometric` · no shell

- **Purpose**: offer to register a passkey for future biometric sign-in (§1.6).
- **Content**: benefit explanation; **Enable** (→ OS permission prompt → WebAuthn registration); **Skip for now**.
- **Actions → API**: Enable → WebAuthn registration ceremony → store credential (gap G-9); Skip → the app.
- **States**: permission granted / denied / unsupported device (hide the option gracefully).
- **Spec-gaps**: **G-9** (mechanism); build-timing decision.

### 6.B — Feed tab (news & research, EPIC-I)

#### B1 — Research/news feed home · `/feed` · shell

- **Purpose**: the default tab — a feed of research/news articles scored to the member's interests (EPIC-I).
- **Access**: in-app (both gates).
- **Content**: a ranked list of **article cards** (title, source/journal, date, one-line "**recommended because it matches your interest in X**", save control); pull-to-refresh; infinite scroll.
- **Data → source**: `GET /v1/research-feed` (EPIC-I §6) — scored articles + explanation strings, computed from `member_interests` × precomputed article scores.
- **Actions → API**: open article → B2; save/bookmark → save endpoint (EPIC-I — see G-16); adjust interests → F5.
- **States**: loading (skeleton cards); **empty — no interests set** → prompt to pick interests (→ F5/A7); error/offline.
- **Spec-gaps**: **G-17** — the **article-summary list DTO** (card fields) isn't enumerated in EPIC-I §6; specify it.

#### B2 — Article detail · `/feed/:articleId` · shell

- **Purpose**: read an article's summary and link out to the source.
- **Content**: title; authors; source/journal + date; **abstract**; tags/facets matched; **Open source** (external link, opens in browser); **Save**; provenance/quality flags if any (e.g. retraction/predatory — future, EPIC-I §7 carry-forwards).
- **Data → source**: single-article read — **see G-16** (may not exist yet).
- **Actions → API**: Open source → external URL; Save → save endpoint (G-16).
- **Spec-gaps**: **G-16** — EPIC-I §6 specifies the *feed*; a **single-article GET** and a **save/bookmark** endpoint + store aren't enumerated. Confirm whether article detail reads from the feed payload or a dedicated endpoint, and where saves live (member-scoped, `community`-side).

### 6.C — Discussions tab (the forum, EPIC-C/D/E)

#### C1 — Discussions home · `/discussions` · shell

- **Purpose**: the forum landing — a personalised feed of posts, with a trending fallback.
- **Access**: in-app.
- **Content**: a list of **post summary cards** (category chip, title, author handle + kudos/badge, tag chips, answer count, post kudos count, snippet, timestamp, best-answer indicator); the **➕ create** affordance (centre nav); a browse/search entry (header).
- **Data → source**: personalised feed = posts in the member's **followed tags + handles** (`community.follows`, EPIC-C §8); **trending fallback** (adaptive window, kudos-ranked) when the personalised feed is sparse (EPIC-C §8).
- **Actions → API**: open → C4; create → D1; browse → C2; search → C3; follow/unfollow from a card (optional).
- **States**: personalised content; **empty personalised → trending fallback** (never a dead screen — EPIC-C §8); loading; error.
- **Spec-gaps**: **G-17** (shared) — the **post-summary list DTO** (card fields incl. author kudos/badge join and counts) isn't enumerated in EPIC-C; specify it (the list-surface analogue of the thread DTO gaps G-3/G-4).

#### C2 — Browse by category / tag · `/discussions/browse` · shell

- **Purpose**: explore the forum by content-type category or by clinical tag.
- **Content**: **category** list (content-type: Clinical Case / Research / Career / Equipment / General); **tag** browser grouped by facet (region / muscle / structure / pathology) and Upper/Lower-limb grouping (EPIC-C §3); selecting a filter → a filtered post list (post-summary cards as C1).
- **Data → source**: `community.categories` + `community.tags` (facet/grouping) — the read side of EPIC-J-managed vocabulary; filtered posts via the same list DTO (G-17).
- **Actions → API**: pick category/tag → filtered list; open post → C4; follow a tag → `POST /v1/follows` (EPIC-B).
- **States**: default; retired categories/tags hidden from the browser (EPIC-J retire).

#### C3 — Search · `/search` · shell

- **Purpose**: full-text search across posts, answers, and tags.
- **Content**: query input; results as post-summary cards; possibly a tag-match section; recent/suggested (optional).
- **Data → source**: `GET /v1/search?q=…` (EPIC-C §4) — Postgres FTS (weighted `tsvector` + `pg_trgm` typo tolerance + the clinical synonym dictionary seeded from `community.tags.synonyms`). Synonym/typo expansion is server-side and invisible to the client.
- **Actions → API**: submit query → results; open → C4; tag chip → C2.
- **States**: idle/prompt; results; **no results** (suggest broadening / check spelling — trgm already softens this); loading.
- **Spec-gaps**: **G-17** (shared list DTO) applies to results.

### 6.D — Create (the ➕ button, EPIC-C/E)

#### D1 — Create chooser · `/create` · overlay

- **Purpose**: pick what to create. Opened by the centre ➕ nav.
- **Content**: two choices — **Question** (a discussion / ask) and **Case discussion** (structured, de-identified); a one-line description of each; the case-discussion option carries a "de-identification required" hint.
- **Actions → nav**: Question → D2; Case discussion → D3; dismiss → back.
- **Note**: exactly two post types (`posts.type`); no third "story" type.

#### D2 — Compose question · `/create/question` · shell

- **Purpose**: create a `type = question` post (publishes immediately — EPIC-C, no draft state for questions).
- **Content**: **category** picker (content-type: Clinical Case / Research / Career / Equipment / General); **tags** — *selected from the curated vocabulary*, facet-grouped, multi-select (members cannot create new tags — EPIC-C §3); **title**; **body**; **optional poll** (attach question + options); the **zero-tolerance anonymity reminder** (mandated §1.4); post.
- **Data → source**: categories + selectable tags (read side of EPIC-J-managed vocabulary).
- **Actions → API**: Post → `POST /v1/posts { category_id, type: "question", title, body, tag_ids[], poll? }` (EPIC-C) → C4.
- **States**: editing; validation (category required, title/body required); submitting.
- **Spec-gaps**: **G-6** (poll payload on create); **note** — confirm tag application is *select-only* from the vocabulary (no free-text tag creation), consistent with admin-managed tags.

#### D3 — Compose case discussion · `/create/case` · shell

- **Purpose**: the gated, multi-step case-discussion flow (EPIC-E) — the platform's highest-value/highest-risk surface.
- **Access**: handle-scoped.
- **Content & flow** (EPIC-E §3):
  1. **Draft** — category (Clinical Case) + tags + the **nine structured template fields**; fields 3/4 use a **structural age-band selector** and **relative-timeline input** (no free date-of-birth / absolute-date fields — EPIC-E §4). `status = draft`.
  2. **Edit** — freely editable while draft.
  3. **De-identification checklist** — the **six** live items at MVP (1–5, 8; image items 6/7 absent — text-only, EPIC-E §4); every item must be true to proceed.
  4. **Attestation** — the attestation text; confirm → server re-checks the checklist → publish (`status = published`).
- **Data → API**: `POST /v1/case-discussions` (draft), `PATCH …` (edit), `PUT …/checklist`, `POST …/attest` (EPIC-E §6).
- **States**: draft; checklist-incomplete (attest blocked, server-enforced); published; **`needs_correction`** (moderator requested a correction → banner + re-edit + re-attest, EPIC-E §8).
- **Mandated surfaces**: de-id checklist + attestation gate; structural age-band/relative-date fields; the **platform disclaimer**; anonymity reminder (all §1.4 / EPIC-E).
- **Note**: the nine-field template on a phone needs progressive disclosure (a mobile density concern for the style guide, not a spec gap).

#### D4 — My drafts & corrections · `/create/drafts` · shell

- **Purpose**: resume unpublished case-discussion **drafts** and handle **`needs_correction`** cases (both author-private).
- **Content**: list of my posts where `status ∈ {draft, needs_correction}`; each opens the D3 flow at the right step; delete-draft.
- **Data → source**: an **author-scoped** read including `draft`/`needs_correction` (which are hidden from everyone else) — **gap G-21**.
- **Actions → API**: open → D3; delete draft → delete.
- **Spec-gaps**: **G-21** — this author-private read (drafts + needs_correction) isn't enumerated; distinct from public list reads because of the visibility rule (G-8).

### 6.E — Activity tab (EPIC-G + own content)

#### E1 — Notifications · `/activity` · shell

- **Purpose**: the member's notification inbox.
- **Content**: reverse-chron list — `reply`, `mention`, `kudos_received`, `verification_status_change` (post-handle, e.g. a suspension notice); each shows type, actor handle (where applicable), snippet, timestamp, read/unread; unread badge on the tab.
- **Data → source**: `GET /v1/notifications?cursor=&unread_only=` (EPIC-G §8).
- **Actions → API**: tap → deep-link (C4 / comment / status); mark read → `PATCH /v1/notifications/:id/read`; mark all → `POST /v1/notifications/read-all`.
- **States**: unread/read; empty ("You're all caught up"); loading. Push delivery is inert at MVP (EPIC-G §6.2) — no effect on this in-app list.

#### E2 — My questions & answers · `/activity/mine` · shell

- **Purpose**: the member's own **published** contributions and their reception.
- **Content**: my questions/case discussions and my answers, each with kudos count + best-answer status; tabbed or sectioned (Questions · Answers).
- **Data → source**: an **author-scoped** content read (published only; drafts live in D4) — **gap G-21**; card fields per the list DTO (**G-17**).
- **Actions → API**: open → C4.
- **States**: content; empty ("You haven't posted yet"); loading.

#### E3 — Saved / bookmarked · `/activity/saved` · shell

- **Purpose**: quick access to saved posts (and saved articles). *Should-have* (EPIC-C) — candidate to defer.
- **Content**: saved posts (and, if unified, saved research articles from B2).
- **Data → source**: a **saves store** + endpoints — **gap G-22** (not specified; also the home of B2's article saves, G-16).
- **Actions → API**: open → C4 / B2; unsave.
- **Spec-gaps**: **G-22** — the bookmark/save mechanism (posts and articles) has no table or endpoints; decide scope (MVP Should-have vs. defer).

### 6.F — Profile & settings (EPIC-B/G/H/I)

#### F1 — My profile · `/profile` · shell

- **Purpose**: the member's own pseudonymous profile.
- **Content**: handle; **kudos total**; **top-contributor badge** (if qualifying, EPIC-D §6); member-since; **my post history**; entry to Settings (F3).
- **Data → source**: `GET /v1/handles/me` (EPIC-B) + author-scoped post history (G-21).
- **Note / gap G-23**: by the anonymity model, the profile likely has **no member-editable identity fields** (no real name, employer, bio-that-could-identify; handle is immutable — EPIC-B §6). Confirm whether *anything* is editable here (e.g. an optional non-identifying blurb) or whether "profile editing" is purely the settings screens. Pin the answer.

#### F2 — Public handle profile · `/u/:handle` · shell

- **Purpose**: view another member's handle (never real identity).
- **Content**: their handle, kudos total, badge, member-since, public post history; **Follow**; **Report** (→ X1).
- **Data → source**: `GET /v1/handles/:handle` — the public projection (EPIC-B; never real identity).
- **Actions → API**: follow/unfollow → `POST`/`DELETE /v1/follows` (EPIC-B); report handle → X1 → `POST /v1/reports` (target_type=handle).
- **States**: normal; an `expelled`/`suspended` handle renders neutrally — never leak status (EPIC-B/C §9).

#### F3 — Settings hub · `/settings` · shell

- **Purpose**: navigation to the settings screens.
- **Content**: links → Notifications (F4), Interests (F5), Subscription (F6), Account & legal (F7), Sign-in & security (F8).

#### F4 — Notification preferences · `/settings/notifications` · shell

- **Purpose**: per-type notification control across the three channels.
- **Content**: a matrix of notification type × channel (**in-app**, **email**, **push**): `verification_status_change` **email is locked on** (non-optional, EPIC-G §6.1); **push toggles are greyed-out / "coming soon"** (inert at MVP, EPIC-G §6.2); the weekly digest has an email toggle (unsubscribe).
- **Data → API**: `GET /v1/notification-preferences`; change → `PUT /v1/notification-preferences { type, in_app_enabled, email_enabled, push_enabled }` — rejects disabling the verification email.
- **Note**: this screen is a direct validation of the resolved EPIC-G decisions; no new gaps.

#### F5 — Interests / news-feed choices · `/settings/interests` · shell

- **Purpose**: manage the clinical interests that drive the research feed + personalised forum feed.
- **Content**: the selectable tag vocabulary, facet-grouped (region/muscle/structure/pathology), each toggle on/off; current selections reflected.
- **Data → API**: selectable-tags read + current interests + bulk set — **gap G-14** (shared with A7).
- **States**: default; saving.

#### F6 — Subscription & billing · `/settings/billing` · shell

- **Purpose**: view and manage the subscription (EPIC-H).
- **Content**: plan; **status** (trialing / active / past_due / cancelled) with the meaningful detail (trial days left; `current_period_end`; grace note if past_due); **cancel** (access continues to period end); **update payment**; **change plan**; **reactivate** (if lapsed).
- **Data → API**: `GET /v1/billing/me` (EPIC-H §6); cancel → `POST /v1/billing/cancel`.
- **Spec-gaps**: **G-19** — **manage-subscription endpoints** beyond subscribe/cancel/me — **update payment method** and **change plan** — aren't enumerated in EPIC-H §6.
- **States**: trialing / active / past_due (grace) / cancelled (access to period end). Cross-ref **H2** when access is actually revoked.

#### F7 — Account & legal · `/settings/account` · shell

- **Purpose**: legal surfaces, the member's own email, sign-out, and account deletion.
- **Content**: the **zero-tolerance anonymity policy**, terms, privacy; the member's **real email** (shown only to themselves); **sign out**; **delete account / request data erasure**.
- **Actions → API**: sign out → session/refresh revoke; delete account → an erasure flow — **gap G-20**.
- **Spec-gaps**: **G-20** — the architecture sets a right-to-erasure *default* (hard-delete identity, retain de-linked community content) but flags it for legal review; the **member-facing deletion request flow + endpoint** are unspecified. Needs both a decision (legal) and an endpoint. GDPR-relevant.

#### F8 — Sign-in & security · `/settings/security` · shell

- **Purpose**: manage biometric sign-in (§1.6).
- **Content**: **passkey management** — enable/disable, list registered devices (label + last-used), revoke a device; the optional **app-lock** toggle (if that decision lands as opt-in).
- **Data → API**: WebAuthn credential list; register/remove ceremonies — **gap G-9**.
- **States**: no passkeys (offer to add) / passkeys present. App-lock toggle present only if the app-lock decision is "yes".

#### H2 — Billing-lapsed holding page · `/reactivate` · no shell

- **Purpose**: the billing analogue of the verification holding page — access is paused; reactivate to restore it (EPIC-H §4, gate §1.2).
- **Access**: **billing-lapsed-scoped token** — only billing endpoints + this view are reachable; no community content.
- **Content**: "Your access is paused"; the reason (lapsed/cancelled past period); **Reactivate** (payment); sign out.
- **Data → API**: `GET /v1/billing/me`; reactivate → subscription payment flow → on success, restores the handle-scoped session.
- **Note**: distinct from a **moderation** block (suspend/expel) — different token, different resolution path (pay vs. appeal), per the two-gate model (§1.2).

### 6.G — Moderator & Administrator (role-gated, `/admin/*`)

**Desktop-first**, not mobile — these are operator surfaces in the *same* Next.js app (architecture §7.2), gated by the two-claim split (EPIC-J §2): **Moderator** sees moderation + verification (G1–G6); **Administrator** sees configuration (G7–G10); one person may hold both at MVP. *(Screen IDs here are G1–G10, distinct from the hyphenated spec-gap IDs G-1…)*

The admin surfaces map cleanly onto the well-specified EPIC-F / EPIC-A / EPIC-J — a good sign those specs were thorough. Only one small new gap (G-24).

#### G1 — Moderation report queue · `/admin/reports` · moderator

- **Purpose**: triage reported content/handles.
- **Content**: queue ordered **priority tier first** (`identifiable_patient_information`, `anonymity_violation`), then by age within tier (EPIC-F §4); each row: category (priority flag), target type (post/comment/handle), snippet/handle, age, status; an **overdue** indicator against the working SLA (priority < 4h, standard < 48h — EPIC-F §8); filter by status.
- **Data → API**: `GET /v1/admin/reports?status=open&cursor=` (EPIC-F §6).
- **Actions → API**: open → G2.

#### G2 — Report detail + actions · `/admin/reports/:id` · moderator

- **Purpose**: review a report and take a moderation action.
- **Content**: the reported content/handle **in context** (operates on `handle_id` only — viewing a report does **not** reveal real identity, EPIC-F §5); category; reporter comment; the **action controls** — `remove_content`, `warn`, `suspend`, `expel`, `request_correction` (case discussions), `rename_handle` — each requiring a `reason`; a separate, prominent **Reveal identity** action (→ G3).
- **Data → API**: `GET /v1/admin/reports/:report_id` (EPIC-F §6).
- **Actions → API**: `POST /v1/admin/reports/:report_id/action { action_type, target_handle_id, reason, …type-specific }` (EPIC-F §6). Effects wire to other epics: `remove_content` → EPIC-D kudos clawback; `expel` → writes handle + identity status atomically; `request_correction` → `needs_correction`; `rename_handle` → `new_handle_name` (reuses EPIC-B validation).
- **Mandated**: every action writes an immutable `community.moderation_actions` row.
- **States**: open → actioned / dismissed.

#### G3 — Reveal identity (audited) · `/admin/handles/:id/reveal-identity` · moderator

- **Purpose**: the **explicit, separately-logged** crossing of the identity boundary — the platform's most sensitive action.
- **Content**: a **reason_code** selector (`reported_violation` | `legal_request` | `safety_escalation`) + **reason_note**; confirm; *then* the real identity fields are shown. The friction is deliberate.
- **Data → API**: `POST /v1/admin/handles/:handle_id/reveal-identity { reason_code, reason_note }` → writes `identity.identity_access_log` → returns identity (EPIC-F §5).
- **Mandated**: every access immutably logged with moderator identity, reason, timestamp (PRD §9.4 / domain constraint).
- **Spec-gaps**: **G-24** — the identity **field set** returned by reveal-identity isn't enumerated (legal_name, email, professional_body, registration_number, country?); pin it for this screen (EPIC-F §5).

#### G4 — Verification review queue · `/admin/verification` · moderator

- **Purpose**: review applicants who need a human decision.
- **Content**: queue of `pending` (post-worker) + `needs_more_info`, ordered oldest-first with `needs_more_info` ahead of fresh `pending` (EPIC-A §6); **no** priority category (unlike moderation); each row: professional body, evidence outcomes, status, age.
- **Data → API**: `GET /v1/admin/verification-queue?status=pending,needs_more_info&cursor=` (EPIC-A §4).
- **Actions → API**: open → G5.

#### G5 — Applicant detail + decide · `/admin/verification/:memberId` · moderator

- **Purpose**: review one applicant's evidence and decide.
- **Content**: submitted fields; `verification_evidence` rows (register_lookup + onfido_check outcomes, raw results); prior decisions; **prior rejection(s) for the same professional-registration identity** (the reapplication-history resolution, EPIC-A §6); decision controls — approve / reject (reason) / request-more-info (reason).
- **Data → API**: `GET /v1/admin/verification-queue/:member_id` (EPIC-A §4) — a legitimate `IdentityService` read, **not** an `identity_access_log` event (EPIC-A §9, confirmed).
- **Actions → API**: `POST /v1/admin/verification-queue/:member_id/decide { to_status, reason }` (EPIC-A §4). approve → applicant prompted to choose a handle; reject/needs_more_info → notification (EPIC-G).
- **Mandated**: every decision writes an immutable `identity.verification_decisions` row.

#### G6 — Reapplication-attempts review · `/admin/reapplications` · moderator

- **Purpose**: awareness of **blocked** reapplications (an expelled member attempting to re-register) — not a decision queue (the registration was already auto-blocked).
- **Content**: `identity.reapplication_attempts` rows (matched member, attempted details, timestamp), newest first — to judge whether a repeat/aggressive pattern warrants operational escalation (e.g. legal referral).
- **Data → API**: `GET /v1/admin/reapplication-attempts` (EPIC-A §6).

#### G7 — Config: categories · `/admin/config/categories` · administrator

- **Purpose**: manage the content-type category list.
- **Content**: categories (name, description, sort_order, retired?); create / edit / reorder / **retire** (not hard-delete — `retired_at`, EPIC-J §4).
- **Data → API**: `POST /v1/admin/categories`, `PATCH …/:id`, reorder, retire (EPIC-J §6). Every mutation writes `config.admin_audit_log`.

#### G8 — Config: tag vocabulary · `/admin/config/tags` · administrator

- **Purpose**: manage the **single unified tag vocabulary** (incl. loading Andrew's forthcoming muscle list).
- **Content**: tags with **facet** (region/muscle/structure/pathology), **parent grouping** (Upper/Lower limb), **synonyms**, internal `mesh_id`; **add** (with facet/grouping/synonyms), **merge** (fold duplicates → repoint `post_tags`, retire loser), **retire**.
- **Data → API**: EPIC-J tag management (add/merge/retire); the search **synonym dictionary seeds from `community.tags.synonyms`** — so synonym maintenance is *per-tag here*, not a separate screen (a consistency win from the taxonomy resolution).
- **Note**: all of this (incl. merge + synonyms) is in MVP per the EPIC-J scope decision.

#### G9 — Config: handle blocklist · `/admin/config/blocklist` · administrator

- **Purpose**: manage the handle-name blocklist.
- **Content**: blocklist terms (categorised); add / remove.
- **Data → API**: `config.handle_blocklist` (EPIC-J); EPIC-B's creation-time validation *reads* it (and feeds the G-12 availability check), this *writes* it. Audited.

#### G10 — Config: platform settings · `/admin/config/settings` · administrator

- **Purpose**: edit the tunable thresholds surfaced across the specs.
- **Content**: key/value settings with descriptions + current values — badge percentile (EPIC-D), trending window/N (EPIC-C), `billing.grace_period_days`, `billing.default_trial_days` (EPIC-H), `verification.onfido_timeout_hours` (EPIC-A), and the refresh-token lifetime (G-11) if adopted; edit.
- **Data → API**: `config.settings` (EPIC-J §3); edit value → `PUT` (writes `config.admin_audit_log`).

---

## 7. Consolidated spec-gaps from this pass

The running list of concrete, actionable items the mapping surfaced across the **complete** screen inventory. G-1…G-8 (exemplars); G-9…G-11 (auth review, 2026-07-19); G-12…G-18 (member areas A–C); G-19…G-23 (areas D–F); G-24 (admin area G).

**Reconciliation status** (folding gaps back into the epic specs):

- **Batch 1 done (2026-07-19)** — **G-3, G-4, G-5, G-6, G-7, G-8, G-17, G-21** → EPIC-C (new §13: thread/list DTOs, `accepted_comment_id` column, poll-vote + accepted-answer + author-scoped endpoints, visibility & anonymity-reminder rules); **G-9, G-10, G-11** → architecture §5.2/§2 (passkeys + `identity.webauthn_credentials`, refresh-token lifetime tunables, i18n) + EPIC-J config keys; **G-12, G-23** → EPIC-B (`GET /v1/handles/availability`, no editable profile).
- **Remaining** (batch 2) — G-1, G-2 (EPIC-A verification resubmit/resume); G-13 (EPIC-A acknowledgement); G-14, G-16, G-22 (EPIC-I interests/article/saves); G-15, G-19 (EPIC-H seed-trigger/manage-subscription); G-20 (EPIC-A/legal erasure); G-24 (EPIC-F reveal fields); G-18 (FD-1 scope).

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
| G-12 | **No handle-availability endpoint** (A6) | EPIC-B | Add `GET /v1/handles/availability?name=` (uniqueness + blocklist + 3–30/charset rules) for live feedback, rather than only failing on `POST /v1/handles` |
| G-13 | **Onboarding anonymity acknowledgement not recorded** (A7) | EPIC-A / domain | The zero-tolerance rule is *shown* at registration/onboarding, but is the member's acknowledgement *recorded* (timestamped) as the case attestation is? Decide + specify storage |
| G-14 | **Interest selection endpoints missing** (A7, F5) | EPIC-I | Needs a selectable-tags read (facet-filtered `community.tags`) and a bulk **set-interests** write (`member_interests`) — neither enumerated |
| G-15 | **Free-seed-period → paywall trigger undefined** (A8) | EPIC-H | Monetisation specifies a free seed period before the paywall (PRD §11); the switch that activates the billing gate is unspecified — needs an EPIC-H seed flag + decision |
| G-16 | **Article detail read + save/bookmark unenumerated** (B2) | EPIC-I | EPIC-I §6 specs the feed list; a single-article GET and a save endpoint/store aren't defined |
| G-17 | **List-surface DTOs unenumerated** (B1, C1, C2, C3) | EPIC-I / EPIC-C | The article-summary and post-summary card DTOs (incl. author kudos/badge join + counts) aren't specified — the list-surface analogue of the thread-DTO gaps G-3/G-4 |
| G-18 | **Professional-body picker launch set is FD-1-dependent** (A2) | FD-1 | Confirm which of hcpc/gmc/basrat/sst are offered at launch (physio-first → HCPC primary). A scope link, not a new mechanism |
| G-19 | **Manage-subscription endpoints missing** (F6) | EPIC-H | `POST /v1/billing/subscribe`/`cancel`/`GET me` exist; **update-payment-method** and **change-plan** don't. Add to EPIC-H §6 |
| G-20 | **Account-deletion / right-to-erasure member flow unspecified** (F7) | EPIC-A / arch / legal | The erasure *default* is set (hard-delete identity, retain de-linked content) but flagged for legal; the **member-facing deletion request flow + endpoint** aren't specified. GDPR-relevant — needs decision + endpoint |
| G-21 | **Author-scoped content reads unenumerated** (D4, E2, F1) | EPIC-C | "My posts/answers" (published) and "my drafts" (incl. `draft`/`needs_correction`, author-private) reads aren't specified; the drafts read has a distinct visibility rule (G-8) |
| G-22 | **Saved/bookmark store + endpoints missing** (E3, B2) | EPIC-C / EPIC-I | The Should-have saves mechanism (posts and articles) has no table/endpoints; decide MVP-Should-have vs. defer |
| G-23 | **Profile editability undefined** (F1) | EPIC-B | Confirm whether *anything* on the member's own profile is editable (anonymity implies little/nothing beyond the settings screens) — pin the answer |
| G-24 | **Reveal-identity response field set unenumerated** (G3) | EPIC-F §5 | Pin exactly which real-identity fields the audited reveal returns (legal_name, email, professional_body, registration_number, country?) |

None are blockers; all are exactly the cheap-to-fix-now, expensive-to-discover-mid-build items this exercise exists to catch. They will be reconciled into the epic specs (the source of truth) as the inventory is fleshed out. **Two items need a decision, not just reconciliation:** G-9's build-timing (MVP vs. fast-follow), and whether to offer the optional biometric **app-lock** (§1.6 — recommendation: opt-in, off by default).

---

## 8. Next steps

1. ~~**Calibrate**~~ — exemplar detail/altitude approved 2026-07-19.
2. ~~**Fan out** the screens~~ — **complete**: all member areas A–F (§6.A–6.F) and the admin area G (§6.G) are specced. The screen inventory is fully mapped.
3. **Reconcile the spec-gaps** (§7, **G-1…G-24**) back into the epic specs — the next substantive pass; each gap has a named target spec.
4. **Resolve the open decisions** — G-9 biometric build-timing; the app-lock offer; G-13 (record anonymity acknowledgement?); G-15 (seed-period → paywall trigger); G-18 (FD-1 body set); G-20 (erasure flow — legal); G-22 (saves scope); G-23 (profile editability).
5. **Derive the tracer-bullet slice backlog** from the completed inventory + flows (slice 1 = A1→A5, the onboarding spine).
