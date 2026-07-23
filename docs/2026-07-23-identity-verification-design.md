# Identity Verification — Design, Threat Model & Provider Choice

**Status**: Working design note — companion to EPIC-A, feeds its §5 (verification worker) and §6 (admin review). For stakeholder review.
**Date**: 23 July 2026
**Author**: Adrian Hall (Technical Lead), with Claude Code
**Companion to**: `docs/superpowers/specs/2026-07-14-epic-a-verification-technical-spec.md` ("EPIC-A")

## Why this document exists

Verification is the load-bearing wall of the whole product. Askapeer's single promise is that *every member is a qualified, registered professional* — and, because the network is pseudonymous, that promise is the **only** thing standing between a trusted peer forum and an anonymous message board where anyone can impersonate a clinician.

While validating the HCPC register mechanism (see §3) we surfaced a consequence sharp enough to deserve its own document: **a professional's registration number is trivially discoverable, so the register lookup proves almost nothing on its own.** The control that actually protects the platform is the identity check and, specifically, the *binding* between the verified person and the claimed registration. This note lays out that threat model, what we learned about the register, the corrected verification design, the explicit user flow and result paths, and a provider recommendation — in enough detail to build S2-real and choose an identity-verification vendor against.

### Relationship to EPIC-A (enhances, does not replace)

EPIC-A remains the **implementation source of truth**: the state machine, the `identity` schema, the API endpoints, the admin queue, and the immutable audit. This document is the **design rationale and security model** behind two of EPIC-A's steps (register lookup, identity check), plus the external-provider guidance EPIC-A deliberately keeps out of scope.

The one substantive change it asks EPIC-A to absorb: **make the name-match binding an explicit, enforced step in the §5 decision table** (auto-approval must require *registered* **and** *identity clear* **and** *name matches the register*). Until that is folded in, this note is the authority on the binding rule; EPIC-A stays the authority on mechanics. It is a companion and an enhancement, not a rewrite.

---

## 1. The core problem: a registration number is a claim, not a secret

A UK professional register is **public, searchable, and enumerable by design** — its entire purpose is to let anyone confirm a practitioner's status. We confirmed this the hard way: querying a *guessed* registration number returned a real, currently-registered professional's full name and details (see §3). An attacker does not need to target anyone — they can harvest valid *name + number* pairs at will.

So the register lookup answers exactly one question:

> **"Is PH78516 a real, currently-registered physiotherapist named Renshaw?"** — Yes.

It says **nothing** about whether the person typing that number *is* that Renshaw. The register lookup is a **credential-validity check, not an identity check.** It is necessary but nowhere near sufficient.

### The attack to design against

The naive failure mode people imagine is "a forged ID." That is **not** the primary threat. The primary threat is:

> **A real person, with their own genuine government ID, registering under someone else's real registration number.**

Every off-the-shelf identity-verification (IDV) product will happily verify that this person genuinely is who their ID says — say, *John Smith* — while John Smith holds a registration number belonging to *Andrew Renshaw*. The IDV vendor returns "clear." The impersonation still succeeds. Only one check defeats it: **comparing the verified ID name against the name the register returns for that number.**

### Why pseudonymity raises the stakes

- The impersonator operates behind a **handle with no reputational tie to their real self**, giving clinical opinions to peers who trust the verified badge.
- If moderation ever pierces pseudonymity for a genuine safety or legal reason, the identity that surfaces is the **innocent registrant's** — a serious harm to an uninvolved professional, and a serious liability for Askapeer.
- A bad actor could deliberately register under another's number precisely to **deflect accountability**.

This is why the identity check, and the binding, are the security-critical part of the platform — not a compliance checkbox.

---

## 2. The two checks and the binding between them

Verification is two independent checks joined by one comparison. The comparison is the part that is easy to under-build and the part that matters most.

| | What it proves | What it does **not** prove |
|---|---|---|
| **Check 1 — Register lookup** (HCPC etc.) | The registration number belongs to a real, currently-registered professional, and yields **their name**. | That the applicant is that person. |
| **Check 2 — Identity verification** (IDV vendor) | The applicant holds a **genuine government ID** and is **physically present** and matches its photo (liveness/biometric), yielding their **verified legal name**. | That the applicant's ID name has anything to do with the claimed registration number. |
| **The binding — name match** | **Verified ID name ⇕ register name.** This is what stops "my real ID + your real number." | — |

### The corrected auto-approval rule

The unattended, automatic approval — the *only* decision the system ever makes without a human — must require **all three** of:

> **Registered** (credential valid) **AND** **IDV = clear** (genuine, present person) **AND** **name match** (the person is the registrant).

Anything short of all three routes to **manual admin review**. And — as in EPIC-A today — **the automated path never auto-rejects**; a "no" is always a human's call. The asymmetry is deliberate: a false auto-approve admits an impostor; a false auto-reject shuts out a real professional. Only the former is catastrophic, so only *approve* is ever automatic.

### Name-matching is fuzzy — so it is tiered

Real-world names do not compare cleanly: maiden vs. married names, middle names, titles, the register showing "surname, first name" while the ID carries the full legal name, transliteration, hyphenation, diacritics. Exact-match alone **false-rejects** legitimate people; loose-match **false-accepts** impostors. The resolution is a **tier**, which the existing state machine already supports:

- **High-confidence exact match** → eligible for auto-approval.
- **Anything ambiguous** → admin review, where a human compares the verified ID name to the register entry and decides.

This makes the reviewer's core job explicit and small: *does the verified ID name match the register?*

---

## 3. What we learned about the HCPC register (empirical, 23 July 2026)

HCPC publishes **no API**, but its public "Check the Register" search is a clean, server-rendered **GET** — about as consumable as a non-API source gets. (Physiotherapists are HCPC-registered, so under a physio-first launch — FD-1 — HCPC is the primary register.)

### The endpoint

```
GET https://www.hcpc-uk.org/check-the-register/professional-registration-detail/
        ?query={REGISTRATION_NUMBER}&profession={CODE}
```

- No authentication, **no anti-forgery token, no session cookie, no CAPTCHA / bot wall**; works with any User-Agent; **no JavaScript/headless browser needed** (the data is in the initial HTML).
- `profession` is the registration-number **prefix** and **must match it** — a valid PH number queried as `OT` returns nothing. The prefix identifies the HCPC profession:

| Code | Profession | | Code | Profession |
|---|---|---|---|---|
| `AS` | Arts therapist | | `ODP` | Operating department practitioner |
| `BS` | Biomedical scientist | | `OR` | Orthoptist |
| `CH` | Chiropodist / podiatrist | | `PA` | Paramedic |
| `CS` | Clinical scientist | | `PH` | **Physiotherapist** |
| `DT` | Dietitian | | `PYL` | Practitioner psychologist |
| `HAD` | Hearing aid dispenser | | `PO` | Prosthetist / orthotist |
| `OT` | Occupational therapist | | `RA` | Radiographer |
| | | | `SL` | Speech & language therapist |

The register search form's own validation regex is the **authoritative** list of currently valid prefixes — validate applicant input against it *before* hitting the site.

### The result shapes

**Every response is HTTP 200 — even "not found."** Outcome must be read from the **body**, never the status code.

| Case | How to detect | Data returned |
|---|---|---|
| **Match** | Has a `Name` / `Status` block | `Name`, `Registration number`, **`Status`**, `Period` (validity dates, e.g. `01/05/2026 to 30/04/2028`), sometimes `Location`, and a **`Data valid on: <timestamp>`** line |
| **Not found** (wrong number) | Body contains `No results returned for {query}` | — |
| **Profession mismatch** | Same `No results returned for {query}` | — |

The **`Data valid on` timestamp** is ideal audit evidence to store on the immutable `verification_decisions` row (alongside a captured screenshot), proving *what* was checked and *when*.

**Only the `Registered` status was observed live.** Other statuses exist (struck off, suspended, lapsed, voluntary removal, entries with conditions) but were not captured. **Treat `Registered` as the sole auto-pass; route everything else to manual review.** The negative shapes should be catalogued from real examples before they are relied on.

### robots.txt

`robots.txt` **disallows** `/check-the-register/register-results/` (the multi-result **surname/list** page) but **not** the `professional-registration-detail/` path above. This is convenient: the verification use case — an applicant supplying their own exact number — lands on the **allowed** path; only surname/list browsing is disallowed. Design around exact-number lookup and respect this.

### Scrapeability verdict

**Technically a green light.** A lightweight GET-and-parse, parsing by stable text-label anchors, is entirely viable and far simpler than a headless-browser scrape. The gating questions are **compliance and relationship** (§6), not feasibility.

### This generalises beyond HCPC

Under FD-1 ("all registered UK practitioners" vs. physio-first), each regulator has its own mechanism and must be assessed separately — e.g. the **GMC** publishes a downloadable List of Registered Medical Practitioners (a bulk file beats scraping), while **BASRAT** and **SST** have register-check web pages but no API (manual-review fallback, per EPIC-A). **The design in this note — credential-validity check + identity binding + uniqueness tripwire — is regulator-agnostic; only the lookup implementation behind the `RegisterLookup` interface changes.**

---

## 4. Defense-in-depth

The binding (§2) is the primary control. These reinforce it — because no IDV product is infallible.

- **One number = one account (uniqueness).** EPIC-A's unique index on registration number means a stolen number can be claimed **once**. When the **legitimate owner** later tries to register, they **collide** — which is itself a fraud tripwire. Recommendation: the collision should **flag internally for review** ("an already-claimed number was re-attempted") even while the applicant sees a generic, no-information-leak message. Either party in a collision is security-interesting.
- **Liveness / anti-spoofing quality is now the top IDV selection criterion** — because the ID check is *the* boundary, resistance to deepfakes and injection attacks matters more than breadth of features (see §7).
- **You generally cannot warn the true owner.** The uncomfortable limitation: Askapeer has no contact channel to the real registrant (the impostor supplied the email), so out-of-band "did you just register?" confirmation is not available unless a regulator offers a registrant-notification route (unlikely). **Uniqueness is the main backstop.**
- **Periodic re-validation** of register status (a registration can lapse or be revoked *after* joining) — Phase 2 per EPIC-A, but the same lookup.

### The one residual that verification cannot close

A **genuine, correctly-verified professional who later hands their account to someone else** defeats every gate above. This is a **post-verification, behavioural/policy** problem, not a verification-gate problem. No IDV vendor solves account-sharing. Name it, accept it, and rely on moderation, behavioural signals, and the zero-tolerance conduct rules — not on the verification pipeline.

---

## 5. The user flow

The applicant's journey and the system's decisions, end to end.

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 1. REGISTER                                                          │
 │    Applicant enters: legal name, email, profession, registration     │
 │    number; acknowledges the anonymity rules.                         │
 │    → account created as `pending`; pending-scoped session (magic     │
 │      link); applicant lands on the holding page.                     │
 └───────────────┬─────────────────────────────────────────────────────┘
                 ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 2. REGISTER LOOKUP  (automatic; §3 HCPC GET)                         │
 │    • Registered  → capture the register NAME; go to step 3.          │
 │    • Not found / profession mismatch (could be a typo) → REVIEW.     │
 │    • Status ≠ Registered (struck off / suspended / lapsed) → REVIEW. │
 │    • Register unavailable / parse failure → REVIEW (or retry).       │
 └───────────────┬─────────────────────────────────────────────────────┘
                 ▼  (Registered only)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 3. IDENTITY VERIFICATION  (applicant completes document + selfie)    │
 │    • clear  AND  ID name MATCHES register name  → APPROVED (auto).   │
 │    • clear  BUT  name mismatch/ambiguous        → REVIEW.            │
 │    • consider / fail                            → REVIEW.            │
 │    • abandoned / timeout (48h, configurable)    → needs_more_info.   │
 └───────────────┬─────────────────────────────────────────────────────┘
                 ▼  (anything not auto-approved)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 4. ADMIN REVIEW  (human; EPIC-A §6)                                  │
 │    Reviewer sees the register result (name, status, evidence         │
 │    timestamp) and the IDV result (verified name, document, liveness),│
 │    makes the NAME-MATCH judgement, and decides:                      │
 │    approve → APPROVED   |   reject → REJECTED   |   request_more_info │
 └───────────────┬─────────────────────────────────────────────────────┘
                 ▼  (approved)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 5. HANDOFF → EPIC-B: choose a pseudonymous handle → app access.      │
 └─────────────────────────────────────────────────────────────────────┘
```

The **only** unattended approval is the all-three-green path through steps 2 and 3. Every other route passes through a human, and nothing is ever auto-rejected.

---

## 6. Result paths (the explicit decision table)

Every combination of the two checks and the binding, and where each one lands. `pending (→review)` means the applicant stays `pending` and waits on the admin queue; the member always sees only the holding page until `approved_verified`.

| Register result | IDV result | Name match | Resulting state | Decided by | Member experience |
|---|---|---|---|---|---|
| Registered | clear | **exact** | **`approved_verified`** | **system (auto)** | "Verified — choose your handle" |
| Registered | clear | ambiguous / mismatch | `pending` (→review) | human | Holding page |
| Registered | consider / fail | — | `pending` (→review) | human | Holding page |
| Registered | abandoned / timeout | — | `needs_more_info` | system (timeout) | "Resume / try again" |
| Not found / profession mismatch | — | — | `pending` (→review) | human | Holding page (may be a typo) |
| Status ≠ Registered (struck off, etc.) | — | — | `pending` (→review) | human → likely `rejected` | Holding page |
| Register unavailable / parse failure | — | — | `pending` (→review or retry) | system / human | Holding page |
| — (admin acts) | — | — | `approved_verified` | human — approve | "Verified — choose your handle" |
| — (admin acts) | — | — | `rejected` | human — reject | "We could not verify you" |
| — (admin acts) | — | — | `needs_more_info` | human — request info | "We need X to continue" |

This maps directly onto EPIC-A's existing states (`pending`, `approved_verified`, `rejected`, `needs_more_info`, and later `suspended`/`expelled`) and its manual-review actions (`approve` / `reject` / `request_more_info`, shipped in S11a). The **new** requirement this table imposes on EPIC-A §5 is the **name-match column**: auto-approval is gated on it, and a "clear" IDV result with a name mismatch is an explicit review branch rather than an approval.

---

## 7. Identity-verification provider recommendation

Because the identity check is *the* trust boundary (§1–§2), the vendor decision is reframed: **liveness / anti-spoofing quality and a structured, extractable verified name are the top criteria** — not breadth of features. The register lookup is **separate** and stays ours; no IDV vendor checks professional-body registers.

### Selection criteria (in priority order)

1. **Biometric liveness & anti-spoofing** — resistance to deepfakes and injection attacks. This is where impersonation is actually defeated.
2. **Structured verified-name output** — so the register cross-match (§2) can be done programmatically.
3. **UK / EU data residency + GDPR** — fits the "no data sold, trust-first" posture and eases the DPIA; an EU/UK processor beats a US one needing SCCs/DPF.
4. **Self-serve, pay-per-check, no annual minimum** — seed volume is tiny; avoid enterprise contracts.
5. **DX / time-to-integrate** — the check sits behind the `IdentityCheck` interface, so the choice is **reversible**; optimise for a fast start now, revisit at the AWS/scale step.

### The landscape (UK-relevant)

> **Note:** Onfido was acquired by **Entrust** (2024) and is now sold within their platform — **re-quote it** rather than assuming its old self-serve pricing.

| Vendor | Why consider it | Watch-outs |
|---|---|---|
| **Stripe Identity** | If Stripe wins FD-2, one vendor for **billing + IDV** — single DPA, one dashboard, strong DX. Big operational win for a small team. | Less configurable; fewer document types/regions than specialists. Fine for a UK-only MVP. |
| **Persona** | Very developer-friendly, flexible flow builder, self-serve, pay-as-you-go. | US-based → GDPR via SCCs; check data-residency options. |
| **Veriff** | EU (Estonia), strong European coverage, good document + biometric and fraud detection. | Confirm no annual minimum. |
| **Yoti** | **UK-based, privacy-by-design / data-minimisation ethos** — strong brand fit with the trust proposition. | Smaller than the giants; check throughput/SLA. |
| **iProov** | **UK; best-in-class biometric liveness — used by the NHS, GOV.UK, Home Office.** Purpose-built for exactly the impersonation threat. | Biometric only — **pair** with a document-IDV vendor, not a full IDV alone. |
| **Sumsub / Signicat** | Orchestration hubs — route to multiple IDV providers behind one integration; Signicat also does European eIDs. | More than a UK-only MVP needs, but future-proof. |
| **Jumio** | Established enterprise IDV, strong compliance. | Enterprise sales motion; likely slower/pricier — probably overkill for seed. |

### Recommendation

- **Shortlist to evaluate:** **Stripe Identity** (if Stripe is the processor — single-vendor simplicity is hard to beat), **Persona**, and **Veriff**, with **Yoti / iProov** as the UK/trust-fit wildcards.
- **Weight liveness heavily** given the threat model — do not economise on the biometric.
- **Treat the choice as reversible** (it sits behind `IdentityCheck`); pick the fastest, lowest-commitment path to a working seed and revisit before real scale.
- If the strongest liveness (iProov-grade) is wanted but the leading document-IDV vendor's is only adequate, a **document-IDV vendor + iProov pairing** is a legitimate architecture — both behind the same interface.

---

## 8. Compliance & legal checklist

Technical ease (§3) does not settle any of these — this is now the gating work, and it should go through the standing DPIA / legal-counsel review already on the backlog.

- **Approach the regulator first.** Ask **HCPC** for an official verification/employer-checking route or a **data-sharing agreement / bulk extract** — better than scraping, and on-brand for a trust platform. (The GMC's downloadable register is the model.)
- **UK database right** — do **not** cache or systematically extract the register. **Store only the decision**: what was checked, when, the result, and an evidence reference (the `Data valid on` timestamp + a screenshot) on the immutable `verification_decisions` row.
- **Read the register's terms of use** for the checking/extraction stance.
- **GDPR** — you become a controller the moment you store registrant data; storing only the *outcome* keeps that footprint minimal and defensible.
- **Operationalise as an assist, not an oracle.** Run the lookup **per applicant, low rate, cache-nothing**, behind the `RegisterLookup` interface, **as an assist to human review**. EPIC-A's "register unavailable → `needs_review` → admin review" branch already absorbs scrape failures safely, so a broken or blocked lookup **degrades to manual review, never to a wrong decision.**
- **Add a canary** — a known-good number (e.g. Andrew Renshaw's `PH78516`, which should always read `Registered`) probed on a schedule, so a silent format change (site redesign) is caught and the flow falls back to manual review.

---

## 9. Decisions to confirm

Concrete items this note raises, for the team to ratify before building S2-real or signing an IDV contract.

| ID | Decision | Recommendation | Status |
|---|---|---|---|
| **D-V1** | Make the **name-match binding** an explicit, enforced gate in EPIC-A §5 — auto-approve requires *Registered* **and** *IDV clear* **and** *name match*; a "clear" IDV with a name mismatch is a review branch. | **Adopt** | Proposed |
| **D-V2** | **IDV provider** — evaluate the §7 shortlist, weighting liveness/anti-spoofing; keep it behind `IdentityCheck` as a reversible choice. | Evaluate shortlist | Open |
| **D-V3** | **Register-lookup mechanism** — approach HCPC for an official route/bulk data; interim = per-applicant GET behind `RegisterLookup`, assist + human fallback. | Approach HCPC; interim scrape as assist | Open (needs HCPC contact + DPIA) |
| **D-V4** | **Name-match tolerance policy** — define what auto-passes vs. routes to review (exact vs. fuzzy; maiden/married, titles, diacritics). | Define before S2-real | Open |
| **D-V5** | **Collision handling** — an attempt to register an already-claimed number flags internally for review (generic message to the user). | **Adopt** | Proposed |
| **FD-1 tie-in** | **Professional scope** — physio-first (HCPC only) vs. all registers. The design generalises; each register's lookup is assessed separately. | (Tracks FD-1) | Open |

---

## 10. In one paragraph

The failure mode to design against is **not** "a forged ID" — it is **"a real ID plus someone else's real registration number,"** because registration numbers are public and enumerable. The register lookup validates the *credential*; the identity check plus an **enforced match between the verified ID name and the register name** binds that credential to the *person*; and the one-number-one-account **uniqueness constraint** is the tripwire that catches a stolen number when its rightful owner shows up. Auto-approval requires all three greens; everything else is decided by a human; nothing is ever auto-rejected. That is the whole security model, and the name-match is the piece that must not be skipped.
