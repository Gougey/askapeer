# EPIC-I — Research/News Feed — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The ninth and final per-epic technical spec. Unlike EPIC-A through EPIC-H, this epic already has substantial design work done — the architecture spec's Section 8 covers source adapters, ingestion, deduplication, classification, and scoring in real detail, validated by the working prototype in `prototypes/research-feed/`. This spec is deliberately lighter: it consolidates what's already decided, adds the member-facing API surface the architecture spec didn't specify, and carries forward the open items already identified there rather than re-deriving them.

Source of truth: the architecture spec's Section 8 (`docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md`) and `docs/AHP_Research_Feed_Design_Conversation.md`/`docs/research-feed-sources-and-roadmap.md`. **Reminder**: EPIC-I is not yet in the PRD's own Section 6.1 MoSCoW list — it was added during architecture design and still needs reflecting back to Paul Gouge and Andrew Renshaw (architecture spec, Section 11 and Section 1).

---

## Contents

1. [Scope](#1-scope)
2. [Data model (as already specified)](#2-data-model-as-already-specified)
3. [Member-facing interest management](#3-member-facing-interest-management)
4. [`member_interests` vs. EPIC-B's `community.follows`](#4-member_interests-vs-epic-bs-communityfollows)
5. [Taxonomy dependency on EPIC-C](#5-taxonomy-dependency-on-epic-c)
6. [API endpoints](#6-api-endpoints)
7. [Carried-forward open items](#7-carried-forward-open-items)
8. [Test plan](#8-test-plan)
9. [Open questions](#9-open-questions)

---

## 1. Scope

**In scope**: source adapters and ingestion (already designed), deduplication and classification (already designed and prototype-validated), the feed API, and — the actual new content in this spec — how a member manages their interest profile, and the relationship between that profile and forum tag-following.

**Out of scope**: everything the architecture spec's Section 8 already fully specifies is referenced, not repeated, here.

---

## 2. Data model (as already specified)

Reproduced from the architecture spec, Section 8, for reference only — no changes proposed:

```
research.articles          (id, doi, pmid, other_ids, title, abstract, journal,
                             published_date, evidence_type, open_access, source_refs, created_at)
research.ingestion_cursors (source_name, last_run_at, last_cursor)
community.member_interests (handle_id, tag, weight, updated_at)
```

Source adapters (`fetchSince(cursor): RawArticle[]`), deduplication order (DOI → PMID → other IDs → normalised title/year → fuzzy match), rule-based classification, and precomputed scoring (topic match + evidence-type weighting + recency) are all as specified there.

---

## 3. Member-facing interest management

The architecture spec designs the ingestion and scoring pipeline in detail but doesn't specify how a member actually builds their `member_interests` profile — the working prototype does this via "interest tags on the Profile pane" (per `docs/research-feed-sources-and-roadmap.md`), which this spec formalises as an API:

```
GET  /v1/research-feed/interests
PUT  /v1/research-feed/interests    { tag, weight }     -- upsert; weight e.g. 0-1 or a small
                                                            integer scale, matching whatever
                                                            the prototype's scoring already
                                                            expects — not redefined here
DELETE /v1/research-feed/interests/:tag
```

`member_interests` is handle-scoped (architecture spec, Section 8's data-boundary note) — this is ordinary `community`-schema data, no `identity` involvement, consistent with everything else in that schema.

---

## 4. `member_interests` vs. EPIC-B's `community.follows`

Worth flagging precisely because it's easy to conflate — these are **two different concepts that happen to both be "a member's interest in a tag"**:

| | `community.member_interests` (this epic) | `community.follows`, `target_type = tag` (EPIC-B) |
|---|---|---|
| Signal | **Weighted** relevance score | **Binary** follow relationship |
| Feeds | The research feed (external content — articles) | Forum personalised feed (EPIC-C) and weekly digest (EPIC-G) — internal content |
| Status | Specified here | Built — the unified handle/tag follow mechanism, resolved 2026-07-14 (EPIC-B spec §8; open-questions doc, Section 2) |

They could plausibly be unified into a single mechanism feeding both, or legitimately stay separate given they serve different content types with different scoring needs. This spec deliberately doesn't resolve that unilaterally — flagged in Section 9 as still open, now that the tag-follow side is no longer a gap but an actual table to weigh unification against.

---

## 5. Taxonomy dependency on EPIC-C

EPIC-C's spec (Section 3) already flags that three vocabularies — the forum's category/tag taxonomy, Andrew Renshaw's body-area list, and the research feed prototype's `taxonomy.json` — overlap without being unified. This epic depends on that reconciliation directly:

- `member_interests.tag` and the classification taxonomy (architecture spec, Section 8) should end up being **the same controlled vocabulary** as whatever EPIC-C settles on for forum tags — not a separately-maintained list.
- Otherwise a member's forum tag-following and their research-feed interests would use different, possibly inconsistent vocabularies for what they experience as one thing: "topics I care about."
- No new work is proposed here — EPIC-C's spec owns resolving it; this section just states the dependency.

---

## 6. API endpoints

```
GET /v1/research-feed?cursor=...     -- already specified, architecture spec Section 8:
                                          combines member_interests weights with precomputed
                                          article scores, returns an explanation string

GET  /v1/research-feed/interests     -- Section 3, new in this spec
PUT  /v1/research-feed/interests
DELETE /v1/research-feed/interests/:tag
```

---

## 7. Carried-forward open items

These are already identified in the architecture spec's Section 11 as EPIC-I pre-launch items — restated here as this epic's responsibility, not re-analysed:

- **DOAJ integration** (predatory-journal legitimacy check) and **Retraction Watch / Crossref integration** (flagging withdrawn papers) — sources identified, integration not yet built.
- **PEDro API access** — worth a direct enquiry to the PEDro team (University of Sydney/NeuRA) given it's the best domain-specific fit found so far, but no confirmed public API.
- **Abstract-redistribution licensing review** — unresolved, relevant if a commercial source (Elsevier/Scopus/Cochrane) is ever added.

---

## 8. Test plan

- **Interest CRUD**: creating/updating/deleting a `member_interests` row is handle-scoped and has no `identity` involvement (same access-boundary test pattern as every other epic's spec).
- Everything else (deduplication, classification, scoring) is already covered by the working prototype's own validation, per the architecture spec — this spec doesn't add new test surface beyond the member-facing interest endpoints.

---

## 9. Open questions

- **PRD update**: EPIC-I still needs adding to Section 6.1's MoSCoW list — a standing item from the architecture spec, restated here since it's this epic specifically that's affected.
- **`member_interests` vs. `community.follows` unification** (Section 4): a genuine design choice spanning this epic, EPIC-B, EPIC-C, and EPIC-G — the tag-follow mechanism itself is no longer missing (resolved 2026-07-14), but whether it should be unified with this epic's weighted interests remains open.
- **Taxonomy reconciliation** (Section 5): depends entirely on EPIC-C's Section 3 resolution — this epic has no independent path to resolving it.
- **The three carried-forward items** (Section 7): DOAJ/Retraction Watch integration, PEDro enquiry, and licensing review all remain open pre-launch work, unchanged from the architecture spec's own assessment.
