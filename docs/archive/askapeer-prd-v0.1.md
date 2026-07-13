# Askapeer — Product Requirements Document

**Version**: 0.1 — Draft for Stakeholder Discussion  
**Date**: June 2026  
**Status**: Pre-sign-off — for review and discussion  
**Stakeholders**: Adrian Hall (Technical Lead), Paul Gouge (Business & Technical), Andrew Renshaw (Clinical Domain Expert & Originator)  
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

This is built on a simple insight: **anonymity creates intellectual honesty.** Practitioners can ask the questions they would never dare ask in a hospital corridor, and offer ideas they would never dare put to a senior colleague by name. Because the network is verified — not open to the public — the quality of discourse remains at a professional standard throughout.

A kudos-based reputation system rewards the best contributors without exposing their identity. Your standing in the community is earned purely through the quality of your thinking.

The initial market is the United Kingdom, home to approximately 590,000 registered medical and sports science practitioners, with physiotherapists (82,000 registered with the HCPC) forming the primary target segment. A subscription model funds the platform, ensuring it remains independent and free from the advertising and pharmaceutical industry conflicts that affect comparable platforms.

The MVP is a focused product: a professional forum with verified identity, strong pseudonymity, a kudos-based ranking system, and case discussion capability built with patient privacy at its core. The platform launches on web, with native iOS and Android to follow.

The three founders — Adrian Hall (technical lead), Paul Gouge (business and technical), and Andrew Renshaw (clinical domain expert and originator) — bring complementary expertise to a market with no comparable UK product.

---

## 2. Problem Statement

### 2.1 The hierarchy problem in sports medicine

Sports medicine and physiotherapy operate within rigid professional hierarchies. Seniority, title, and institutional affiliation carry significant social weight. In practice, this creates several failure modes:

- **Senior practitioners do not ask for help.** Admitting uncertainty to a peer — let alone a junior — risks perceived loss of credibility. Difficult cases are managed in isolation rather than benefiting from collective expertise.
- **Junior practitioners do not contribute.** Good ideas and fresh perspectives go unvoiced because the social cost of being wrong in front of a senior colleague is too high.
- **Learning from failure is suppressed.** A culture of error-denial at senior levels means mistakes are buried rather than shared as learning opportunities. As academic research on organisational failure notes: *"Systems that do not engage with failure struggle to learn."*
- **Confidentiality prevents case sharing.** Even where practitioners want to collaborate on difficult cases, patient confidentiality creates a practical and legal barrier that many do not know how to navigate safely.

### 2.2 The consequence

Best practice diffuses slowly. Clinicians — particularly those working in isolation in private practice, smaller sports clubs, or community settings — lack access to the collective expertise of their peers. The patients of uncertain or isolated practitioners receive worse care as a result.

As Andrew Renshaw, the platform's originator and a Senior Physiotherapist with direct experience of this culture, puts it: *"The biggest obstacle to learning in sports medicine is confidentiality and fear of criticism."*

### 2.3 What is missing

There is currently no platform that:
- Guarantees all participants are qualified, registered professionals
- Removes the identity and hierarchy signals that suppress honest discourse
- Provides a safe, structured mechanism for discussing de-identified patient cases
- Is built specifically for the sports medicine and physiotherapy context
- Is independent of pharmaceutical industry or advertiser interests

---

## 3. Vision & Strategic Goals

### 3.1 Vision

*A world where every sports medicine practitioner has access to the collective expertise of their entire profession — and where the quality of your thinking, not the prestige of your job title, determines your standing.*

### 3.2 Mission

To build the go-to professional network for sports medicine practitioners: verified, pseudonymous, honest, and rewarding enough to keep the best contributors coming back.

### 3.3 The "no ego" principle

The platform's founding philosophy — *"The No Ego Sports Medicine Network"* — is not just a tagline. It is the design constraint that shapes every feature decision. If a feature reintroduces hierarchy signals, it undermines the product. If a feature rewards merit-based contribution, it reinforces it.

### 3.4 Strategic goals

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

| Professional body | Approximate registrants | Examples |
|---|---|---|
| HCPC — Physiotherapists | 82,000 | **Primary target segment** |
| GMC — Doctors / Surgeons | 410,000 | Sports physicians, orthopaedic surgeons |
| HCPC — Radiographers | 48,800 | Imaging in sports medicine context |
| HCPC — Podiatrists / Chiropodists | 12,000 | Lower limb specialties |
| HCPC — Practitioner Psychologists | 31,600 | Sports psychology |
| BASRAT — Sports Rehabilitators | 1,300 | Sports rehabilitation specialists |
| SST — Sports Therapists | 5,500 | Front-line sports therapy |
| **Total UK addressable market** | **~591,200** | |

**Note**: While the platform is open to all of the above, physiotherapy represents the primary strategic focus and the founding team's domain of deepest expertise. Many generalist doctors may already participate in Sermo; the sports medicine subset of GMC registrants is a more specific and underserved audience. The precise scope of the initial launch is a stakeholder decision — see Section 15, FD-1.

### 4.2 Core personas

**Persona A — The Senior Clinician (The Hidden Learner)**
*Example: Consultant sports physician, 20+ years experience*

Works at a high level and is seen as an authority in their institution. Privately uncertain about specific edge cases or emerging techniques but will not admit this to colleagues or juniors. Has decades of experience to share but rarely does so outside of formal teaching contexts. Would benefit enormously from peer consultation if their identity were protected. A reluctant adopter who, once convinced that the anonymity is genuine and enforced, becomes a high-value contributor and a credibility signal for the platform.

**Persona B — The Junior Practitioner (The Unheard Voice)**
*Example: Newly qualified physiotherapist, 2 years post-qualification*

Has current, evidence-based training and fresh perspectives — often better-informed on recent research than senior practitioners. Has genuine ideas but will not voice them in settings where their inexperience is visible. Pseudonymity gives them a level playing field: their contribution is judged on its quality, not their years of experience. Likely an enthusiastic early adopter.

**Persona C — The Isolated Practitioner (The Lone Wolf)**
*Example: Solo private practice physiotherapist, no immediate clinical colleagues*

Works without the daily peer contact that hospital-based practitioners take for granted. No corridor conversations, no MDT meetings, no informal second opinions. Askapeer replaces the professional community they do not have access to. Highly motivated; the platform offers something they genuinely cannot get elsewhere. High potential for deep engagement.

**Persona D — The Sports Medicine Generalist**
*Example: Physiotherapist embedded in a professional sports club*

Manages a wide range of conditions across multiple disciplines and body systems. Regularly encounters cases outside their primary expertise — the nature of working pitch-side or in elite sport. Mobile between venues. High engagement potential; likely an early adopter given the breadth and pace of clinical challenges they face.

### 4.3 Internal platform roles

| Role | Description |
|---|---|
| **Verified Member** | Any registered practitioner who has passed verification. Primary platform user. |
| **Moderator** | Platform-appointed reviewer. Can access real identities behind posts solely for moderation purposes. All identity access is immutably logged. |
| **Administrator** | Platform operations and compliance. Manages the verification queue, appeals, moderation escalations, and policy. |

---

## 5. Market Context & Opportunity

### 5.1 Competitive landscape

No directly comparable platform for UK sports medicine or physiotherapy practitioners was identified in research conducted in early 2025. The nearest comparators:

| Platform | Description | Key differences from Askapeer |
|---|---|---|
| **Sermo** | Verified physician network; primarily North American; pseudonymous | Doctor-focused; pharmaceutical/survey monetisation creates conflicts of interest; not sports medicine specific |
| **LinkedIn** | General professional network; real identity | Not verified; not anonymous; not suited to clinical case discussion |
| **Twitter / X** | Open social media used informally by some clinicians | Not verified; not anonymous; no professional structure or moderation |
| **WhatsApp groups** | Informal peer groups within teams or institutions | Not verified; unsearchable; unmoderated; limited to existing contacts; no knowledge archive |
| **Professional body member areas** | e.g., CSP (Chartered Society of Physiotherapy) | Identity known; limited engagement; not sports medicine specific |

**Conclusion**: There is a meaningful and unoccupied gap in the market. The closest substitute — informal WhatsApp group chats — is unverified, unsearchable, unmoderated, and offers no persistent knowledge base. Askapeer would be the first professionally verified, pseudonymous network designed for this practitioner community.

*Note: This competitive research should be refreshed prior to launch. Andrew Renshaw monitors the sports medicine landscape closely and should confirm there are no new entrants of note.*

### 5.2 Market size (UK)

At an illustrative subscription price of £19.99/month (working example — see Section 11):

| Penetration | Subscribers (physio registrants only) | Indicative annual revenue |
|---|---|---|
| 1% | ~820 | ~£197k |
| 5% | ~4,100 | ~£983k |
| 10% | ~8,200 | ~£1.97M |
| 5% of all UK registered practitioners | ~29,600 | ~£7.1M |

These figures illustrate the opportunity at physio-only penetration, before any broader multi-profession or international expansion.

### 5.3 Why now

- Growing awareness across health professions of the limitations of formal CPD and the value of peer learning
- Increasing digital tool adoption across health professions
- No established competitor in this space — first-mover advantage is available
- AI-assisted development significantly reduces the cost and time to build a production-quality platform

---

## 6. MVP Scope

The MVP is intentionally narrow. The goal is to prove the core thesis — that verified, pseudonymous peer discussion at professional standard is valuable and that practitioners will pay for it — before adding complexity.

### 6.1 MVP feature set (MoSCoW)

#### Must have

| Feature | Description |
|---|---|
| **Registration & identity verification** | Email sign-up and professional registration number submission; identity verified against HCPC, GMC, BASRAT, and SST registers, or via an ID verification API (e.g., Onfido). Real identity stored securely and never exposed to other members. |
| **Pseudonymous handles** | Each verified member chooses a handle. No real name, no employer, no specialty label. All community activity attributed to the handle only. |
| **Professional forum** | Organised discussion threads. Members post questions, contribute answers, and reply in threads. |
| **Kudos system** | Members award kudos to contributions they find valuable. Answers within a thread are ranked by kudos (highest first). Each handle accumulates a total kudos score — their reputation in the community. |
| **Tagging system** | Posts tagged by the author (body area, condition, clinical topic, modality). Tags are browsable and filterable. |
| **Search** | Full-text keyword search across all posts, answers, and tags. |
| **De-identified case discussion** | Structured template for case sharing, with mandatory de-identification checklist and attestation. Cannot be published without completion. |
| **Content reporting** | Any member can report a post or comment, with a category and optional comment. |
| **Moderation tools** | Moderator review queue; actions include: remove content, warn member, suspend account, permanently expel. All actions immutably logged. |
| **Anonymity enforcement** | Zero-tolerance policy enforced at product and policy level. Breaking anonymity (own or another member's) triggers immediate permanent expulsion. |
| **Basic member profile** | Pseudonymous handle, kudos score, member-since date, post history. No real name, employer, location, or specialty label visible to peers. |
| **Notifications** | In-app and email notifications for replies, mentions, and kudos received. Configurable per member. |
| **Subscription and payment** | Payment processing for monthly subscription. Free trial period. |

#### Should have

| Feature | Description |
|---|---|
| **Follow handles** | Follow another member's handle to see their contributions in your feed. You follow their ideas, not their identity. |
| **Saved / bookmarked posts** | Save posts and threads for later reference. |
| **Personalised feed** | Home view based on tags and handles followed, with a trending/top view as fallback. |
| **Email digest** | Weekly digest of top-kudos content in followed tags and overall. |

#### Could have (MVP stretch goals)

| Feature | Description |
|---|---|
| **Polls** | Simple polls attached to posts for rapid community opinion. |
| **Image attachments** | Images with automatic EXIF metadata stripping and upload-time content warnings. |
| **Best answer marker** | Post author can mark one reply as the accepted answer; displayed prominently at the top of the thread. |

#### Will not have in MVP

| Feature | Reason for deferral |
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

When posting a case discussion, the following structured template is presented and required fields enforced:

1. Presenting complaint and primary clinical question for the community
2. Relevant history (non-identifying)
3. Subjective findings
4. Objective findings and clinical measurements
5. Red flags considered
6. Differential diagnosis / clinical hypotheses
7. Interventions tried to date
8. Response to treatment / current status
9. Specific question to the community

See Section 10 for the full de-identification checklist and attestation requirement.

---

## 7. Platform Strategy

### 7.1 Target surfaces

The platform will be delivered across three surfaces:

| Surface | Description |
|---|---|
| **Web application** | Responsive web app accessible on desktop and mobile browser |
| **Native iOS app** | Native application for Apple iPhone and iPad |
| **Native Android app** | Native application for Android devices |

### 7.2 Sequencing

Sports medicine practitioners — particularly those working with professional athletes — are frequently mobile between venues, pitchside, and clinic. Mobile is expected to be the primary access method for a significant user segment, and a native app experience will provide the best engagement on mobile devices.

However, building three platforms simultaneously substantially increases cost, time to market, and ongoing maintenance burden for an unproven product.

**Recommended approach**: Build and launch the web application as the proof-of-concept vehicle. A well-built responsive web app provides a usable mobile experience during this period. Following successful early traction, invest in native iOS and Android development.

> **See FD-3 in Section 15** for stakeholder confirmation of this sequencing.

### 7.3 Hosting and technology approach

The platform will be hosted on **AWS (Amazon Web Services)**, leveraging the team's existing AWS knowledge. Technology stack choices will be made to optimise for developer velocity (a small team building with AI development assistance), long-term maintainability, and suitability for a community platform with real-time notification features. Specific stack decisions are addressed in the technical architecture phase and are out of scope for this document.

---

## 8. Verification & Trust Model

Trust is the core product. Every member of Askapeer is a verified, registered professional. This is non-negotiable and non-bypassable — it is what the entire value proposition rests on.

### 8.1 Verification process

**Step 1 — Registration**
The applicant provides: legal name, email address, professional body, registration number, and country of practice (UK for MVP).

**Step 2 — Identity verification**
The registration number is cross-checked against the relevant professional register. HCPC and GMC both publish searchable public registers. Where possible, verification is automated via API (e.g., Onfido for identity document checks, or direct register query). Where automation is not possible, manual review by a platform administrator provides the fallback.

**Step 3 — Review and approval**
Member status progresses through the following states:

| Status | Meaning |
|---|---|
| `pending` | Application submitted; awaiting review |
| `needs_more_info` | Reviewer has requested additional evidence from the applicant |
| `approved_verified` | Application approved; full community access granted |
| `rejected` | Application not approved; reason provided to applicant |
| `suspended` | Access revoked post-approval (lapsed registration, policy violation) |

Only `approved_verified` members can access community content. All other states see only a holding page with status information.

**Step 4 — Ongoing status**
Lapsed professional registration or serious policy violations can trigger suspension. Periodic reverification (e.g., annual registration check) is a Phase 2 feature.

### 8.2 What verification guarantees and does not guarantee

**Guarantees**: The member was, at time of approval, a registered practitioner with the claimed body. Their real identity is known to the platform.

**Does not guarantee**: Current clinical competence, current good standing (Phase 2), or that any specific contribution represents best practice. Askapeer is a peer discussion platform, not a quality assurance mechanism. Appropriate disclaimers are required throughout the product.

### 8.3 Verification operations

Verification is founder-led initially. As the platform scales, a dedicated verification operations function will be required — this operational cost should be reflected in the subscription pricing model.

---

## 9. Anonymity & Safety Framework

### 9.1 The anonymity principle

Anonymity is the **core value proposition** of Askapeer, not an optional feature. The entire purpose of the platform depends on it. Without genuine, consistently enforced anonymity, the hierarchy problem the platform was built to solve reasserts itself immediately, and the product fails.

> *"The biggest obstacle to learning in sports medicine is confidentiality and fear of criticism."* — Andrew Renshaw, platform originator

**The Askapeer anonymity guarantee:**

> *Every verified member participates under a pseudonymous handle of their own choosing. No other member — regardless of seniority, role, or platform standing — can discover the real identity behind any handle. The platform's moderation and compliance team may access real identities solely to enforce platform policy, with all such access immutably logged and subject to audit.*

### 9.2 The pseudonymous model

| What members choose | What peers see | What the platform stores privately |
|---|---|---|
| A pseudonymous handle — no real name content | Handle, kudos score, post history, approximate membership duration | Real name, registration number, professional body — never exposed to other members |

**Member profiles visible to peers contain:**
- Pseudonymous handle
- Total kudos score
- Approximate membership duration (e.g., "Member since 2025")
- Post and answer history attributed to the handle

**Member profiles do not contain:**
- Real name
- Employer or institution
- Geographic location
- Specialty, grade, or years of experience

> **Design intent**: Even specialty labels partially reintroduce hierarchy signals. A "Consultant Orthopaedic Surgeon" profile carries different status to a "Sports Rehabilitator" profile. By omitting formal credential labels from the visible profile, the meritocratic intent of the platform is preserved. Members' interests and expertise reveal themselves naturally through their posting history and the tags they engage with.

### 9.3 The zero-tolerance rule

**Any attempt by a member to break the anonymity of themselves or another member results in immediate and permanent expulsion from the platform. There are no exceptions.**

This applies to:
- Revealing or attempting to reveal another member's real identity
- Deliberately identifying yourself within a post or comment (which creates pressure for others to do the same, undermining the community norm)
- Any collusion — on or off the platform — to de-anonymise members

This rule is stated clearly in the Terms of Use at registration, during onboarding, and surfaced in the platform UI at relevant moments (e.g., the posting interface).

### 9.4 Moderation access to identity

Moderators and administrators may access a member's real identity **only** in the following circumstances:
- Investigating a reported policy violation
- Responding to a lawful legal or regulatory request
- A credible safety escalation (e.g., a threat of harm)

Every such access is logged immutably with: the accessing moderator's identity, the reason for access, the timestamp, and the action taken. These logs are available for compliance audit but are never visible to other members.

### 9.5 Inadvertent identity disclosure in content

Members can inadvertently identify themselves through post content (naming their institution, describing a unique case scenario that effectively identifies them, referencing a specific event). The platform will:
- Provide clear in-product guidance on what constitutes identifying content when composing a post
- Allow community reporting of apparently identity-revealing content
- Enable moderators to request editing of such content, with the member's handle-level identity remaining protected throughout

---

## 10. Case Discussions & Patient Safety Policy

### 10.1 Purpose and risk

Case discussions are among the highest-value features of the platform — and the highest-risk. The value is peer learning from real clinical experience. The risk is that patient information, even shared with good intentions, could breach patient confidentiality if not properly de-identified.

The platform has an absolute policy: **no identifiable patient information is ever permitted on the platform.** This is both a legal requirement (UK GDPR, Data Protection Act 2018, common law duty of confidentiality) and a fundamental trust requirement for practitioners who share cases.

### 10.2 Mandatory de-identification checklist

Before any case discussion can be published, the member must confirm each of the following items. The post cannot be submitted without completion:

- [ ] No patient names, initials, or aliases are included
- [ ] No address, postcode, or location data that could identify the patient
- [ ] No exact date of birth — age expressed as a band (e.g., 40–49 years)
- [ ] No exact treatment dates — timelines expressed as relative (e.g., "3 weeks post-injury", "day 14 of rehabilitation")
- [ ] No facility, club, team, or organisation name that would uniquely identify the patient in context
- [ ] No patient photographs showing faces, unique tattoos, scars, or other identifying features
- [ ] Any images have been reviewed for embedded metadata; the platform strips EXIF data automatically but I confirm the image content is compliant
- [ ] No uploaded documents contain patient identifiers

### 10.3 Mandatory attestation

After completing the checklist, the member provides the following attestation before the post is published:

> *"I confirm that this case discussion is de-identified in accordance with Askapeer's patient privacy policy. I understand that any breach of patient confidentiality is a serious professional and legal matter and may result in permanent removal from the platform and referral to my professional regulatory body."*

This attestation is recorded with timestamp and linked to the member's verified identity.

### 10.4 Image handling

All images uploaded to the platform have EXIF metadata automatically stripped before storage. Members are warned at the point of upload that:
- Photographs showing patient faces are not permitted under any circumstances
- Images containing uniquely identifying features (visible location signage, recognisable tattoos or scarring, etc.) must not be uploaded
- The member remains professionally responsible for the content they share

### 10.5 Reporting and priority moderation

Case discussions can be reported under the specific category **"Identifiable patient information"**. This category triggers a **priority review** flag in the moderation queue — these reports are actioned before other report types.

Moderation actions available: remove content, request the author to re-submit a corrected version, warn the member, escalate to administrator for potential suspension.

### 10.6 Platform disclaimer

All case discussion pages carry a persistent visible disclaimer:

> *"This discussion is for peer learning purposes only. Responses represent individual practitioner perspectives and do not constitute clinical advice. Practitioners remain responsible for applying professional judgement appropriate to their individual clinical context and local scope of practice."*

---

## 11. Monetisation Strategy

### 11.1 Guiding principles

- The platform must be financially sustainable without compromising its independence or the trust of its members
- Members are never the product — no selling of member data, no pharmaceutical industry targeting, no advertiser relationships
- Revenue from members, for members: a subscription model aligns platform incentives with member interests
- The platform's editorial and content independence must be beyond question

### 11.2 Subscription model

A subscription model is the preferred approach. Members pay for access to the network; the platform's only obligation is to those paying members.

**Illustrative pricing** (working example for business model planning — confirmed pricing is a stakeholder decision, see FD-2):

| | Price |
|---|---|
| Free trial period | 3 months (to seed content and build network density) |
| Monthly subscription | £19.99/month |
| Annual subscription | £199/year (approx. £16.60/month) — for discussion |

**Revenue model at £19.99/month:**

| Active paying subscribers | Monthly revenue | Annual revenue |
|---|---|---|
| 500 | £9,995 | ~£120k |
| 2,000 | £39,980 | ~£480k |
| 5,000 | £99,950 | ~£1.2M |
| 10,000 | £199,900 | ~£2.4M |

*These figures are for planning illustration. They assume post-trial conversion and do not account for payment processing fees, churn, or operational costs.*

### 11.3 The content seeding challenge

A subscription model creates a chicken-and-egg problem: practitioners need to see value before paying, but value requires active membership. The free trial period addresses this, but the length of the trial is a meaningful decision. A 3-month free period may be insufficient to build the network density needed for the platform to feel genuinely valuable. A longer seeding period (e.g., 6 months for the initial launch cohort) should be considered.

Other seeding strategies under consideration:
- University partnership: a cohort of postgraduate students with professional registration provides an engaged early-adopter audience (see FD-6)
- Founder-created seed content and case discussions during the pre-launch period
- Invitation-led early access to Andrew Renshaw's professional network

### 11.4 What the platform will not do

The pharmaceutical survey and sponsored content model used by platforms such as Sermo is explicitly not being pursued. It creates conflicts of interest that would undermine the trust and editorial independence that are central to Askapeer's value. The platform does not sell access to its members for market research or advertising purposes.

### 11.5 Phase 2 revenue options

The following are not in scope for MVP but represent potential supplementary revenue streams consistent with the platform's principles:

- **Premium subscription tier**: Enhanced features such as advanced search, case export for CPD portfolios, and analytics on your own posting history
- **Institutional / team accounts**: A clinic, sports club, or employer subscribes on behalf of a group of practitioners — potential for B2B sales
- **Professional body partnerships**: White-label or co-branded version for a professional association to offer its members

---

## 12. Phased Roadmap

### Phase 1 — MVP (Web application; UK market)

**Goal**: Prove that verified, pseudonymous peer discussion works and that practitioners find it valuable enough to pay for.

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

### Phase 2 — Growth

**Goal**: Increase engagement, retention, and reach. Expand to native platforms.

- Native iOS and Android applications
- Follow handles and personalised feed
- Private and closed groups (specialist interest, regional)
- 1:1 messaging (subject to moderation capacity being in place)
- Advanced search and filtering
- Premium subscription tier
- Institutional / team account offering
- International market expansion (verification infrastructure per market)
- Periodic reverification of member registration status

### Phase 3 — Scale

**Goal**: Establish Askapeer as the definitive professional network for sports medicine globally.

- Multi-language support
- Regional verification partnerships with professional bodies in target markets
- Institutional accounts (clinics, sports clubs, universities, professional associations)
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
| Median time to first response | How long before a posted question receives a reply — proxy for network density |
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
| PHI report resolution time | Time to action reports of potential patient data — must be fast |
| Anonymity breach incidents | Count of confirmed identity-reveal violations — target: zero |

---

## 14. Risks & Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cold start / content problem — new platform with no content | High | High | Extended free trial; seeding strategy; university partnership; founder-created content pre-launch |
| Practitioners unwilling to pay subscription before value is demonstrated | Medium | High | Trial period must be long enough to build genuine network density; value must be tangible before paywall |
| Anonymity breached or widely perceived to be untrustworthy | Low | Critical | Technical controls, zero-tolerance enforcement, clear policy, transparency about how identity is stored and accessed |
| Legal or regulatory challenge related to patient data | Low | Critical | Robust de-identification policy; no PHI storage; legal review of Terms of Use and Privacy Policy prior to launch |
| Moderation overwhelm (founders cannot sustain this at scale) | Medium | Medium | Moderation capacity plan and budget built into Phase 2; community self-moderation tools |
| A well-funded competitor enters the market | Low | Medium | First-mover advantage; network effect; professional body relationships; move quickly |
| API-based verification unavailable for some professional bodies | Medium | Low | Manual review fallback process designed in from the start; founders have direct knowledge of professional register access |
| Registration lapse not caught (member continues posting after deregistration) | Medium | Medium | Phase 2 periodic reverification; Phase 1 community reporting for suspended members |

**Key assumptions:**
- HCPC and GMC registers remain publicly queryable or accessible via API
- UK sports medicine practitioners are willing to pay a subscription for a tool that provides clear professional value
- Andrew Renshaw's existing professional network provides meaningful early-adopter seeding
- A small team building with AI development assistance can deliver the MVP within a commercially viable timeframe

---

## 15. For Discussion

These items require stakeholder decision before the PRD is finalised and development begins. Each is framed as a specific decision, with options and a recommendation where one can be made.

---

### FD-1 — Professional scope at launch

**Decision**: Is the platform open to all UK registered practitioners from day one, or is it scoped to physiotherapists initially, with other professions added in a deliberate later phase?

**Options**:
- **A) Broad from launch** — all registered UK practitioners (HCPC, GMC, BASRAT, SST). Larger addressable market; more complex verification; broader content scope; harder to maintain a coherent community identity early.
- **B) Physio-first MVP** — restrict to HCPC-registered physiotherapists for the MVP; expand to other professions in Phase 2. Simpler to verify; clearer community identity; Andrew Renshaw's deepest expertise; easier to moderate.

**Implication**: Affects verification infrastructure, marketing messaging, content taxonomy design, and the community dynamic from launch. Andrew Renshaw's input is particularly important here.

---

### FD-2 — Subscription pricing and trial length

**Decision**: Confirm the subscription price point, the free trial length, and whether an annual plan is offered at launch.

**Working example**: £19.99/month; 3-month free trial.

**Considerations**:
- Is £19.99/month the right price for the target market? Too high risks low conversion; too low undersells the platform's quality and professionalism.
- Is 3 months sufficient to demonstrate value? A longer initial trial (e.g., 6 months for the founding cohort) may build network density more effectively before the paywall is introduced.
- An annual plan (e.g., £199/year) reduces churn and improves cash flow predictability.
- Payment processor: WorldPay was referenced in Andrew's original concept. Stripe is an alternative worth evaluating for developer integration and international readiness.

---

### FD-3 — Platform sequencing (web first vs. native first)

**Decision**: Confirm that the web application is the MVP delivery vehicle, with native iOS and Android development following post-traction.

**Recommendation**: Web first. Building three platforms simultaneously for an unproven product multiplies cost and time to market with no evidence yet that users want it. A responsive web app gives an acceptable mobile experience while the product is being validated. Native apps are the right investment once traction is established.

**Counter-argument**: If Andrew's professional network and the target use case are heavily mobile (pitchside, between venues), a web app may feel inadequate enough to suppress adoption from the outset.

---

### FD-4 — Forum and content organisation

**Decision**: What is the primary organising principle for the forum?

**Options discussed**:
- **A) Body-area taxonomy** (Shoulder, Knee, Spine, Hip, etc.) — clinically intuitive; Andrew Renshaw has indicated a body part list is available; easy to navigate for practitioners thinking in anatomical terms.
- **B) Topic tagging only** (Reddit-style free tags) — flexible and member-driven; avoids imposing a structure that may not fit every use case; searchable.
- **C) Follow-based feed** — members follow handles and tags; no fixed category hierarchy; content surfaces through engagement.
- **D) Hybrid** — a curated top-level taxonomy (body areas, and perhaps a small set of professional topic areas: Research, Career, Equipment, Professional Development) with free tagging within those categories.

**Recommendation**: Option D (hybrid). A small, stable top-level structure gives new members an immediate mental map of the community. Free tagging within categories provides flexibility and enables sophisticated search as the content archive grows. Body areas are the strongest starting point for the top level.

---

### FD-5 — 1:1 private messaging

**Decision**: Include in MVP or defer to Phase 2?

**Case for inclusion**: Members may want to follow up privately on a case discussion or establish a professional relationship. Absence of messaging could feel like a significant limitation.

**Case for deferral**:
- Requires real-time chat infrastructure (significantly more complex than forum posts)
- Every DM is a potential harassment vector; requires dedicated reporting, block, and moderation flows
- GDPR obligations around message storage and retention
- Professional harassment in a pseudonymous setting on a new platform is a meaningful trust risk
- The core value proposition does not depend on private messaging
- At low user counts (early launch), there is limited demand for it

**Recommendation**: Defer to Phase 2. Offer a lightweight alternative in MVP — allow members to link an optional professional contact point (e.g., LinkedIn URL) on their handle profile, giving motivated members a path to connect without the platform carrying the moderation burden.

---

### FD-6 — University partnership as seeding strategy

**Decision**: Should a formal partnership with a UK university (for postgraduate students with professional registration) be actively pursued as part of the MVP launch strategy?

**Opportunity**: Andrew Renshaw was in early discussions with a UK university about trialling the platform with MSc students who hold professional registration. A cohort of engaged, academically active postgraduate students could provide high-quality early content and help reach critical network density faster.

**Considerations**: Requires relationship management, potentially bespoke onboarding, alignment on Terms of Use, and possibly a subsidised or extended trial for the student cohort. The institutional relationship could also provide credibility and press coverage at launch.

**Action**: Andrew Renshaw to confirm current status of this relationship and appetite to formalise.

---

### FD-7 — Brand name and domain

**Decision**: Is "Askapeer" the final brand? Is a .com domain to be secured?

**Considerations**:
- "Askapeer" communicates the peer-consultation purpose directly and memorably. *Ask a Peer.* It is clear, professional, and works across the sport and clinical context.
- The .co.uk domain implies UK-only. Given global expansion aspirations, a .com domain is preferable.
- A trademark search across key markets (UK, US, EU) is required before committing.
- Domain availability check required.

---

### FD-8 — Competitor research refresh

**Action**: Conduct a fresh UK and international competitive landscape review prior to committing to the development investment. Andrew Renshaw to confirm awareness of any new entrants or comparable platforms in the sports medicine or physiotherapy space since the February 2025 review.

---

## 16. Appendices

### Appendix A — Origin document summary

Askapeer originated as a concept by Andrew Renshaw, Senior Physiotherapist. His original outline (working title: "The No Ego Sports Medicine Network") described a platform for verified UK sports medicine professionals to share knowledge and solve clinical problems anonymously.

Core principles from Andrew's original document that remain foundational to this PRD:

- **Anonymity as the primary mechanism** for enabling honest professional discourse, specifically to overcome the hierarchy and fear-of-criticism problem
- **Zero tolerance for anonymity violations** — breaking anonymity of self or another member results in immediate permanent expulsion
- **Kudos-based ranking** to reward contribution while preserving pseudonymity — community recognition earned through quality of ideas, not seniority
- **Subscription funding model** — to keep the platform independent of pharmaceutical and advertiser interests
- **Learning from failure** as an explicit goal — the platform exists to normalise intellectual honesty and accelerate best practice

The "no ego" framing captures the product philosophy precisely and should inform brand voice and marketing messaging throughout.

### Appendix B — Key terminology

| Term | Definition |
|---|---|
| Verified member | A practitioner whose professional registration has been confirmed by the platform |
| Handle | A pseudonymous username chosen at registration; not linked to real identity; the member's visible identity on the platform |
| Kudos | Community-awarded recognition points; accumulate to a handle's reputation score; used to rank answers within threads |
| De-identified case | A patient case discussion from which all potentially identifying information has been removed per the platform's de-identification policy |
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

*This document is a living draft intended to facilitate stakeholder discussion and alignment. All items marked **[For Discussion]** and catalogued in Section 15 require explicit stakeholder decision before the document is finalised. Nothing in this document is binding until signed off by all three stakeholders: Adrian Hall, Paul Gouge, and Andrew Renshaw.*
