# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repository is for a **global, verified-only community platform for physiotherapists** — a Sermo-like network (Sermo is a verified clinician social network for doctors) adapted for physiotherapy. The core trust proposition is that only licensed/registered physiotherapists can post, comment, or message. Optional anonymity is supported per post/comment, with the platform retaining true identity for moderation.

No code exists yet — the repository is currently in the planning/requirements phase.

## Key documents

- `docs/physio-network-requirements-spec.md` — Full MVP + phased requirements specification: verification workflow, post types, case discussion rules, moderation, monetization options, NFRs, acceptance criteria, and epics.
- `docs/sermo-derived-feature-inventory.md` — Feature-by-feature mapping from Sermo's publicly described model to physiotherapy context.

## Domain constraints that must inform every design decision

**Verification states**: `pending` → `approved_verified` / `rejected` / `suspended` / `needs_more_info`. Only `approved_verified` users can access community content.

**Anonymity**: users can post/comment anonymously, but the platform must always retain the real author identity. Moderators/admins can reveal identity with an auditable reason. Other members never see the real identity.

**Case discussions** (`case_discussion` post type) require:
1. Completion of a de-identification checklist (no names, DOB must be age-banded, dates must be relative, no facility names if uniquely identifying, EXIF metadata stripped from images).
2. Mandatory attestation before publishing.
3. Priority moderation queue for "Identifiable patient info" reports.

**Audit logs are immutable** for: verification decisions, moderation actions, and any "reveal anonymous author" events.

**No PHI**: the platform must never store or encourage submission of identifiable patient data.

## MVP scope (agreed)

Core epics for launch:
- **EPIC-A**: Registration + Verification + Admin review queue
- **EPIC-B**: Profile + Preferences
- **EPIC-C**: Topics/Feed + Posting/Commenting + Reactions
- **EPIC-D**: Anonymity + Auditability
- **EPIC-E**: Case Discussions + De-identification enforcement
- **EPIC-F**: Search + Saved
- **EPIC-G**: Moderation (reporting, queues, actions, appeals)

Out of scope for MVP: patient-facing features, clinical decision support as a medical device, paid surveys, sponsored content, private groups, multi-language UI, CE/CPD tracking.

## Monetization (undecided — two options documented)

- **M1 (Sermo-like)**: Free to members; revenue from paid surveys/market research and sponsored content. Requires targeting/segmentation and consent mechanics early.
- **M2 (Subscription/hybrid)**: Free Verified tier + Pro subscription. Simpler trust narrative, clearer unit economics.

The choice between M1 and M2 is a pending product decision and affects what gets built in Phase 2.
