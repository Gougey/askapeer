# Askapeer Research Feed — Prototype

A lightweight proof-of-concept for the personalised research feed concept described in
`docs/AHP_Research_Feed_Design_Conversation.md`. Built to demonstrate the idea to
stakeholders, not as production architecture.

## What it demonstrates

- Pick a few sports-medicine / physio interest tags (conditions, interventions, clinical areas).
- The server queries **Europe PMC** and **OpenAlex** live (both free, no API key required),
  normalises results from both sources into one shape, and deduplicates by DOI.
- Each article is rule-based classified against the interest tags and scored on topic match +
  evidence-type quality (systematic review > RCT > cohort > case report) + recency.
- Only articles matching at least one selected tag are shown — the feed explains *why* each
  article is there (`docs/AHP_Research_Feed_Design_Conversation.md`'s "explainability" idea).
- If both live APIs are unreachable, it falls back to a bundled offline dataset
  (`data/sample-feed.json`, ~380 real articles covering every taxonomy tag) so a demo never
  shows a broken or empty screen.

## What it deliberately does not do (out of scope for this POC)

- No user accounts, no persisted per-member interest weights, no behavioural tracking.
- No vector embeddings / semantic similarity — classification is keyword rule-matching only.
- No scheduled background ingestion — every request queries live, on demand.
- No predatory-journal or retraction filtering.
- Taxonomy is a starting point (sports medicine / physio focused), not the final FD-4 forum taxonomy.

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
