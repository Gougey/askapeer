# Askapeer

A verified-only, pseudonymous professional network for sports medicine practitioners — *"the no-ego sports medicine network."* Every member is a qualified, registered professional, but no one knows whether they're a senior consultant or a first-year graduate. Ideas win on merit, not rank.

**Founding team**: Adrian Hall (technical lead), Paul Gouge (business & technical), Andrew Renshaw (clinical domain expert & originator).

## Status

Pre-sign-off on scope; the production build is underway. The [PRD](docs/askapeer-prd-v0.1.md) is in stakeholder review, with 8 open decisions (FD-1 through FD-8, see PRD §15).

The application is being built in `apps/` as thin, tracer-bullet vertical slices — a NestJS API and a Next.js web app (Postgres + Redis). It deploys to Fly.io (London) in a *prove-then-migrate* phase, ahead of an AWS `eu-west-2` production target. Live so far: **S0–S5** (register → verify → pick a handle → post a question → answer → kudos and ranking) plus a **read-only admin console** (members, verification journeys, review queue, immutable audit) with **verification actions** (approve / reject / request more info), and the first **moderation** slices — **member reporting** (report a post, comment, or handle, S11b) a **moderation queue** (priority-ordered triage; remove content with kudos clawback, warn, or dismiss, S11c), **handle enforcement** (suspend, expel, or force-rename a handle, S11d), and the **audited reveal-identity** action (the single logged exception to pseudonymity, S11e). The forum now carries Andrew's full **clinical tag taxonomy** — 588 nodes over four levels — picked in the composer through a search-and-browse bottom sheet. See [DEVELOPMENT.md](DEVELOPMENT.md) for how to run it and where things stand. The two prototypes below remain as disposable references and are not the production build.

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
