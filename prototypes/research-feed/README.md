# Askapeer Research Feed — Prototype

A lightweight proof-of-concept for the personalised research feed concept described in
`docs/AHP_Research_Feed_Design_Conversation.md`. Built to demonstrate the idea to
stakeholders, not as production architecture.

`public/` now serves the **mobile look-and-feel prototype** (`prototypes/mobile-lookfeel/`)
wired to live data, rather than a standalone tag-picker UI — the "Your feed" pane fetches
real articles, and "Areas you follow" on the Profile pane drives which tags it fetches. The
original static-only mobile prototype is untouched at `prototypes/mobile-lookfeel/` if you
want the no-live-data version.

## What it demonstrates

- The Profile pane's "Areas you follow" chips pick sports-medicine / physio interest tags
  (stored in `localStorage`, no backend accounts).
- The Feed pane's chips mirror those interests; selecting one (or "All") fetches
  `/api/feed?tags=...` and renders real articles into the existing card design.
- The server queries **Europe PMC** and **OpenAlex** live (both free, no API key required),
  normalises results from both sources into one shape, and deduplicates by DOI.
- Each article is rule-based classified against the interest tags and scored on topic match +
  evidence-type quality (systematic review > RCT > cohort > case report) + recency.
- Only articles matching at least one selected tag are shown — the feed explains *why* each
  article is there via a tag pill + evidence-type pill on the card (`docs/AHP_Research_Feed_Design_Conversation.md`'s "explainability" idea) — kudos is deliberately not reused here, since these
  articles have no community endorsement, unlike Discussions content.
- If both live APIs are unreachable, the server falls back to a bundled offline dataset
  (`data/sample-feed.json`, ~380 real articles covering every taxonomy tag); if the client's own
  fetch fails outright (e.g. the app is unreachable), the Feed pane keeps whatever it last
  rendered rather than going blank.

## What it deliberately does not do (out of scope for this POC)

- No user accounts, no persisted per-member interest weights, no behavioural tracking.
- No vector embeddings / semantic similarity — classification is keyword rule-matching only.
- No scheduled background ingestion — every request queries live, on demand.
- No predatory-journal or retraction filtering.
- Taxonomy is a starting point (sports medicine / physio focused), not the final FD-4 forum taxonomy —
  the tag list is hardcoded in `public/index.html` and must match `data/taxonomy.json` exactly.

These are exactly the gaps that would need addressing before this became a real Askapeer
feature — see the discussion in the parent conversation for the fuller list (privacy of
interest profiles, taxonomy unification with the forum, licensing review for commercial
redistribution of abstracts, quality/retraction filtering, diversity-aware ranking).

## Running locally

```
node server.js
```

Then open http://localhost:8787 (or set `PORT` to override).

## Regenerating the offline fallback dataset

```
node scripts/build-sample-feed.js
```

Queries each taxonomy tag individually against Europe PMC + OpenAlex and writes
`data/sample-feed.json`. Takes a few minutes (rate-limited to be polite to the free APIs).

## Deploying to Fly.io

```
flyctl auth login          # interactive browser login, one-time
flyctl launch --no-deploy  # creates/confirms the app from fly.toml
flyctl deploy
```

No secrets or API keys are required — Europe PMC and OpenAlex are open, unauthenticated APIs.
