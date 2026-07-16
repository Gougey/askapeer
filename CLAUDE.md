# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Askapeer** is a verified-only, pseudonymous professional network for sports medicine practitioners — *"The No Ego Sports Medicine Network"*. The core thesis: every member is a qualified, registered professional, but no one knows whether they are a senior consultant or a first-year graduate. Ideas win on merit, not rank.

The platform launches UK-first (web), with native iOS/Android and international expansion in later phases.

See `README.md` for what currently exists in this repo (the PRD plus two early, disposable prototypes — a mobile look-and-feel prototype and a research-feed proof of concept) and how to run each. Neither prototype is the production build; production architecture is still undecided.

**Founding team**: Adrian Hall (technical lead), Paul Gouge (business & technical), Andrew Renshaw (clinical domain expert & originator).

## Key documents

- `docs/askapeer-prd-v0.1.md` — **Source of truth.** Full PRD v0.1 (June 2026): problem statement, personas, MVP scope (MoSCoW), verification model, pseudonymity framework, case discussion policy, monetisation, phased roadmap, KPIs, risks, and 8 open stakeholder decisions (FD-1 through FD-8). The MVP scope, monetisation, and FD tables below are condensed from this document for quick reference — if they ever diverge, the PRD wins.
- `docs/archive/` — Earlier working documents retained for context: original requirements spec, Sermo feature inventory, and Andrew Renshaw's founding concept document. Not authoritative — superseded by the PRD.
- `docs/AHP_Research_Feed_Design_Conversation.md` — design discussion behind the research-feed prototype in `prototypes/research-feed/`.
- `README.md` — human-facing repo overview: what's here, how to run the prototypes. This file (`CLAUDE.md`) covers domain constraints and condensed PRD reference for AI-assisted development instead of repeating that overview.

## Domain constraints that must inform every design decision

**Pseudonymity is mandatory, not optional.** Every member participates under a pseudonymous handle of their choosing. Real name, employer, specialty, grade, and location are never visible to other members. There is no opt-in/opt-out — all community activity is attributed to the handle only.

**Zero-tolerance anonymity rule.** Any attempt to reveal or identify themselves or another member (in a post, reply, or off-platform colluding) results in immediate permanent expulsion with no exceptions. This is stated at registration, during onboarding, and surfaced in the posting UI.

**Verification states**: `pending` → `approved_verified` / `rejected` / `suspended` / `needs_more_info`. Only `approved_verified` members can access community content. All other states see a holding page only.

**Moderation access to identity** is permitted solely for: investigating a reported policy violation, responding to a lawful legal request, or acting on a credible safety escalation. Every access is immutably logged with moderator identity, reason, timestamp, and action taken.

**Case discussions** require:
1. Completion of a mandatory de-identification checklist (no names, DOB age-banded, dates relative, no uniquely identifying facility names, EXIF stripped from images).
2. Mandatory attestation before publish — recorded with timestamp linked to the member's verified identity.
3. Priority moderation queue for "Identifiable patient information" reports.

**Audit logs are immutable** for: verification decisions, moderation actions, and all moderator access to real identity.

**No PHI**: the platform must never store or encourage submission of identifiable patient data. Legal basis: UK GDPR, Data Protection Act 2018, common law duty of confidentiality.

## MVP scope

The MVP proves the core thesis — that verified, pseudonymous peer discussion is valuable enough to pay for — before adding complexity. UK-only, web-only.

| Epic | Description |
|---|---|
| **EPIC-A** | Registration, identity verification, admin review queue |
| **EPIC-B** | Pseudonymous handle and profile system |
| **EPIC-C** | Forum: posting, commenting, tagging, search |
| **EPIC-D** | Kudos system and answer ranking |
| **EPIC-E** | Case discussions with de-identification enforcement |
| **EPIC-F** | Content reporting and moderation tools |
| **EPIC-G** | Notifications (in-app and email) |
| **EPIC-H** | Subscription and payment processing |

**Out of scope for MVP**: 1:1 private messaging, native iOS/Android apps, private/closed groups, multi-language UI, paid surveys, CE/CPD tracking, patient-facing features, employer/organisation pages.

## Monetisation (decided)

Subscription-only. Members pay for access; the platform's only obligation is to those paying members. No advertising, no pharmaceutical industry relationships, no member data sold.

**Working example** (pricing is open — see FD-2): £19.99/month; 3-month free trial; annual plan TBD.

The Sermo-style survey/sponsored-content model is explicitly not being pursued — incompatible with the trust proposition.

## Open stakeholder decisions (FD items)

These are unresolved and must not be assumed closed. See Section 15 of the PRD for full context on each.

| ID | Decision |
|---|---|
| FD-1 | Professional scope at launch — physio-only MVP vs. all UK registered practitioners |
| FD-2 | Subscription pricing, trial length, and whether an annual plan is offered at launch |
| FD-3 | Platform sequencing — confirm web-first; evaluate counter-argument for mobile-first |
| FD-4 | Forum organisation — body-area taxonomy vs. tagging vs. hybrid (recommendation: hybrid) |
| FD-5 | 1:1 private messaging — defer to Phase 2 (recommendation) or include in MVP |
| FD-6 | University partnership as early-adopter seeding strategy (Andrew Renshaw to confirm status) |
| FD-7 | Brand name "Askapeer" and .com domain — trademark search required |
| FD-8 | Competitive landscape refresh before committing to development investment |

## Rules
Whenever writing or amending a .md file, always create an html version and add it to the docs html site, amending the front index page if necessary
