# Sermo-derived feature inventory (publicly described) → adapted for a global physiotherapist network

## Sources (public)
- Sermo “What is Sermo?” support overview: `https://support.sermo.com/hc/en-us/articles/15550464371099-What-is-Sermo`
- Sermo “Communities on Sermo” support overview: `https://support.sermo.com/hc/en-us/articles/39639917515419-Communities-on-Sermo`
- Sermo Methodology (positioning around research/insights): `https://www.sermo.com/methodology/`
- Sermo “Pages” press release: `https://www.sermo.com/press-releases/sermo-launches-pages-new-free-feature-allows-companies-and-organizations-to-engage-on-the-leading-social-network-for-doctors/`
- Wikipedia summary (high-level context only; not authoritative for requirements): `https://en.wikipedia.org/wiki/Sermo`

## Notes on interpretation
- This inventory captures **commonly visible product concepts** described publicly (support/press). It does **not** assume internal implementation details.
- “Adaptation notes” translate the same primitives into a physiotherapy context (global, verified, optional anonymity, de-identified cases).

## Feature inventory table

| Feature area | Sermo-derived feature (public) | User value | Key behaviors (observable/likely) | Adaptation notes for physiotherapy |
|---|---|---|---|---|
| Identity & access | Verified professional membership | Trust: you’re speaking with real clinicians | Join flow emphasizes credential verification; community restricted to professionals | **Strict license/registration verification** by country; keep an internal “verified identity” even when posting anonymously |
| Identity & access | Account profile (role/specialty) | Find relevant peers and discussions | Profile elements used for personalization/targeting | Include physio subspecialties (MSK, neuro, cardio-respiratory, pediatrics, sports, pelvic health), practice setting, languages |
| Anonymity | Ability to participate anonymously (positioned as enabling candor) | Safer discussion of sensitive topics | Anonymous posting/commenting while platform retains accountability | Support **optional anonymity per post/comment**; enforce “no doxxing” and audit trails for moderators |
| Community primitives | Topic/community constructs (“Communities”) | Faster discovery; belonging | Join/follow communities; see scoped content; receive updates | Communities by specialty + by region + by modality (e.g., dry needling, vestibular rehab) + by setting (private practice, hospital) |
| Community primitives | Feed/personalization | See relevant content | Personalized feed; following topics/users | Start simple (follow topics + recency), then ML later; ensure transparency controls |
| Posting | Posts + threaded comments | Knowledge sharing | Create post, comment, react; sort/filter | Add post templates: “Clinical question”, “Career”, “Research”, “Business/ops”, “Equipment” |
| Engagement | Polls | Rapid sentiment + practice patterns | Multi-choice polls, results aggregation | Poll templates for clinical pathways, patient adherence, outcome measures usage |
| Crowdsourcing | Case-solving / “second opinion” tooling (e.g., SERMOsolves described in public comms) | Collective reasoning, faster learning | Structured case prompt; responses; possibly “best answer” selection | **De-identified case discussions** with mandatory checklist + structured template (see requirements) |
| Content | Clinical / professional content (news, education) | Stay up to date | Curated or partner content surfaced in feed | Curate evidence summaries, guideline updates, clinical pearls; later: CE modules |
| Research/monetization | Paid surveys / market research participation | Supplemental income; voice in industry | Eligibility gating; survey invites; payout handling | Optional module: research participation for physios; strong fraud controls; clear labeling and consent |
| Monetization | Sponsored content / advertising products (e.g., self-serve advertiser tooling described in industry press) | Funds the platform | Targeted campaigns, segmentation | If pursued: **strict ad policy** (no medical claims without substantiation; COI labels; region targeting controls) |
| Organizations | “Pages” for companies/organizations | Follow org updates; engage | Org page with posts, followers, engagement | Adapt to: universities, professional bodies, conferences, device vendors, clinics recruiting |
| Trust & safety | Community guidelines and moderation framing (support-driven) | Keeps community professional and safe | Reporting, moderation actions, enforcement | Must support de-identification enforcement, harassment policy, misinformation policy, and escalation workflows |
| Notifications | Notifications for replies/mentions/community activity | Re-engagement | In-app + email/push; user prefs | Fine-grained notification preferences; “quiet hours” by timezone |
| Mobile | Mobile app availability | Convenience, responsiveness | Mobile-first consumption and posting | Plan for mobile early; in MVP, responsive web is acceptable if budget/time constrained |

## Key “Sermo-like” primitives worth preserving
- **Verified-only network** (trust as the core value prop)
- **Topic/community + feed** as the main distribution surface
- **Structured crowdsourcing** for hard cases (adapt to physiotherapy case format)
- **Optional anonymity** to increase participation, with strong moderation/auditability
- **Research/survey** as a major monetization lever (optional depending on business path)


