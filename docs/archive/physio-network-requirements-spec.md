# Global physiotherapist network — requirements specification (MVP + phased)

## 1) Product definition
### 1.1 Vision
A global, verified-only community for physiotherapists to discuss practice, share de-identified cases, learn, and contribute insights—similar to Sermo’s clinician network model, but specialized for physiotherapy.

### 1.2 Core constraints (agreed)
- **Strict verification**: only verified physiotherapists can post/comment/message.
- **Optional anonymity**: users may post/comment as “Anonymous”; the platform retains the underlying identity for safety/moderation/legal.
- **De-identified case discussion allowed**: only if strictly de-identified and compliant with platform policy.

### 1.3 Non-goals (initial)
- Patient-facing features (booking, telehealth, patient portals)
- Storage of identifiable patient data or documents
- Clinical decision support that outputs “treatment prescriptions” as a medical device feature

## 2) Personas & roles
- **PhysioMember (Verified)**: primary user.
- **Moderator (Clinical/Community)**: reviews reports, enforces policy, escalates safety issues.
- **Admin (Ops/Compliance)**: manages verification operations, policy, audits, payments (if applicable).
- **OrgUser (Optional)**: research client / advertiser / partner content publisher (only if monetization modules included).

## 3) Functional requirements — MVP

### FR-1 Onboarding & strict verification
**Goal**: ensure only legitimate physiotherapists participate.

**Requirements**
- **FR-1.1 Registration**: email + password (or federated login later), accept Terms/Privacy.
- **FR-1.2 Identity basics**: legal name, country of practice, profession = physiotherapist, registration/licence number (where applicable), issuing body (free-text + selectable list per country), optional supporting evidence upload (PDF/image).
- **FR-1.3 Verification workflow**:
  - **Automated checks** where a public registry is accessible (phaseable; MVP can be manual-first).
  - **Manual review queue** for the rest; staff tools to approve/deny/request more info.
  - **Status states**: `pending`, `needs_more_info`, `approved_verified`, `rejected`, `suspended`.
- **FR-1.4 Access control**:
  - Unverified users can create an account but **cannot** access community content beyond a limited marketing page.
  - Only `approved_verified` can read/post/comment/message.
- **FR-1.5 Reverification**: ability to trigger reverification (report-driven) and periodic checks (phase 2).

**Acceptance criteria**
- A registrant cannot create posts/comments/messages until verified.
- Moderators/admins can view verification evidence and an audit log of decisions.

### FR-2 Profile & preferences
**Goal**: enable discovery and relevance.

**Requirements**
- **FR-2.1 Profile fields**: display name, country/region, languages, specialties/interests, practice setting (private practice, hospital, community, sports team, etc.), years of experience (banded), optional bio.
- **FR-2.2 Privacy controls**:
  - Show/hide display name vs handle.
  - Control whether profile is searchable within the platform.
- **FR-2.3 Preferences**: notification settings, content language preferences, accessibility (font scaling).

### FR-3 Communities, topics, and feed
**Goal**: help users find relevant discussions quickly.

**Requirements**
- **FR-3.1 Topics**: admin-managed taxonomy (specialties, modalities, professional topics).
- **FR-3.2 Follow topics** and optionally follow users.
- **FR-3.3 Feed**:
  - Default feed = followed topics + trending + recent.
  - Filters: `All`, `Following`, `Cases`, `Polls`, `Saved`.
  - Sorting: `Top` (engagement), `New`.
- **FR-3.4 Communities/groups (MVP scope choice)**:
  - MVP: public topic-based communities only.
  - Phase 2: private groups (e.g., region, interest, employer alumni).

### FR-4 Posting, commenting, and engagement
**Goal**: professional knowledge exchange.

**Requirements**
- **FR-4.1 Post types**: `general_post`, `case_discussion`, `poll`.
- **FR-4.2 Rich content**: text + links; attachments in MVP limited to images (with strong controls) and PDFs (optional).
- **FR-4.3 Engagement**: reactions (like/agree/thanks), comments, mentions, tagging topics.
- **FR-4.4 Save/bookmark** posts.
- **FR-4.5 Editing**: edit window (e.g., 15–30 minutes) with edit history (phase 2).

### FR-5 Optional anonymity (per post/comment)
**Goal**: encourage candid discussion without losing accountability.

**Requirements**
- **FR-5.1 Anonymous toggle** available at post creation and per-comment.
- **FR-5.2 Display rules**:
  - To other members: author shown as “Anonymous”.
  - To moderators/admins: author identity visible with reason-for-access audit logging.
- **FR-5.3 Abuse prevention**:
  - Rate limits and heuristics for anonymous posting.
  - Escalation triggers (e.g., multiple reports) remove anonymity for moderation review only.

**Acceptance criteria**
- A verified user can create an anonymous post; other users cannot see their profile through the post.
- Moderators can identify the user behind an anonymous post and action it with a logged reason.

### FR-6 De-identified case discussions (structured)
**Goal**: safe clinical learning without collecting PHI/identifiers.

**Requirements**
- **FR-6.1 Case template** (required fields, with optional sections):
  - Presenting complaint / primary goal
  - Relevant history (non-identifying)
  - Subjective findings
  - Objective findings (measurements as needed)
  - Red flags considered
  - Differential considerations / hypotheses (within physio scope)
  - Plan/interventions tried
  - Response to treatment / outcomes so far
  - Question to the community
- **FR-6.2 De-identification checklist** (must be completed):
  - No names, initials, addresses, contact details
  - No exact DOB; use age band (e.g., 40–49)
  - No exact dates; use relative timelines (e.g., “3 weeks post-op”)
  - No facility names if uniquely identifying
  - No patient face photos; no unique tattoos/scars; no metadata (EXIF) in images
  - No uploaded documents that can contain identifiers (unless redacted)
- **FR-6.3 Mandatory attestation**: “I confirm this case is de-identified and complies with policy.”
- **FR-6.4 Image/document handling**:
  - Strip metadata; warning prompts for images.
  - Optional “redaction tool” (phase 2).
- **FR-6.5 Safety disclaimers**: shown on case submission and within case pages.
- **FR-6.6 Reporting & escalation**:
  - Report reasons include “Identifiable patient info”, “Unsafe advice”, “Harassment”, “Spam”.
  - Fast-path moderation queue for “Identifiable patient info”.

**Acceptance criteria**
- A user cannot publish a `case_discussion` without completing checklist + attestation.
- A moderator can remove a case, record rationale, and notify the author with remediation guidance.

### FR-7 Search & discovery
**Goal**: find prior discussions and reduce repetition.

**Requirements**
- **FR-7.1 Search** across posts and cases (title/content/tags).
- **FR-7.2 Filters**: topic, post type, language (phase 2), date range.
- **FR-7.3 Suggested topics** during posting (phase 2).

### FR-8 Notifications
**Goal**: keep members engaged without spamming.

**Requirements**
- **FR-8.1 In-app notifications**: replies, mentions, follows, moderation actions.
- **FR-8.2 Email notifications**: opt-in digest; critical moderation notices.
- **FR-8.3 Preferences**: per-notification type + quiet hours.

### FR-9 Messaging (MVP scope choice)
**Recommendation**: MVP includes **1:1 messaging** only if moderation capacity exists; otherwise push to Phase 2.

**If in MVP**
- Verified-only DMs, with block/report, rate limits, and audit logging.

### FR-10 Moderation & governance (tools)
**Goal**: enforce professional and de-identification policy.

**Requirements**
- **FR-10.1 Reporting**: any content can be reported with category + optional comment.
- **FR-10.2 Moderator queue**: filter by severity, especially “identifiable info”.
- **FR-10.3 Actions**: remove content, warn user, temporary suspend, permanent ban.
- **FR-10.4 Appeals**: user can appeal moderation actions; admin can overturn with audit trail.
- **FR-10.5 Audit logs**: immutable logs for moderation and verification decisions.

## 4) Functional requirements — Phase 2+

### P2-1 Paid surveys / market research (optional monetization)
- Eligibility targeting (country, specialty, setting) with consent capture.
- Survey invitations, completion tracking, fraud/duplicate detection.
- Payout workflows (country-specific constraints), tax forms (where required).
- Strict separation between survey clients and individual member identities (aggregation/anonymization by default).

### P2-2 Sponsored content & organization presence (optional monetization)
- Organization onboarding + verification.
- Org pages; sponsored posts clearly labeled; comment controls; targeting rules.
- Ad/sponsored policy enforcement and disclosures (COI).

### P2-3 Private groups
- Invite-only groups; additional case controls; group-level moderation.

### P2-4 Education, events, jobs (optional growth levers)
- Webinars/events listing + registration.
- Jobs board (employer accounts) with anti-scam controls.
- CE/CPD tracking (only if you intend to support credits by jurisdiction).

### P2-5 Localization / regional policy variants
- Multi-language UI; content language tagging.
- Region-specific verification forms and policy differences.

## 7) Monetization options (roadmap split)

### Option M1: Free-to-users, multi-revenue (Sermo-like)
**Primary revenue drivers**
- **Paid surveys/market research** (P2-1)
- **Sponsored content / organization presence** (P2-2)
- **Partnerships** (e.g., professional bodies, conferences, universities) with clear labeling

**Implications**
- Must build targeting/segmentation and consent mechanics early (even if surveys launch later).
- Higher compliance and trust burden: COI, ad labeling, and anti-manipulation controls are core.

**Phased rollout**
- MVP: community + cases + moderation + verification (no monetization required to launch).
- Phase 2: surveys module (pilot with a small verified cohort in 1–2 countries).
- Phase 3: sponsored content + org pages + campaign reporting.

### Option M2: Subscription / hybrid
**Subscription tiers (example)**
- **Free Verified**: core discussion + limited search/history.
- **Pro**: advanced search, case template enhancements, private groups, higher rate limits, bookmarks/collections, export of saved learning notes.
- **Team/Clinic** (optional): private clinic groups, onboarding, analytics.

**Implications**
- Less ad/COI complexity early; more emphasis on feature differentiation and retention.
- Payments, invoicing, refunds, taxes (VAT/GST), and entitlement management become MVP-adjacent if subscription launches early.

**Phased rollout**
- MVP: community + cases + moderation + verification.
- Phase 2: Pro subscription + entitlements + premium features.
- Phase 3: Team/Clinic tier + private groups + admin tooling.

### Decision guidance (what to decide at review)
- If you want **fast growth** and industry partnerships: prefer **M1**.
- If you want **simpler trust narrative** and clear unit economics: prefer **M2/hybrid**.

## 5) Data minimization & compliance posture (product-level)
- Default to **collecting only what’s necessary** for verification and community operation.
- Treat case discussions as **potentially sensitive**: do not design workflows that encourage PHI.
- Clear Terms of Use and content policies; DSAR (data subject access requests) and deletion mechanisms.

## 8) Non-functional requirements (NFRs)

### NFR-1 Availability & resilience
- **Target availability**: 99.9% for MVP; raise later as needed.
- **Backups**: daily backups for primary data; restore tests on a schedule.
- **Disaster recovery**: defined RPO/RTO (set at architecture phase; capture business appetite).

### NFR-2 Performance
- Feed and post pages should feel fast globally; use CDN for static/media.
- Rate limiting for writes (posts/comments/messages) to protect availability.

### NFR-3 Security
- MFA available for admins/moderators; recommended for members.
- Encryption in transit and at rest for all user data and evidence uploads.
- Strong audit logs for: verification decisions, moderation actions, and “reveal anonymous author” events.

### NFR-4 Privacy
- DSAR export and deletion flows (at least for MVP: admin-assisted; later self-serve).
- Retention policies:
  - Verification evidence retention tied to account lifecycle and legal requirements.
  - Moderation logs retained for safety and audit.

### NFR-5 Observability & abuse monitoring
- Metrics: signups→verified conversion, reports per 1k posts, median moderation time, repeat offenders.
- Alerting on spikes in reports, spam indicators, and anomalous posting.

## 9) Policies (enforceable requirements)

### POL-1 De-identification policy (minimum set)
- Prohibit: names/initials, addresses, phone/email, MRNs, exact DOB, full-face photos, unique identifying features (tattoos/rare scars), exact dates.
- Allow: age ranges, approximate timelines, generalized location (country/region), non-identifying clinical measures.
- Prohibit uploading unredacted documents; require redaction.

### POL-2 Clinical safety and scope
- Prominent disclaimers: peer discussion is educational; not medical advice; local scope-of-practice applies.
- Ban content that encourages unsafe practice, harassment, or misinformation.

### POL-3 Conflicts of interest (COI)
- Required disclosure when posting about products/services where there is a financial relationship.
- Sponsored content must be clearly labeled and tracked.

## 10) Acceptance criteria (MVP epics)

### AC-A Verification
- A user with `pending` status cannot access community content.
- Admin can approve/deny/request-more-info; the decision is audited.

### AC-B Posting + anonymity
- A verified user can post normally or anonymously; other users only see “Anonymous”.
- Moderator can reveal author identity with a logged reason and timestamp.

### AC-C Case discussion
- Case posts require checklist + attestation and enforce required template fields.
- Report “Identifiable patient info” places content into a priority queue.
- Moderator can remove content and send the author a remediation notice.

### AC-D Moderation
- Any user can report posts/comments; reporters receive a confirmation.
- Moderators can action reports and track outcomes; repeat offenders can be suspended.


## 6) High-level epics (for planning)
- EPIC-A: Registration + Verification + Admin review
- EPIC-B: Profile + Preferences
- EPIC-C: Topics/Feed + Posting/Commenting + Reactions
- EPIC-D: Anonymity + Auditability
- EPIC-E: Case Discussions + De-identification enforcement
- EPIC-F: Search + Saved
- EPIC-G: Moderation (reporting, queues, actions, appeals)
- EPIC-H (optional MVP): Messaging
- EPIC-I (phase 2): Surveys/Monetization modules


