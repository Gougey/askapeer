# EPIC-H — Subscription and Payment Processing — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The eighth per-epic technical spec. Builds on the architecture spec's Section 7.1 (`PaymentProvider` interface, `billing` schema, `StripeProvider` chosen first) — read that first. This epic is the one place FD-2 (pricing, trial length, processor — still formally open) has real technical weight, so this spec is deliberately built to be indifferent to how FD-2 resolves wherever possible.

Source of truth: `docs/askapeer-prd-v0.1.md`, Section 11 (Monetisation Strategy) in full.

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [Subscription lifecycle](#3-subscription-lifecycle)
4. [Access gating — a new token scope](#4-access-gating--a-new-token-scope)
5. [Webhook handling](#5-webhook-handling)
6. [API endpoints](#6-api-endpoints)
7. [Trial length flexibility](#7-trial-length-flexibility)
8. [Non-functional notes specific to EPIC-H](#8-non-functional-notes-specific-to-epic-h)
9. [Test plan](#9-test-plan)
10. [Open questions](#10-open-questions)

---

## 1. Scope

**In scope**: the subscription/invoice data model, the trial-to-paid lifecycle, webhook processing, and — the one piece of genuine new design in this spec — how a lapsed subscription actually restricts community access, which the PRD doesn't specify and the architecture spec only implies.

**Out of scope**: Phase 2 revenue options (premium tier, institutional accounts — PRD Section 11.4), which are explicitly deferred and have no MVP data-model requirement.

---

## 2. Data model

Fleshes out the `billing` schema the architecture spec (Section 7.1) named but didn't fully define:

```
billing.subscriptions
  id                     uuid PK
  member_id              uuid              -- keyed to real identity, not handle_id, per the
                                              architecture spec's reasoning: billing legitimately
                                              needs the member's real name/email for invoicing
  provider               enum(stripe, worldpay)
  provider_customer_id   text
  provider_subscription_id text
  plan                   enum(monthly, annual)
  status                 enum(trialing, active, past_due, cancelled)
  trial_end              date
  current_period_end     date
  created_at             timestamptz

billing.invoices
  id                  uuid PK
  member_id           uuid
  subscription_id     uuid FK -> billing.subscriptions
  provider_invoice_id text
  amount              numeric
  currency            text
  status              enum(paid, open, failed)
  issued_at           timestamptz

billing.webhook_events                 -- idempotent, replay-safe processing
  id                  uuid PK
  provider            enum(stripe, worldpay)
  external_event_id   text unique       -- the processor's own event ID; the uniqueness
                                           constraint is what makes replay safe
  event_type          text
  raw_payload         jsonb
  processed_at        timestamptz nullable
  created_at          timestamptz
```

`BillingService` has the same narrow, audited access pattern to `identity.members` as `NotificationService` (EPIC-G spec, Section 3) — but with a materially different scope: invoicing **legitimately needs `legal_name`**, not just `email`, since a receipt or invoice showing a handle instead of a real name would be a strange (and possibly non-compliant, for VAT/accounting purposes) invoice. This is the one service where reading `legal_name` outside `IdentityService` itself is intentional, not a gap to harden — worth stating explicitly so it isn't mistaken for the same problem flagged in EPIC-G's spec.

---

## 3. Subscription lifecycle

```
Registration (EPIC-A) -> handle created (EPIC-B) -> prompted to start subscription
  |
  v
trialing  (trial_end set; full community access per Section 4)
  |
  | trial ends, payment method charged successfully
  v
active  (current_period_end rolls forward each billing cycle)
  |
  | payment fails
  v
past_due  (grace period — Section 4 — before access is restricted)
  |
  | either: payment recovered -> active
  | or: grace period expires / member cancels -> cancelled
  v
cancelled  (access continues until current_period_end, then restricted — Section 4)
```

`StripeProvider`'s built-in dunning (retrying failed payments automatically) is the mechanism that determines how long a subscription sits in `past_due` before Stripe itself gives up and the subscription is cancelled — this spec doesn't reimplement retry logic, only reacts to the resulting webhook events (Section 5).

---

## 4. Access gating — a new token scope

**Neither the PRD nor the architecture spec specifies what happens to community access when a subscription lapses** — the PRD's holding-page language (Section 8.1) is written entirely in terms of verification status, and the architecture spec's Section 5.2 token-scoping mechanism was designed for the verification case specifically. This spec proposes extending the same mechanism rather than inventing a new one:

- A **billing-lapsed-scoped token**, structurally identical in purpose to EPIC-A's pending-scoped token (its spec, Section 7) — grants access only to billing endpoints (Section 6) and a holding-style "reactivate your subscription" view, not community content.
- Issued when `billing.subscriptions.status` moves to `cancelled` (immediately, subject to the end-of-period rule below — Section 6) or `past_due` beyond a **grace period**. **Resolved 2026-07-17**: the grace period is a **configurable threshold, not a hardcoded constant** (Adrian's call) — it lives in EPIC-J's config store as a tunable numeric setting (`billing.grace_period_days`), read by `BillingService`, with a **default of 7 days**. A `past_due` subscription still gets this window because payment failures are often transient (an expired card, a momentary bank decline), not a deliberate lapse; making the length tunable lets it be adjusted from real dunning-recovery data without a deploy.
- Takes effect within one access-token lifetime (~15 minutes), reusing exactly the revocable-refresh-token mechanism the architecture spec already describes for suspension/expulsion (Section 7.2) — no new session-invalidation mechanism needed, only a new reason a refresh can be downgraded.

**This is deliberately a separate gating dimension from `community.handles.status`** (EPIC-B/EPIC-F's moderation states) — **confirmed 2026-07-17** (resolves cross-epic item §1.4 in the open-questions doc):

- A billing lapse and a moderation suspension are **different in kind**: one is resolved by paying, the other by an appeal or a fixed suspension period.
- Conflating them into one status field would make "why can't I access the platform" ambiguous to both the member and support staff.
- So: **two independently-checked gates** — handle status AND subscription status, both must permit access. This mirrors the same "different-in-kind, don't-conflate" reasoning applied to EPIC-F's `suspend` (which deliberately does *not* touch identity status).

---

## 5. Webhook handling

```
POST /v1/billing/webhook
  -> verify signature (provider-specific, per architecture spec's PaymentProvider.handleWebhook)
  -> normalise into NormalizedBillingEvent
  -> INSERT into billing.webhook_events keyed on external_event_id; a duplicate insert
     (the same event redelivered, which all major processors do on retry) is a no-op
     via the unique constraint, not reprocessed
  -> update billing.subscriptions / billing.invoices accordingly
  -> mark processed_at
```

Idempotency is enforced at the database level (the unique constraint), not by application-level "have I seen this before" logic — consistent with the architecture spec's general preference for schema-enforced guarantees (Section 4) over code discipline, applied here to a different problem (webhook replay safety) than where the architecture spec originally used the principle (the identity/community boundary).

---

## 6. API endpoints

```
POST /v1/billing/subscribe        { plan: monthly | annual }
  -> creates provider customer + subscription (trial, per Section 7)
  -> returns whatever client-side step the provider requires (e.g. Stripe
     Elements setup) — provider-specific, abstracted behind PaymentProvider

POST /v1/billing/cancel
  -> status -> cancelled; access continues until current_period_end
     (Section 3) — confirmed 2026-07-17 (end-of-paid-period, not immediate
     revocation): the member keeps what they've already paid for, then the
     billing gate applies

GET  /v1/billing/me
  -> { plan, status, trial_end, current_period_end }

POST /v1/billing/webhook           -- Section 5, no session auth (processor-signed instead)
```

---

## 7. Trial length flexibility

Two PRD signals suggest trial length will need to vary:

- **Section 11.3** raises a longer trial for the initial launch cohort (e.g. 6 months vs. the illustrative 3) to address the content-seeding chicken-and-egg problem.
- **FD-6** floats a university-partnership cohort that might need its own trial terms.

**Resolved 2026-07-17** (Adrian): `trial_end` is set per-subscription at creation time from a **configurable value, not a hardcoded constant** — so a different cohort (e.g. an invite-code-driven university trial) can get a different trial length without a schema change. Cheap to build in from the start, expensive to retrofit. **No invite-code/cohort mechanism is built for MVP** — none is confirmed scope (it depends on FD-6, still open); this section only ensures the data model doesn't foreclose it. The MVP runs a single platform-wide default trial length (illustratively 3 months, pending FD-2).

**Config boundary (informs EPIC-J's open question)**: like the grace period (Section 4), the *numeric* default trial length is a tunable setting suited to EPIC-J's config store (`billing.default_trial_days`), while the trial *semantics* — when `trial_end` is applied, how a cohort override would resolve — stay owned by `BillingService` here in EPIC-H. That split (numeric tunables in EPIC-J config; billing logic in EPIC-H) is the emerging answer to EPIC-J's "billing config boundary" question, to be formally confirmed in the EPIC-J review.

---

## 8. Non-functional notes specific to EPIC-H

- **PCI compliance is entirely offloaded to the processor** (architecture spec glossary, Section 2) — no card data ever touches Askapeer's own servers or database, consistent with using Stripe Elements/equivalent client-side tokenisation.
- **Webhook signature verification** is the single most security-critical piece of this epic — an unverified webhook endpoint would let anyone forge a "payment succeeded" event. `PaymentProvider.handleWebhook`'s signature check (architecture spec, Section 7.1) must happen before any database write, not after.
- **Contract tests for `PaymentProvider`**: already named generically in the architecture spec's Section 9 non-functional requirements — this epic is where those tests actually get written, covering both `StripeProvider` and (if/when built) `WorldPayProvider` against the same interface.

---

## 9. Test plan

- **Webhook idempotency**: the same `external_event_id` delivered twice results in exactly one state update, not two.
- **Trial-to-active transition**: a successful first charge at `trial_end` moves `trialing -> active` and sets `current_period_end`.
- **Grace period**: a `past_due` subscription retains full access until the configured grace period (Section 4; `billing.grace_period_days`, default 7) elapses, then the member's next token refresh returns a billing-lapsed-scoped token. A test also asserts the value is read from config, not a constant.
- **Cancellation timing**: cancelling mid-cycle retains access until `current_period_end`, not immediately (confirmed, Section 6).
- **Dual gating**: a member who is both `suspended` (EPIC-F) and has an `active` subscription is still denied community access — confirms the two gates (Section 4) are independently enforced, neither overriding the other.

---

## 10. Open questions

- **FD-2 itself**: pricing, trial length, and processor choice are still formally open **stakeholder** decisions — this spec is written to be indifferent to the outcome. Note the architecture spec already names **Stripe as the first-built provider** (`StripeProvider`), so Stripe-first is the working build target; WorldPay stays behind the same `PaymentProvider` interface if ever needed. A concrete pricing figure is still needed before `StripeProvider` is wired to real numbers, but nothing structural is blocked.
- ~~**Grace period length**~~ (Section 4) — **resolved 2026-07-17**: a configurable threshold (`billing.grace_period_days`, EPIC-J config store), default 7 days — not a hardcoded constant.
- ~~**Cancellation access timing**~~ (Section 6) — **resolved 2026-07-17**: end-of-paid-period access, not immediate revocation.
- ~~**Billing-lapse token scope as a new mechanism**~~ (Section 4) — **resolved 2026-07-17**: yes, two independently-checked gates (handle status AND subscription status), extending EPIC-A's pending-token pattern rather than collapsing into a single flag. Closes cross-epic §1.4.
- **Trial-length configurability and cohort mechanism** (Section 7): **partly resolved 2026-07-17** — trial length is a configurable value (default trial in EPIC-J config; semantics in EPIC-H), and **no cohort/invite-code feature is built for MVP**. The remaining open part is purely FD-6 (university partnership): if it proceeds, a cohort mechanism gets designed then — a business decision, not a spec gap.
