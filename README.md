# Askapeer

A verified-only, pseudonymous professional network for sports medicine practitioners — *"the no-ego sports medicine network."* Every member is a qualified, registered professional, but no one knows whether they're a senior consultant or a first-year graduate. Ideas win on merit, not rank.

**Founding team**: Adrian Hall (technical lead), Paul Gouge (business & technical), Andrew Renshaw (clinical domain expert & originator).

## Status

Pre-sign-off. The [PRD](docs/askapeer-prd-v0.1.md) is in stakeholder review, with 8 open decisions (FD-1 through FD-8, see PRD §15). No production build exists yet — this repo currently holds the PRD and two early, disposable prototypes built to validate feel and technical concept ahead of any committed build.

## What's in this repo

| Path | What it is |
|---|---|
| `docs/askapeer-prd-v0.1.md` | The PRD — single source of truth for scope, personas, verification/pseudonymity model, monetisation, roadmap, and open decisions. |
| `docs/archive/` | Earlier working documents, superseded by the PRD. |
| `docs/AHP_Research_Feed_Design_Conversation.md` | Design discussion behind the research-feed prototype below. |
| `index.html`, `manifest.webmanifest`, `assets/` | **Mobile look-and-feel prototype** — static HTML, mock content only. No backend, auth, verification, or payment. |
| `prototypes/research-feed/` | **Research feed proof of concept** — a working Node app pulling live literature from Europe PMC + OpenAlex, rule-based tagging, and explainable ranking against a member's interest tags. Deployed at https://askapeer-research-feed.fly.dev/. |

## Running the prototypes

### Mobile look-and-feel prototype

Single static file at the repo root:

```bash
python -m http.server 5178
```

Visit http://localhost:5178 — best viewed in a mobile viewport. Modelled on a feed / discussions / activity split (see `index.html` for the current interaction design: anonymity shown rather than stated, no photos or specialty labels, kudos as the only status signal, and a case-discussion flow that can't be posted until de-identification and attestation are complete).

### Research feed prototype

```bash
cd prototypes/research-feed
node server.js
```

See `prototypes/research-feed/README.md` for what it demonstrates, its known limitations, and how to redeploy it.

## Open decisions

See PRD §15 (FD-1 through FD-8) — none of these are assumed closed. Andrew Renshaw's input is particularly needed on FD-1 and FD-6.
