# Askapeer — Product Requirements Document

**Version**: 0.1 — Draft for Stakeholder Discussion  
**Date**: June 2026  
**Status**: Pre-sign-off — for review and discussion  
**Stakeholders**: Andrew Renshaw (Clinical Domain Expert & Originator), Paul Gouge (Business & Technical), Adrian Hall (Technical Lead) 
**Document owner**: TBD — to be assigned on company formation

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Strategic Goals](#3-vision--strategic-goals)
4. [Target Users & Personas](#4-target-users--personas)
5. [Market Context & Opportunity](#5-market-context--opportunity)
6. [MVP Scope](#6-mvp-scope)
7. [Platform Strategy](#7-platform-strategy)
8. [Verification & Trust Model](#8-verification--trust-model)
9. [Anonymity & Safety Framework](#9-anonymity--safety-framework)
10. [Case Discussions & Patient Safety Policy](#10-case-discussions--patient-safety-policy)
11. [Monetisation Strategy](#11-monetisation-strategy)
12. [Phased Roadmap](#12-phased-roadmap)
13. [Success Metrics & KPIs](#13-success-metrics--kpis)
14. [Risks & Assumptions](#14-risks--assumptions)
15. [For Discussion](#15-for-discussion)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

Medical and sports medicine culture has a problem: hierarchy suppresses honest learning. A senior consultant will not admit uncertainty for fear of losing credibility. A junior clinician will not challenge received wisdom for fear of being dismissed. The result is that learning happens in silos, best practice spreads slowly, and patients pay the price.

**Askapeer** is a verified-only, pseudonymous professional network for sports medicine practitioners that removes this barrier entirely. Every member is a qualified, registered professional — but no one knows whether they are a senior consultant or a first-year graduate. Ideas win on merit, not rank.

Practitioners can ask the questions they would never dare ask in a hospital corridor and offer ideas they would never dare put to a senior colleague by name. Because the network is verified — not open to the public — the quality of discourse remains at a professional standard throughout. A kudos-based reputation system rewards the best contributors without exposing their identity.

The initial market is the United Kingdom, home to approximately 590,000 registered medical and sports science practitioners, with physiotherapists (82,000 HCPC-registered) forming the primary target segment. A subscription model funds the platform, keeping it independent of the advertising and pharmaceutical industry conflicts that affect comparable platforms.

The MVP is a professional forum with verified identity, strong pseudonymity, kudos-based ranking, and structured case discussion capability built with patient privacy at its core. The platform launches on web, with native iOS and Android to follow.

The three founders — Adrian Hall (technical lead), Paul Gouge (business and technical), and Andrew Renshaw (clinical domain expert and originator) — bring complementary expertise to a market with no comparable UK product.

---

## 2. Problem Statement

### 2.1 The hierarchy problem in sports medicine

Rigid professional hierarchies create several failure modes in sports medicine:

- **Senior practitioners do not ask for help.** Admitting uncertainty — to a peer, let alone a junior — risks perceived loss of credibility. Difficult cases are managed in isolation rather than benefiting from collective expertise.
- **Junior practitioners do not contribute.** Good ideas go unvoiced because the social cost of being wrong in front of a senior colleague is too high.
- **Learning from failure is suppressed.** A culture of error-denial means mistakes are buried rather than shared. As Andrew Renshaw, the platform's originator, puts it: *"The biggest obstacle to learning in sports medicine is confidentiality and fear of criticism."*
- **Confidentiality prevents case sharing.** Even where practitioners want to collaborate on difficult cases, patient confidentiality creates a practical and legal barrier that many do not know how to navigate safely.

### 2.2 What is missing

There is currently no platform that:

- Guarantees all participants are qualified, registered professionals
- Removes identity and hierarchy signals that suppress honest discourse
- Provides a safe, structured mechanism for discussing de-identified patient cases
- Is built specifically for the sports medicine and physiotherapy context
- Is independent of pharmaceutical industry or advertiser interests

---

## 3. Vision & Strategic Goals

### 3.1 Vision

*A world where every sports medicine practitioner has access to the collective expertise of their entire profession — and where the quality of your thinking, not the prestige of your job title, determines your standing.*

### 3.2 Mission and founding philosophy

To build the go-to professional network for sports medicine practitioners: verified, pseudonymous, honest, and rewarding enough to keep the best contributors coming back.

The platform's founding philosophy — *"The No Ego Sports Medicine Network"* — is the design constraint that shapes every feature decision. If a feature reintroduces hierarchy signals, it undermines the product. If it rewards merit-based contribution, it reinforces it.

### 3.3 Strategic goals

| Goal | Description |
|------|-------------|
| **Establish trust** | Become the only verified-professional network for UK sports medicine practitioners. Trust is the core product. |
| **Build network density** | Achieve sufficient active membership that any practitioner posting a question receives a useful response within 24 hours. |
| **Become the institutional memory** | Build a searchable archive of peer discussions, case insights, and clinical knowledge that has no equivalent in the profession. |
| **Expand internationally** | Following UK success, expand verification infrastructure to support global markets. |

---

## 4. Target Users & Personas

### 4.1 Primary market — UK registered practitioners

The initial platform is open to any practitioner registered with a recognised UK professional body:

| Professional body | Approximate registrants | Notes |
|---|---|---|
| HCPC — Physiotherapists | 82,000 | **Primary target segment** |
| GMC — Doctors / Surgeons | 410,000 | Sports physicians, orthopaedic surgeons |
| HCPC — Radiographers | 48,800 | Imaging in sports medicine context |
| HCPC — Podiatrists / Chiropodists | 12,000 | Lower limb specialties |
| HCPC — Practitioner Psychologists | 31,600 | Sports psychology |
| BASRAT — Sports Rehabilitators | 1,300 | Sports rehabilitation specialists |
| SST — Sports Therapists | 5,500 | Front-line sports therapy |
| **Total UK addressable market** | **~591,200** | |

The precise scope of the initial launch — physio-only or all registered practitioners — is an open stakeholder decision (see FD-1).

### 4.2 Core personas

**Persona A — The Senior Clinician (The Hidden Learner)**
*Example: Consultant sports physician, 20+ years experience*

Seen as an authority in their institution but privately uncertain about specific edge cases or emerging techniques. Would benefit enormously from peer consultation if their identity were protected. A reluctant adopter who, once convinced the anonymity is real, becomes a high-value contributor and a credibility signal for the platform.

**Persona B — The Junior Practitioner (The Unheard Voice)**
*Example: Newly qualified physiotherapist, 2 years post-qualification*

Often better-informed on recent evidence than senior practitioners. Has good ideas but will not voice them where their inexperience is visible. Pseudonymity gives them a level playing field: their contribution is judged on quality, not years of experience. Likely an enthusiastic early adopter.

**Persona C — The Isolated Practitioner (The Lone Wolf)**
*Example: Solo private practice physiotherapist*

Works without the peer contact that hospital practitioners take for granted — no corridor conversations, no MDT meetings, no informal second opinions. Askapeer replaces the professional community they cannot otherwise access. Highly motivated; the platform offers something they genuinely cannot get elsewhere.

**Persona D — The Sports Medicine Generalist**
*Example: Physiotherapist embedded in a professional sports club*

Manages a wide range of conditions across disciplines. Regularly encounters cases outside their primary expertise. Mobile between venues. High engagement potential and likely an early adopter.

### 4.3 Internal platform roles

| Role | Description |
|---|---|
| **Verified Member** | Any registered practitioner who has passed verification. Primary platform user. |
| **Moderator** | Platform-appointed reviewer. Can access real identities for moderation purposes only. All identity access is immutably logged. |
| **Administrator** | Platform operations and compliance. Manages the verification queue, appeals, and policy. |

---

## 5. Market Context & Opportunity

### 5.1 Competitive landscape

No directly comparable platform for UK sports medicine or physiotherapy practitioners was identified in research conducted in early 2025:

| Platform | Key differences from Askapeer |
|---|---|
| **Sermo** | Doctor-focused; pharmaceutical/survey monetisation creates conflicts of interest; not sports medicine specific |
| **LinkedIn** | Not verified; real identity; not suited to clinical case discussion |
| **Twitter / X** | Not verified; not anonymous; no professional structure or moderation |
| **WhatsApp groups** | Not verified; unsearchable; unmoderated; limited to existing contacts; no knowledge archive |
| **Professional body member areas** (e.g. CSP) | Identity known; limited engagement; not sports medicine specific |

The closest substitute — informal WhatsApp group chats — is unverified, unsearchable, unmoderated, and offers no persistent knowledge base. Askapeer would be the first professionally verified, pseudonymous network designed for this community.

*Competitive research should be refreshed prior to launch. See FD-8.*

### 5.2 Market size (UK)

At an illustrative subscription price of £19.99/month (see Section 11):

| Penetration | Subscribers (physio registrants only) | Indicative annual revenue |
|---|---|---|
| 1% | ~820 | ~£197k |
| 5% | ~4,100 | ~£983k |
| 10% | ~8,200 | ~£1.97M |
| 5% of all UK registered practitioners | ~29,600 | ~£7.1M |

### 5.3 Why now

- Growing awareness across health professions of the limitations of formal CPD and the value of peer learning
- No established competitor in this space — first-mover advantage is available
- AI-assisted development significantly reduces the cost and time to build a production-quality platform

---

## 6. MVP Scope

The MVP is intentionally narrow: prove the core thesis — that verified, pseudonymous peer discussion is valuable enough to pay for — before adding complexity.

### 6.1 MVP feature set (MoSCoW)

#### Must have

| Feature | Description |
|---|---|
| **Registration & identity verification** | Email sign-up and professional registration number; identity verified against HCPC, GMC, BASRAT, and SST registers or via an ID verification API (e.g. Onfido). Real identity stored securely; never exposed to other members. |
| **Pseudonymous handles** | Each verified member chooses a handle. No real name, employer, or specialty label. All community activity attributed to the handle only. |
| **Professional forum** | Organised discussion threads. Members post questions, contribute answers, and reply in threads. |
| **Kudos system** | Members award kudos to contributions they find valuable. Answers within a thread are ranked by kudos (highest first). Each handle accumulates a total kudos score — their community reputation. |
| **Tagging system** | Posts tagged by the author (body area, condition, clinical topic, modality). Tags are browsable and filterable. |
| **Search** | Full-text keyword search across all posts, answers, and tags. *(Design resolved 2026-07-17, EPIC-C §4: PostgreSQL full-text search — weighted `tsvector` + `pg_trgm` typo tolerance + a clinical synonym dictionary seeded from the tag vocabulary; no third-party search engine for MVP. Subject to stakeholder sign-off.)* |
| **De-identified case discussion** | Structured template for case sharing, with mandatory de-identification checklist and attestation. Cannot be published without completion. |
| **Content reporting** | Any member can report a post or comment with a category and optional comment. |
| **Moderation tools** | Moderator review queue; actions: remove content, warn member, suspend account, permanently expel. All actions immutably logged. |
| **Anonymity enforcement** | Zero-tolerance policy enforced at product and policy level. Breaking anonymity (own or another member's) triggers immediate permanent expulsion. |
| **Member profile** | Pseudonymous handle, kudos score, member-since date, post history. No real name, employer, location, or specialty visible to peers. |
| **Notifications** | In-app and email notifications for replies, mentions, and kudos received. Configurable per member. |
| **Subscription and payment** | Payment processing for monthly subscription. Free trial period. |
| **Research / news feed** *(scope addition — EPIC-I)* | Curated feed of relevant sports-medicine research and news, scored against each member's clinical interests (which draw on the same tag vocabulary as the forum). Added during technical design; agreed as a scope addition beyond the original eight epics. |
| **Administration & platform configuration** *(scope addition — EPIC-J)* | Administrator tools for managing reference data and settings — forum categories, the tag vocabulary, the search synonym dictionary, the handle blocklist, and tunable thresholds. Distinct from moderation (EPIC-F); surfaces the "admin-managed" functions the other epics assume. Added during technical design; agreed as a scope addition. |

#### Should have

| Feature | Description |
|---|---|
| **Follow handles** | Follow another member's handle to see their contributions in your feed. You follow their ideas, not their identity. |
| **Saved / bookmarked posts** | Save posts and threads for later reference. |
| **Personalised feed** | Home view based on tags and handles followed, with a trending/top view as fallback. |
| **Email digest** | Weekly digest of top-kudos content in followed tags. |

#### Could have (MVP stretch goals)

| Feature | Description |
|---|---|
| **Polls** | Simple polls attached to posts for rapid community opinion. |
| **Image attachments** | Images with automatic EXIF metadata stripping and upload-time content warnings. |
| **Best answer marker** | Post author marks one reply as the accepted answer; displayed prominently at the top of the thread. |

#### Will not have in MVP

| Feature | Reason |
|---|---|
| **1:1 private messaging** | Significant moderation overhead; harassment risk; low value at low user count. Phase 2. See FD-5. |
| **Native iOS / Android apps** | Web-first proof of concept; native apps follow post-traction. See FD-3. |
| **Private or closed groups** | Added complexity; Phase 2. |
| **Multi-language support** | UK-only MVP. |
| **Paid surveys / market research** | Phase 2 monetisation option only. |
| **CE / CPD credit tracking** | Out of scope. |
| **Patient-facing features** | Never in scope. |
| **Employer / organisation pages** | Phase 2. |

### 6.2 Case discussion template (required fields)

1. Presenting complaint and primary clinical question for the community
2. Relevant history (non-identifying)
3. Subjective findings
4. Objective findings and clinical measurements
5. Red flags considered
6. Differential diagnosis / clinical hypotheses
7. Interventions tried to date
8. Response to treatment / current status
9. Specific question to the community

See Section 10 for the de-identification checklist and attestation requirement.

---

## 7. Platform Strategy

### 7.1 Target surfaces

| Surface | Description |
|---|---|
| **Web application** | Responsive web app; primary MVP delivery vehicle |
| **Native iOS app** | Native application for Apple iPhone and iPad — Phase 2 |
| **Native Android app** | Native application for Android devices — Phase 2 |

### 7.2 Sequencing

Sports medicine practitioners are frequently mobile between venues, pitchside, and clinic, making mobile the expected primary access method for many users. However, building three platforms simultaneously substantially increases cost, time to market, and maintenance burden for an unproven product.

**Recommended approach**: Launch the web application as the proof-of-concept vehicle. A responsive web app provides a usable mobile experience while the product is validated. Invest in native iOS and Android following successful early traction.

> **See FD-3** for stakeholder confirmation of this sequencing, including the counter-argument that a web-only experience may suppress early adoption among mobile-first practitioners.

### 7.3 Hosting and technology

The platform will be hosted on **AWS (Amazon Web Services)**, leveraging existing team knowledge. Stack decisions will optimise for developer velocity (small team building with AI assistance), maintainability, and real-time community features. Specific choices are addressed in the technical architecture phase.

---

## 8. Verification & Trust Model

Trust is the core product. Every member is a verified, registered professional — this is non-negotiable and non-bypassable.

### 8.1 Verification process

**Step 1 — Registration**: applicant provides legal name, email, professional body, registration number, and country (UK for MVP).

**Step 2 — Identity check**: registration number cross-checked against the relevant register. HCPC and GMC both publish searchable public registers. Verification is automated via API where possible (e.g. Onfido); manual review is the fallback.

**Step 3 — Status**: member progresses through:

| Status | Meaning |
|---|---|
| `pending` | Submitted; awaiting review |
| `needs_more_info` | Additional evidence requested |
| `approved_verified` | Full community access granted |
| `rejected` | Not approved; reason provided |
| `suspended` | Access revoked (lapsed registration or policy violation) |

Only `approved_verified` members can access community content. All other statuses see a holding page only.

**Step 4 — Ongoing**: lapsed registration or serious policy violations trigger suspension. Periodic reverification is a Phase 2 feature.

### 8.2 What verification guarantees and does not guarantee

**Guarantees**: the member was a registered practitioner at time of approval, and their real identity is known to the platform.

**Does not guarantee**: current clinical competence or that any contribution represents best practice. Askapeer is a peer discussion platform, not a quality assurance mechanism. Appropriate disclaimers are required throughout.

### 8.3 Verification operations

Verification is founder-led initially. As the platform scales, a dedicated operations function will be required — this cost should be reflected in the subscription pricing model.

---

## 9. Anonymity & Safety Framework

### 9.1 The anonymity guarantee

**The Askapeer anonymity guarantee:**

> *Every verified member participates under a pseudonymous handle of their own choosing. No other member — regardless of seniority, role, or platform standing — can discover the real identity behind any handle. The platform's moderation and compliance team may access real identities solely to enforce platform policy, with all such access immutably logged and subject to audit.*

Anonymity is not an optional feature. Without it, the hierarchy problem the platform exists to solve reasserts itself and the product fails.

### 9.2 The pseudonymous model

**Visible to peers:**

- Pseudonymous handle
- Total kudos score
- Approximate membership duration (e.g. "Member since 2025")
- Post and answer history under the handle

**Never visible to peers:**

- Real name, employer, or institution
- Geographic location
- Specialty, grade, or years of experience

> **Design intent**: Even specialty labels partially reintroduce hierarchy — "Consultant Orthopaedic Surgeon" carries different status to "Sports Rehabilitator." Omitting formal credential labels preserves the meritocratic intent. Members' expertise reveals itself naturally through their posting history.

### 9.3 The zero-tolerance rule

**Any attempt to break the anonymity of themselves or another member results in immediate and permanent expulsion. There are no exceptions.**

This applies to: revealing or attempting to reveal another member's real identity; deliberately identifying yourself in a post (which creates pressure for others to do the same); and any collusion to de-anonymise members on or off the platform.

This rule is stated clearly in the Terms of Use at registration, during onboarding, and surfaced in the posting UI.

### 9.4 Moderation access to identity

Moderators may access real identity **only** when: investigating a reported policy violation; responding to a lawful legal request; or acting on a credible safety escalation. Every access is logged immutably with the moderator's identity, reason, timestamp, and action taken.

### 9.5 Inadvertent identity disclosure

Members can inadvertently identify themselves through post content (naming an institution, referencing a unique event). The platform will provide in-product guidance when composing posts, enable reporting of apparently identifying content, and allow moderators to request editing — with the member's handle identity protected throughout.

---

## 10. Case Discussions & Patient Safety Policy

### 10.1 Purpose and risk

Case discussions are among the highest-value features of the platform and the highest-risk. The platform has an absolute policy: **no identifiable patient information is ever permitted.** This is a legal requirement (UK GDPR, Data Protection Act 2018, common law duty of confidentiality) and a core trust requirement.

### 10.2 Mandatory de-identification checklist

The post cannot be submitted without completing all items:

- [ ] No patient names, initials, or aliases
- [ ] No address, postcode, or identifying location data
- [ ] No exact date of birth — age expressed as a band (e.g. 40–49 years)
- [ ] No exact treatment dates — timelines expressed as relative (e.g. "3 weeks post-injury")
- [ ] No facility, club, or team name that would uniquely identify the patient
- [ ] No patient photographs showing faces, unique tattoos, scars, or identifying features
- [ ] Images reviewed for embedded metadata — the platform strips EXIF automatically; I confirm image content is compliant
- [ ] No uploaded documents contain patient identifiers

### 10.3 Mandatory attestation

> *"I confirm that this case discussion is de-identified in accordance with Askapeer's patient privacy policy. I understand that any breach of patient confidentiality is a serious professional and legal matter and may result in permanent removal from the platform and referral to my professional regulatory body."*

This attestation is recorded with timestamp and linked to the member's verified identity.

### 10.4 Reporting and priority moderation

Reports filed under **"Identifiable patient information"** trigger a **priority review** flag and are actioned before other report types. Moderation actions: remove content, request a corrected resubmission, warn the member, or escalate to administrator.

### 10.5 Platform disclaimer

All case discussion pages carry:

> *"This discussion is for peer learning purposes only. Responses represent individual practitioner perspectives and do not constitute clinical advice. Practitioners remain responsible for applying professional judgement appropriate to their individual clinical context and local scope of practice."*

---

## 11. Monetisation Strategy

### 11.1 Guiding principles

- The platform must be financially sustainable without compromising its independence or member trust
- Members are never the product — no selling of member data, no pharmaceutical industry targeting, no advertiser relationships
- A subscription model aligns platform incentives entirely with member interests
- The pharmaceutical survey and sponsored content model (as used by Sermo) is explicitly not being pursued — it creates conflicts of interest incompatible with Askapeer's trust proposition

### 11.2 Subscription model

Members pay for access; the platform's only obligation is to those paying members.

**Illustrative pricing** (working example — confirmed pricing is a stakeholder decision, see FD-2):

| | Price |
|---|---|
| Free trial period | 3 months |
| Monthly subscription | £19.99/month |
| Annual subscription | £199/year (~£16.60/month) — for discussion |

**Revenue model at £19.99/month:**

| Active paying subscribers | Monthly revenue | Annual revenue |
|---|---|---|
| 500 | £9,995 | ~£120k |
| 2,000 | £39,980 | ~£480k |
| 5,000 | £99,950 | ~£1.2M |
| 10,000 | £199,900 | ~£2.4M |

*Illustrative only. Does not account for payment processing fees, churn, or operational costs.*

### 11.3 The content seeding challenge

A subscription model creates a chicken-and-egg problem: practitioners need to see value before paying, but value requires active membership. A 3-month trial may be insufficient to build the network density needed for the platform to feel genuinely valuable. A longer seeding period (e.g. 6 months for the initial launch cohort) should be considered.

Other seeding strategies under consideration:

- University partnership — postgraduate students with professional registration as an engaged early-adopter cohort (see FD-6)
- Founder-created seed content during pre-launch
- Invitation-led early access through Andrew Renshaw's professional network

### 11.4 Phase 2 revenue options

Potential supplementary streams consistent with platform principles:

- **Premium subscription tier**: advanced search, case export for CPD portfolios, posting analytics
- **Institutional / team accounts**: clinics, sports clubs, or employers subscribe on behalf of a group — B2B sales potential
- **Professional body partnerships**: white-label or co-branded version for an association's members

---

## 12. Phased Roadmap

### Phase 1 — MVP (Web; UK market)

**Goal**: prove the core thesis and that practitioners will pay for it.

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
| **EPIC-I** *(scope addition)* | Research / news feed, scored against member clinical interests |
| **EPIC-J** *(scope addition)* | Administration & platform configuration (reference data, settings) |

*EPIC-I and EPIC-J were added during technical design (2026-07), beyond this PRD's original eight-epic MVP list, and are agreed scope additions. Their full technical specs live in `docs/superpowers/specs/`.*

### Phase 2 — Growth

**Goal**: increase engagement, retention, and reach; expand to native platforms.

- Native iOS and Android applications
- Follow handles and personalised feed
- Private and closed groups (specialist interest, regional)
- 1:1 messaging (subject to moderation capacity)
- Advanced search and filtering
- Premium subscription tier and institutional accounts
- International market expansion
- Periodic reverification of member registration status

### Phase 3 — Scale

**Goal**: establish Askapeer as the definitive professional network for sports medicine globally.

- Multi-language support
- Regional verification partnerships with professional bodies
- CPD / CE credit integration where regulators support it
- Research and educational partnerships

---

## 13. Success Metrics & KPIs

### 13.1 Acquisition

| Metric | What it measures |
|---|---|
| Verified member registrations | Total members with `approved_verified` status |
| Verification conversion rate | % of sign-ups that reach `approved_verified` |
| Cost per verified member | Marketing and operations cost per verified signup |

### 13.2 Engagement

| Metric | What it measures |
|---|---|
| Monthly active members (MAM) | Members who post, comment, or award kudos at least once per month |
| Posts per active member | Average contributions per MAM per month |
| Median time to first response | Proxy for network density — how long before a question gets a reply |
| Kudos awarded per post | Indicator of content quality and community engagement |

### 13.3 Retention and revenue

| Metric | What it measures |
|---|---|
| Post-trial conversion rate | % of free trial members who convert to paid |
| Monthly subscriber retention | % of paying subscribers who renew |
| 12-month member retention | % of members still active after 12 months |
| Monthly recurring revenue (MRR) | Total subscription revenue per month |

### 13.4 Trust and safety

| Metric | What it measures |
|---|---|
| Reports per 1,000 posts | Indicator of content quality and community standards |
| Median moderation response time | Time from report to moderator action |
| PHI report resolution time | Time to action potential patient data reports — must be fast |
| Anonymity breach incidents | Count of confirmed identity-reveal violations — target: zero |

---

## 14. Risks & Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cold start / insufficient content to demonstrate value before paywall | High | High | Extended trial; seeding strategy; university partnership; founder-created content pre-launch |
| Anonymity breached or perceived to be untrustworthy | Low | Critical | Technical controls, zero-tolerance enforcement, transparency about identity storage |
| Legal or regulatory challenge related to patient data | Low | Critical | Robust de-identification policy; no PHI storage; legal review of Terms of Use and Privacy Policy before launch |
| Moderation overwhelm as platform scales | Medium | Medium | Moderation capacity plan and budget in Phase 2; community self-moderation tools |
| A well-funded competitor enters the market | Low | Medium | First-mover advantage; network effect; professional body relationships |
| API-based verification unavailable for some professional bodies | Medium | Low | Manual review fallback process designed in from the start |
| Registration lapse not caught post-approval | Medium | Medium | Phase 2 periodic reverification; Phase 1 community reporting |

**Key assumptions:**

- HCPC and GMC registers remain publicly queryable or accessible via API
- UK sports medicine practitioners will pay a subscription for a tool that provides clear professional value
- Andrew Renshaw's professional network provides meaningful early-adopter seeding
- A small team building with AI development assistance can deliver the MVP within a commercially viable timeframe

---

## 15. For Discussion

These items require stakeholder decision before the PRD is finalised and development begins.

---

### FD-1 — Professional scope at launch

**Decision**: open to all UK registered practitioners from day one, or physiotherapists only for MVP with other professions added later?

- **A) Broad from launch** — larger addressable market; more complex verification; harder to maintain a coherent early community identity
- **B) Physio-first MVP** — simpler verification; clearer community identity; Andrew Renshaw's deepest expertise; easier to moderate; expand to other professions in Phase 2

Andrew Renshaw's input is particularly important here.

---

### FD-2 — Subscription pricing and trial length

**Decision**: confirm price point, trial length, and whether an annual plan is offered at launch.

**Working example**: £19.99/month; 3-month free trial.

- Is £19.99/month the right price? Too high risks low conversion; too low undersells the platform's professionalism.
- Is 3 months sufficient? A longer initial trial (e.g. 6 months) may build network density more effectively before the paywall activates.
- An annual plan (e.g. £199/year) reduces churn and improves cash flow predictability.
- Payment processor: WorldPay was referenced in the original concept; Stripe is worth evaluating for developer integration and international readiness.

---

### FD-3 — Platform sequencing

**Decision**: confirm web-first as the MVP delivery vehicle, with native iOS and Android following post-traction.

**Recommendation**: web first — building three platforms simultaneously multiplies cost and time with no validated demand yet.

**Counter-argument**: if the target use case is heavily mobile (pitchside, between venues), a web-only experience may suppress early adoption. Should be tested with Andrew's network.

---

### FD-4 — Forum and content organisation

**Decision**: primary organising principle for the forum?

- **A) Body-area taxonomy** (Shoulder, Knee, Spine, etc.) — clinically intuitive; Andrew Renshaw has an existing body part list
- **B) Topic tagging only** (Reddit-style) — flexible and member-driven; searchable
- **C) Follow-based feed** — no fixed hierarchy; content surfaces through engagement
- **D) Hybrid** — curated top-level categories (body areas plus a small set of professional topics: Research, Career, Equipment) with free tagging within them

**Recommendation**: Option D. A stable top-level structure gives new members an immediate mental map; free tagging provides flexibility and search depth as the archive grows.

**Update (2026-07-17 — taxonomy substance resolved with Andrew Renshaw)**: Option D is adopted, but with a refinement to what the two halves are. **Categories are the *content type*** (Clinical Case, Research, Career, Equipment, General) — *not* body areas — and are admin-managed. **Body areas, muscles, structures, and pathologies are all *tags***, drawn from a single curated, admin-managed **unified vocabulary** (`community.tags`, faceted by region/muscle/structure/pathology) that is shared by both the forum and the research feed. Tags are curated, not free member tagging. OSIICS was considered and omitted (too complex for the audience); MeSH is retained only as an internal mapping. Full record: `docs/2026-07-17-taxonomy-standards-research.md` and EPIC-C §3. FD-4's design substance is settled; formal stakeholder sign-off of the hybrid model remains.

---

### FD-5 — 1:1 private messaging

**Decision**: include in MVP or defer to Phase 2?

**Case for deferral**: requires real-time chat infrastructure; every DM is a harassment risk requiring dedicated moderation flows and GDPR retention obligations; the core value proposition does not depend on it; demand is low at small user counts.

**Recommendation**: defer to Phase 2. In MVP, allow members to optionally add a professional contact link (e.g. LinkedIn URL) to their handle profile, giving motivated members a path to connect without the platform carrying the moderation burden.

---

### FD-6 — University partnership as seeding strategy

**Decision**: should a formal partnership with a UK university (postgraduate students with professional registration) be pursued as part of the launch strategy?

Andrew Renshaw was in early discussions with a UK university about trialling the platform with MSc students. A cohort of engaged postgraduates could seed high-quality content and accelerate network density. Requires relationship management, alignment on Terms of Use, and potentially a subsidised trial for the cohort.

**Action**: Andrew Renshaw to confirm current status of this relationship.

---

### FD-7 — Brand name and domain

**Decision**: is "Askapeer" the final brand? Is a .com domain to be secured?

"Askapeer" (*Ask a Peer*) communicates the purpose directly. A .com domain is preferable to .co.uk given global expansion aspirations. Trademark search across UK, US, and EU markets required before committing.

---

### FD-8 — Competitor research refresh

**Action**: conduct a fresh competitive landscape review before committing to the development investment. Andrew Renshaw to confirm awareness of any new entrants in the sports medicine or physiotherapy space since the February 2025 review.

---

## 16. Appendices

### Appendix A — Origin and founding concept

Askapeer was originated by Andrew Renshaw, Senior Physiotherapist, under the working title *"The No Ego Sports Medicine Network"* (2024). The concept described a verified, anonymous platform for UK sports medicine professionals to share knowledge and solve clinical problems without hierarchy or fear of criticism. Andrew's original document is retained in the project archive (`docs/archive/`). The principles it established — anonymity as the primary mechanism, zero tolerance for anonymity violations, kudos-based contribution ranking, subscription funding, and learning from failure as an explicit goal — remain foundational and are reflected throughout this PRD.

### Appendix B — Key terminology

| Term | Definition |
|---|---|
| Verified member | A practitioner whose professional registration has been confirmed by the platform |
| Handle | A pseudonymous username chosen at registration; not linked to real identity |
| Kudos | Community-awarded recognition points; accumulate to a handle's reputation score; used to rank answers within threads |
| De-identified case | A patient case from which all potentially identifying information has been removed per platform policy |
| PHI | Protected Health Information — identifiable patient data; never permitted on the platform |
| HCPC | Health and Care Professions Council — UK regulator for physiotherapists, podiatrists, radiographers, and practitioner psychologists |
| GMC | General Medical Council — UK regulator for doctors and surgeons |
| BASRAT | British Association of Sport Rehabilitators and Trainers |
| SST | Society of Sports Therapy |
| MoSCoW | Prioritisation framework: Must have, Should have, Could have, Won't have |

### Appendix C — Document changelog

| Version | Date | Author | Summary |
|---|---|---|---|
| 0.1 | June 2026 | A. Hall | Initial draft for stakeholder discussion; all FD items open |

---

*This document is a living draft. All items in Section 15 require explicit stakeholder decision before the PRD is finalised. Nothing is binding until signed off by all three stakeholders: Adrian Hall, Paul Gouge, and Andrew Renshaw.*
