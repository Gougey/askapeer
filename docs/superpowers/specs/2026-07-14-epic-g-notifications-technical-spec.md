# EPIC-G — Notifications (In-App and Email) — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The seventh per-epic technical spec. Builds on the architecture spec's Section 4.2 (`community.notifications`, `community.notification_preferences`), Section 4.1 (`NotificationService` as one of only three modules with an `identity`-schema grant), and Section 7.3 (notification types and delivery mechanism) — read those first.

**Scope addition (2026-07-17)**: this spec adds a **third delivery channel — push notifications — beyond the architecture spec's in-app + email pair** (§7.3 and the §4.2 `notification_preferences` schema). The mechanism and its user preference are **fully described here but ship inert for the web-only MVP**: the per-type push preference is present in the data model and surfaced in the UI (greyed-out / "coming soon"), and the delivery worker is specified, but nothing is sent at launch. This lets the preference and its storage exist from day one while the actual per-event push triggers are pinned down during app testing (the expectation is engagement events like `reply` and `kudos_received`, *not* the `weekly_digest`). Native push (APNs/FCM) is Phase 2 with native apps (FD-3); the channel is modelled generically so Phase 2 reuses the same preference and worker. This is a scope addition to be reflected back into the architecture spec's §7.3, the same way EPIC-I/EPIC-J are additions to the PRD.

Source of truth: `docs/askapeer-prd-v0.1.md`, the Must-have "Notifications" row (Section 6.1) and the Should-have "Email digest" row.

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [`NotificationService`'s dual-schema access](#3-notificationservices-dual-schema-access)
4. [The pre-handle notification gap](#4-the-pre-handle-notification-gap)
5. [Notification types and triggers](#5-notification-types-and-triggers)
6. [Channels, preferences, and the push mechanism](#6-channels-preferences-and-the-push-mechanism)
7. [Weekly digest, built on EPIC-B's unified follows table](#7-weekly-digest-built-on-epic-bs-unified-follows-table)
8. [API endpoints](#8-api-endpoints)
9. [Non-functional notes specific to EPIC-G](#9-non-functional-notes-specific-to-epic-g)
10. [Test plan](#10-test-plan)
11. [Open questions](#11-open-questions)

---

## 1. Scope

**In scope**: the in-app notification store, delivery preferences across **three channels — in-app, email, and push**, email delivery via `NotificationService`, the push-notification mechanism and its subscription registry (described here, inert for MVP — Section 6), and the Should-have weekly digest.

**Out of scope**: the domain events themselves (new comment, kudos awarded, verification decision) — those are EPIC-C, EPIC-D, and EPIC-A/EPIC-F's data; this epic only reacts to them. **Native push transports (APNs/FCM)** are Phase 2 with the native apps (FD-3) — the MVP describes Web Push only, but the preference and worker are modelled channel-generically so native is additive, not a rewrite. **Active push delivery at MVP** is out of scope by decision (the channel ships inert — Section 6), not by omission.

---

## 2. Data model

Reuses `community.notifications` and `community.notification_preferences` (architecture spec, Section 4.2), with **one new column and one new table** for the push channel:

```
community.notifications
  id, handle_id, type, payload jsonb, read_at, created_at

community.notification_preferences
  handle_id, type, in_app_enabled, email_enabled,
  push_enabled            -- NEW: third channel, default false; see Section 6

community.push_subscriptions          -- NEW: the push-delivery registry
  id, handle_id,
  transport enum(web_push),           -- Phase 2 adds: apns, fcm
  endpoint text,                      -- Web Push: the browser push service URL
  p256dh text, auth text,             -- Web Push: the subscription's public key + auth secret
  user_agent text,                    -- for a member-facing "your devices" list
  created_at, last_seen_at,
  revoked_at nullable                 -- soft-revoke on unsubscribe / expiry
```

- `push_subscriptions` is **handle-scoped, not member-scoped** — consistent with every other community-facing table, and it means a push subscription only ever exists for an `approved_verified` member who has a handle (which is exactly why push, like in-app, is a post-handle-only channel — Section 4).
- One member/handle may have **many** rows (one per browser/device that granted permission); delivery fans out across the live (non-`revoked_at`) rows.
- `default false` on `push_enabled` matters: push is **opt-in per browser permission grant anyway**, and the channel is inert at MVP, so no member is opted into a channel that does nothing.

The in-app and email mechanics themselves still need no new schema — those additions are behavioral (Sections 4, 6, 7). The push channel is the only part of this epic that adds storage.

---

## 3. `NotificationService`'s dual-schema access

The architecture spec (Section 4.1) grants `NotificationService` — alone among community-facing services, alongside `IdentityService` and `BillingService` — a database role with access to the `identity` schema, specifically to read `identity.members.email` for sending mail. This is worth being precise about in this spec, since it's the one place this epic touches the identity boundary at all:

**`NotificationService` should read only `email` from `identity.members`, never `legal_name`.**

- Every email template this service sends must address the member by their **handle**, never their real name — even though the service technically has database access to do otherwise.
- Nothing in the architecture spec structurally prevents a wider read: the grant is at the schema/table level, not column level. So unlike the general `identity`/`community` boundary (which Section 4 of that spec enforces via role grants), this narrower email-yes/name-no constraint is currently application discipline *within* an already-granted role.
- **Hardening — confirmed 2026-07-17**: this *will* be enforced by a database view. A view exposing only `email` (e.g. `identity.member_emails(member_id, email)`) is created, and `NotificationService`'s database role is granted on the **view, not the `identity.members` table** — turning the email-yes/name-no norm into a structural guarantee rather than application discipline. Cheap to build; removes the one place the identity boundary rested on convention. The architecture spec's Section 4.1 note that `NotificationService` holds an `identity`-schema grant is refined accordingly: the grant targets the email-only view.

This routine access is not an `identity_access_log` event, per the architecture spec's Section 4.4 distinction (routine automated access vs. moderator-initiated identity lookup) — consistent with what that section already states about sending a notification email.

---

## 4. The pre-handle notification gap

**The problem**: `community.notifications` is keyed by `handle_id`, but `verification_status_change` (one of the five notification types, architecture spec Section 7.3) needs to reach applicants in `pending`, `needs_more_info`, or `rejected` status — none of whom have a handle yet (a handle is only created at `approved_verified`, per the EPIC-A/EPIC-B handoff). A rejected applicant, by definition, **never** gets one.

**This spec's proposal** — `verification_status_change` is really two mechanisms depending on whether a handle exists yet:

| Applicant state | Delivery | Storage |
|---|---|---|
| Pre-handle (`pending`, `needs_more_info`, `rejected`) | **Email only**, sent directly by `NotificationService` reading `identity.members.email` | No `community.notifications` row at all — there's no `handle_id` to attach one to |
| Post-handle (later status changes, e.g. suspension) | Normal in-app + email path | Ordinary handle-scoped `community.notifications` row |

Surfaced here explicitly rather than quietly special-cased in code with no documentation trail — it's a genuine structural asymmetry among the five notification types.

---

## 5. Notification types and triggers

| Type | Trigger | Owning epic (event source) | Handle exists? | Push-eligible? |
|---|---|---|---|---|
| `reply` | New comment on a handle's post/comment | EPIC-C | Always | **Likely** (TBD in testing) |
| `mention` | `@handle` parsed in a post/comment body | EPIC-C | Always | **Likely** (TBD in testing) |
| `kudos_received` | Kudos awarded to a handle's post/comment | EPIC-D | Always | **Likely** (TBD in testing) |
| `verification_status_change` | Any `identity.verification_decisions` transition | EPIC-A (and EPIC-F, for suspend/expel) | Sometimes — Section 4 | Post-handle changes only (pre-handle is email — Section 4) |
| `weekly_digest` (Should-have) | Scheduled job | EPIC-C/EPIC-D data | Always | **No** — a digest is not a real-time nudge |

Each of the first three is delivered via a BullMQ worker job reacting to the triggering domain event, per the architecture spec's general worker pattern (Section 3) — this epic doesn't introduce a new delivery mechanism, only the specific job definitions.

The **Push-eligible?** column records the *intent* for when the push channel is activated (post-MVP); it is not live at launch. Which types actually push — and how they're batched/throttled to avoid nuisance (a burst of kudos shouldn't fire ten notifications) — is deliberately left to be settled during app testing, per Section 6. The clear early call is that the `weekly_digest` is **not** push-eligible: push is for time-sensitive, "someone interacted with you" moments, not a scheduled roundup.

---

## 6. Channels, preferences, and the push mechanism

### 6.1 Three channels, per-type preferences

`community.notification_preferences` lets a member configure **three channels per notification type**: `in_app_enabled`, `email_enabled`, and (new) `push_enabled` — with one exception below (**confirmed policy, 2026-07-17**).

- **`verification_status_change` email cannot be disabled**, even though a member can disable email for `reply` or `kudos_received`.
- **Why**: account-status events (verification decisions, and — via EPIC-F — suspension/expulsion notices) are not engagement content to opt out of; a member needs to know their access has changed regardless of preferences.
- Only the **email** channel is forced: in-app is moot for the pre-handle cases (Section 4), and for post-handle status changes there's no strong reason to force in-app specifically — only to guarantee delivery somewhere. Push is never forced (it depends on a browser permission grant the member can revoke at any time).

### 6.2 The push channel — mechanism (described), MVP status (inert)

Push is added as a first-class channel now, but **ships inert for the web-only MVP**: the preference exists and is shown in the settings UI as **greyed-out / "coming soon"**, and the mechanism below is specified so it can be switched on without a schema or model change once the per-event triggers are validated in testing.

**Transport — Web Push (early dev), native soon after.** For the web MVP / early development the transport is the **W3C Web Push protocol**: the browser's Push API + a service worker + a **VAPID** key pair (application server identity; the private key is a server secret, config-managed like other secrets in the architecture spec's Section 6). No third-party push SaaS — messages go from our delivery worker straight to the browser's push service (the endpoint stored on the subscription), keeping delivery on first-party infrastructure, consistent with the platform's data-residency/trust posture. **Native is a near-term intention, not a distant Phase 2** (Adrian, 2026-07-17): the app is a PWA for early development and moves to native (iOS/Android) *as soon as possible*, at which point `apns`/`fcm` rows are added to `push_subscriptions.transport`. The channel-generic modelling — one `push_enabled` preference, one fan-out worker, a `transport` discriminator on the subscription — is what makes that transition additive rather than a rewrite, and it pays off sooner than FD-3's "Phase 2" wording implies. (This doesn't change the web-first MVP itself; it's a note on how quickly native follows.)

**Subscription lifecycle:**

| Step | What happens |
|---|---|
| **Grant** | The web client asks the browser for notification permission; on grant it registers a push subscription and `POST`s the `endpoint` + `p256dh`/`auth` keys to the API (Section 8), creating a `community.push_subscriptions` row for the member's handle. |
| **Deliver** | A BullMQ worker (the same job that writes the in-app row and enqueues email) fans out to every live subscription row for the handle **when `push_enabled` is true for that type** — encrypting the payload per the Web Push spec and `POST`ing it to each `endpoint`. **At MVP this branch is disabled**, so no push is sent even where a subscription exists. |
| **Revoke/expire** | On unsubscribe, or a `410 Gone`/`404` from the push service (subscription expired), the row is soft-revoked (`revoked_at` set) and skipped on future fan-out. |

**Payload discipline — the anonymity rule reaches into push too.** A push payload must contain **only handle-attributed, non-identifying content** (e.g. *"You received kudos"*, *"New reply on your post"*) — never real names (which the service never has for other members anyway) and, importantly, **no patient-identifying content**: because a case-discussion reply could surface on a lock screen, push copy is deliberately generic ("New reply in a case discussion") and links into the app rather than quoting the content. This is why push copy is defined per type here, not derived verbatim from the notification payload.

**Why model it now if it's inert?** So the preference and its storage exist from launch (no migration or UI churn when it's switched on), and so the anonymity/PHI constraints on push copy are settled as a design decision rather than discovered late. The remaining open call — *which* types push, and how they're batched/throttled — is intentionally deferred to app testing (Section 11), where real interaction volume will show what's useful versus what's noise.

---

## 7. Weekly digest, built on EPIC-B's unified follows table

**Resolved 2026-07-14** — this section originally flagged a gap: the PRD's Should-have digest (Section 6.1, "top-kudos content in **followed tags**") and EPIC-C's Should-have personalised feed (Section 6.1, "tags **and handles** followed") both assumed a tag-follow mechanism that no spec had built, since EPIC-B originally only specified handle-follows. Adrian's decision (see `docs/2026-07-14-technical-specs-open-questions.md`, Section 2): rather than add a separate tag-follow table, EPIC-B's `community.handle_follows` was generalised into `community.follows` (`target_type` enum of `handle`/`tag`, same discriminator pattern as `community.kudos`/`community.reports`) — see EPIC-B's spec, Section 8.

This epic builds the digest as a scheduled BullMQ job querying each member's `community.follows` rows (both `target_type = tag` and `target_type = handle`) joined against the prior week's kudos-ranked content, delivered by email only (a weekly digest has no obvious in-app equivalent). This epic is a read-only consumer of `community.follows`, same as EPIC-C's personalised feed (its spec, Section 8) — neither epic owns or duplicates the table.

---

## 8. API endpoints

```
GET   /v1/notifications?cursor=...&unread_only=
PATCH /v1/notifications/:id/read
POST  /v1/notifications/read-all

GET   /v1/notification-preferences
PUT   /v1/notification-preferences        { type, in_app_enabled, email_enabled, push_enabled }

--- push subscription registry (Section 6.2) ---
GET    /v1/push/vapid-public-key          -- client needs this to subscribe
POST   /v1/push/subscriptions             { endpoint, keys: { p256dh, auth }, user_agent }
DELETE /v1/push/subscriptions/:id         -- unsubscribe this device (soft-revoke)
```

`PUT .../notification-preferences` rejects an attempt to set `email_enabled = false` for `verification_status_change`, per Section 6.1 (confirmed policy, 2026-07-17). It accepts `push_enabled` for any type, but at MVP the value is stored without effect (the delivery branch is inert, Section 6.2).

The three `/v1/push/*` endpoints exist and function at MVP (a member *can* register a subscription and toggle the preference) — only the outbound delivery is gated off. This is deliberate: it lets the end-to-end registration path be exercised in testing before the fan-out is enabled.

---

## 9. Non-functional notes specific to EPIC-G

- **Email deliverability**: sent via SES in `eu-west-1` per the architecture spec, Section 6 — no new infrastructure needed here.
- **Digest cadence and unsubscribe — confirmed 2026-07-17**: the digest is **weekly, email-only** (per the PRD's own naming) and carries an **unsubscribe link**. Under UK PECR, marketing-flavoured communications require an easy opt-out; the weekly digest falls into that category (it's engagement content, not a transactional account notice), whereas `verification_status_change` and other account-critical notices are transactional and not subject to the same requirement — consistent with Section 6.1 making the latter non-optional. The unsubscribe link is equivalent to setting `email_enabled = false` for `weekly_digest` (which is permitted, unlike `verification_status_change`). Still worth a specific legal sanity-check alongside the DPIA (architecture spec, Section 11), but the design is settled.
- **Payload shape**: `community.notifications.payload` is `jsonb` and type-specific (a `reply` notification's payload differs from a `kudos_received` one) — this spec doesn't fix a schema per type here since it's an implementation detail with no architectural weight, but each type's payload shape should be documented wherever the notification-rendering UI is actually built.

---

## 10. Test plan

- **Pre-handle delivery**: a `rejected` applicant (no handle) receives an email notification and no `community.notifications` row is ever created for them.
- **Non-optional email**: an attempt to disable `email_enabled` for `verification_status_change` is rejected (confirmed policy, Section 6.1).
- **`NotificationService` field access**: the service's database role has **no grant on `identity.members`** — only on the email-only view (Section 3) — so a query selecting `legal_name` fails at the permission level, not merely by convention. Mirrors and strengthens the access-boundary tests the EPIC-A and EPIC-B specs establish for their own modules.
- **Digest unsubscribe**: an unsubscribe action on a weekly digest sets `email_enabled = false` for `weekly_digest` and no further digests are sent, while `verification_status_change` email remains unaffected (Section 9).
- **Mention parsing**: mentioning an `expelled` handle doesn't error or leak status, consistent with EPIC-C's Section 9 note on the same behavior.
- **Push registration path works, delivery is inert (MVP)**: registering a `community.push_subscriptions` row and setting `push_enabled = true` both succeed, but the delivery worker sends **no** push message at MVP (the fan-out branch is gated off) — asserts the channel ships inert as specified (Section 6.2).
- **Push subscriptions are handle-scoped and post-handle-only**: no `push_subscriptions` row can be created for an applicant without a handle (mirrors the pre-handle gap in Section 4).
- **Expired subscription is soft-revoked**: a simulated `410 Gone` from the push service sets `revoked_at` and the row is skipped on subsequent fan-out (relevant once delivery is enabled).
- **Push copy carries no identifying content**: push payload templates address the recipient by nothing more than context (no real names, no quoted case-discussion body) — the notification-copy analogue of the `NotificationService` field-access test above (Section 6.2 payload discipline).

---

## 11. Open questions

- ~~**Column-level hardening of `NotificationService`'s identity access**~~ (Section 3) — **resolved 2026-07-17**: yes, enforced by an email-only database view; `NotificationService`'s grant targets the view, not `identity.members`.
- ~~**Non-optional `verification_status_change` email**~~ (Section 6.1) — **resolved 2026-07-17**: confirmed — this one channel cannot be disabled, as it's account-critical.
- ~~**Missing tag-follow mechanism**~~ — **resolved 2026-07-14**, see Section 7 above and EPIC-B's spec, Section 8.
- ~~**Digest cadence/unsubscribe mechanics**~~ (Section 9) — **resolved 2026-07-17**: weekly, email-only, with an unsubscribe link (equivalent to disabling `email_enabled` for `weekly_digest`). Legal sanity-check still bundled with the DPIA, but the design is settled.
- **Push channel — which types push, and batching/throttling** (Section 6.2): *not a decision pending now* — the mechanism and preference are specified and ship inert for MVP. The per-type trigger set (expected: `reply`, `mention`, `kudos_received`; *not* `weekly_digest`) and the batching/throttling rules to avoid nuisance are deliberately left to be tuned during app testing, where real interaction volume will show what's useful versus noise. Activating the delivery branch is a config flip, not a schema/model change.
- ~~**Web Push prerequisites**~~ (Section 6.2) — **resolved 2026-07-17**: the app is a **PWA with a service worker for early development** (so Web Push works), and moves to **native as soon as possible** (Adrian) — at which point delivery switches to native APNs/FCM. The channel-generic model makes that additive; see Section 6.2.
