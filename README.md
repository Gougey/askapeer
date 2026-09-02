# Askapeer

A verified-only, pseudonymous professional network for sports medicine practitioners — *"the no-ego sports medicine network."* Every member is a qualified, registered professional, but no one knows whether they're a senior consultant or a first-year graduate. Ideas win on merit, not rank.

**Founding team**: Adrian Hall (technical lead), Paul Gouge (business & technical), Andrew Renshaw (clinical domain expert & originator).

## Status

Pre-sign-off on scope; the production build is underway. The [PRD](docs/askapeer-prd-v0.1.md) is in stakeholder review, with 8 open decisions (FD-1 through FD-8, see PRD §15).

The application is being built in `apps/` as thin, tracer-bullet vertical slices — a NestJS API and a Next.js web app (Postgres + Redis). It deploys to Fly.io (London) in a *prove-then-migrate* phase, ahead of an AWS `eu-west-2` production target. Live so far: **S0–S5** (register → verify → pick a handle → post a question → answer → kudos and ranking); **notifications and the Activity tab** (S10 — an in-app inbox for replies, kudos and account-status changes, per-type delivery preferences, and your own questions and answers); a **read-only admin console** (members, verification journeys, review queue, immutable audit) with **verification actions** (approve / reject / request more info); and the **moderation** slices — **member reporting** (report a post, comment, or handle, S11b), a **moderation queue** (priority-ordered triage; remove content with kudos clawback, warn, or dismiss, S11c), **handle enforcement** (suspend, expel, or force-rename a handle, S11d), and the **audited reveal-identity** action (the single logged exception to pseudonymity, S11e); **case discussions** (S9 — the de-identified clinical template, a checklist and attestation that must both complete before anyone else can see the case, and private drafts); and the **correction loop** (S11f — a moderator can send a case back to its author to fix, hiding it until they re-attest while preserving the answers and kudos underneath it). The forum carries Andrew's full **clinical tag taxonomy** — **1,304 nodes**, covering muscles, ligaments, bones and conditions across six regions — picked in the composer through a search-and-browse bottom sheet; 105 of those tags carry search synonyms, so the words clinicians actually write find the tag they mean. **Search** (S7, S16, S17) runs from the app bar over **both** corpora — discussions and the literature feed, tabbed with a count on each — with a spelling-tolerant fallback and folded-away filters; a category or a tag subtree searches on its own, and every search is a shareable URL. The **Feed** tab carries a research feed (S8): sports medicine and physiotherapy literature ingested twice daily from Europe PMC and OpenAlex, deduplicated, classified against the clinical taxonomy and ranked on evidence quality and recency, with the abstract readable in the app. Members choose their **clinical interests** from the same taxonomy, which then ranks the feed around them. **Email is live** — sign-in links, verification outcomes, replies, kudos and moderation notices all send through Postmark, with bounces feeding a suppression list; sign-in offers a six-digit code alongside the link, because a link cannot reach an app installed on an iOS home screen. Members can **follow a discussion** (S15) — subscribe to a thread whether or not they wrote in it, hear about later replies as a single collapsing notification rather than one per reply, and mute it outright; answering a question now subscribes you to it, which is also what makes muting your own busy thread possible. An **administrator console for the tag vocabulary** (`/admin/config/tags`) maintains synonyms — with a dry run showing what a change would match before it is saved — and adds, moves, retires and merges tags, all audited. See [DEVELOPMENT.md](DEVELOPMENT.md) for how to run it and where things stand. The two prototypes below remain as disposable references and are not the production build.

## What's in this repo

| Path | What it is |
|---|---|
| `apps/api/` | **Production API** — NestJS modular monolith (module-per-epic), Drizzle ORM, Postgres + Redis/BullMQ. |
| `apps/web/` | **Production web app** — Next.js (App Router), Tailwind, next-intl (en-GB), branded with the AskaPeer design system. |
| `DEVELOPMENT.md` | How to run the monorepo locally, the deployed environments, and slice-by-slice notes. |
| `docs/askapeer-prd-v0.1.md` | The PRD — single source of truth for scope, personas, verification/pseudonymity model, monetisation, roadmap, and open decisions. |
| `docs/style-guide/` | **The AskaPeer design system** — `STYLE_GUIDE.md` (canonical spec: colour, typography, components, accessibility, voice) and `styleguide.html` (a live, themeable showcase). Applied to `apps/web`. |
| `docs/archive/` | Earlier working documents, superseded by the PRD. |
| `docs/AHP_Research_Feed_Design_Conversation.md` | Design discussion behind the research-feed prototype below. |
| `docs/body-part-condition-and-synonym-list.md` | **Andrew's clinical vocabulary** (Aug 2026) — anatomy and conditions by region, 350 preferred terms mapped to their synonyms, and the assessment/treatment vocabulary, re-formatted from the supplied PDF. **Parts 1 and 2 are loaded** into the tag taxonomy (588 → 1,304 tags, 11 → 105 with synonyms); Part 3 is search vocabulary for a future thesaurus. Generated by the pipeline in `docs/tools/vocabulary/`. |
| `prototypes/mobile-lookfeel/` | **Mobile look-and-feel prototype** — static HTML, mock content only, no live data. No backend, auth, verification, or payment. |
| `prototypes/research-feed/` | **The same mobile prototype, with a live "Your feed"** — a Node app pulling real literature from Europe PMC + OpenAlex, rule-based tagging, and explainable ranking against interest tags picked on the Profile pane. Deployed at https://askapeer-research-feed.fly.dev/. |

## Running the prototypes

### Mobile look-and-feel prototype (static, no live data)

```bash
cd prototypes/mobile-lookfeel
python -m http.server 5178
```

Visit http://localhost:5178 — best viewed in a mobile viewport. See `prototypes/mobile-lookfeel/README.md` for the interaction design it validates (anonymity shown rather than stated, no photos or specialty labels, kudos as the only status signal, and a case-discussion flow that can't be posted until de-identification and attestation are complete).

### Mobile prototype with live research feed

```bash
cd prototypes/research-feed
node server.js
```

Same mobile shell as above, but "Your feed" and "Areas you follow" are wired to real data. See `prototypes/research-feed/README.md` for what it demonstrates, its known limitations, and how to redeploy it.

## Open decisions

See PRD §15 (FD-1 through FD-8) — none of these are assumed closed. Andrew Renshaw's input is particularly needed on FD-1 and FD-6.
