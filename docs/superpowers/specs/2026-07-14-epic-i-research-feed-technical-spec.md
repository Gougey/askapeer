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

They could plausibly be unified into a single mechanism feeding both, or legitimately stay separate given they serve different content types with different scoring needs.

**Vocabulary unified 2026-07-17 (Andrew's input).** The *vocabulary* both mechanisms reference is now settled: `member_interests.tag` and `community.follows` (`target_type = tag`) both point at the **one** `community.tags` controlled vocabulary (EPIC-C §2–3; resolves §1.2). So a member's news-feed interests and their forum tag-follows are drawn from the *same* list — no risk of two divergent vocabularies for "topics I care about," which was the substance of §1.1's concern. Andrew's news-feed interest list (regions + muscles + structures + pathologies) is exactly the broader-facet slice of that shared table; the news feed simply exposes all facets, where the forum composer groups them.

**Still a deliberate choice, not resolved here**: whether the two *relationship mechanisms* — this epic's **weighted** `member_interests` and EPIC-B's **binary** `community.follows` — should further collapse into one. They serve different scoring needs (relevance-weighting external articles vs. a binary internal follow), so keeping both is defensible; unifying them is a smaller, separable decision now that the vocabulary underneath is shared (Section 9).

---

## 5. Taxonomy dependency on EPIC-C — resolved 2026-07-17

The reconciliation this epic depended on is **done** (Andrew's input, 2026-07-17):

- `member_interests.tag` and the article-classification taxonomy (architecture spec, Section 8) reference **the one `community.tags` controlled vocabulary** EPIC-C now defines (its §2–3) — not a separately-maintained list. Resolves §1.2.
- So a member's forum tag-following and their research-feed interests use the *same* vocabulary for what they experience as one thing: "topics I care about."
- The unified table is **faceted** (`region` / `muscle` / `structure` / `pathology`); the research feed uses the **full** set (Andrew's news-feed list is precisely the muscle/structure/pathology-inclusive slice), whereas the forum composer groups regions under limbs. Same table, surface-appropriate presentation.
- **MeSH** lives on the tag as an internal `mesh_id` (EPIC-C §2) — the mechanism by which a member interest (e.g. "ACL") matches MeSH-indexed Europe PMC/PubMed articles. This is the load-bearing reason MeSH was kept when OSIICS was dropped (see `docs/2026-07-17-taxonomy-standards-research.md`).
- **Article classification → `member_interests` matching** therefore runs off the shared vocabulary + its MeSH mapping; no separate research-only taxonomy is maintained. The prototype's `taxonomy.json` is superseded as a *source of truth* by `community.tags` (it can still seed initial rows).

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

- ~~**PRD update**~~ — **actioned 2026-07-17**: EPIC-I is now in the PRD's §6.1 Must-have list and the Phase-1 epic table (as an agreed post-v0.1 scope addition, pending Paul/Andrew's formal confirmation).
- **`member_interests` vs. `community.follows` unification** (Section 4): **narrowed 2026-07-17** — the *vocabulary* both use is now unified (one `community.tags`), which was the substance of §1.1. What remains is only whether the two *relationship mechanisms* (weighted vs. binary) should collapse into one — a smaller, separable call; keeping both is defensible.
- ~~**Taxonomy reconciliation**~~ (Section 5) — **resolved 2026-07-17** (Andrew's input): one unified `community.tags` vocabulary, faceted, MeSH-mapped internally, used by both forum and feed. Closes §1.2.
- **The three carried-forward items** (Section 7): DOAJ/Retraction Watch integration, PEDro enquiry, and licensing review all remain open pre-launch work, unchanged from the architecture spec's own assessment.

---

## 10. Screen-spec reconciliation (2026-07-19)

The screen & functional spec surfaced three endpoint gaps in this epic's surfaces (the Feed tab B1/B2, interests F5/A7, saved E3). Reconciled:

### 10.1 Interest-selection endpoints (gap G-14)

Onboarding (A7) and Settings › Interests (F5) let a member choose the clinical interests that drive both the research feed and the personalised forum feed — but no read/write for that existed. Added:

```
GET /v1/tags?facet=region,muscle,structure,pathology   -- the selectable vocabulary,
                                                           facet-grouped (community.tags)
GET /v1/me/interests                 -- the caller's current member_interests
PUT /v1/me/interests { tag_ids[] }   -- bulk set (replaces the set); writes
                                        community.member_interests for the handle
```

(The `GET /v1/tags` read is shared with EPIC-C's composer typeahead; the interest surface uses the facet-grouped form.)

### 10.2 Article detail + save (gaps G-16, G-22)

EPIC-I §6 specified the feed list but not a single-article read or a save mechanism (screens B2, E3). Added:

```
GET /v1/research-feed/:articleId     -- single article: title, authors, source/journal,
                                        date, abstract, matched tags, quality flags
```

**Saves/bookmarks (gap G-22) — Should-have, scope decision.** Screens B2 (save article) and E3 (saved posts) both want a bookmark. Recommended as a single unified store rather than two:

```
community.saves (handle_id, target_type(post|article), target_id, created_at)
                 unique(handle_id, target_type, target_id)      -- one save per item
POST   /v1/saves { target_type, target_id }
DELETE /v1/saves/:target_type/:target_id
GET    /v1/me/saves?target_type=      -- powers screen E3
```

- **Decision (Adrian, 2026-07-19): deferred to post-launch.** Saves are a retention nicety, not core to proving the thesis; the MVP ships **without** save buttons (screens B2/E3 lose that affordance at launch). The unified `community.saves` shape above is **specced and settled**, so adding it later is cheap and non-disruptive. *(Table is `community`-side even though articles are EPIC-I's, because saves are member-relationship data alongside `community.follows`.)*

### 10.3 Gap cross-reference

| Gap | Resolution |
|---|---|
| G-14 | `GET /v1/tags` (facet) + `GET`/`PUT /v1/me/interests` (§10.1) |
| G-16 | `GET /v1/research-feed/:articleId` + saves (§10.2) |
| G-22 | Unified `community.saves` + endpoints — Should-have (§10.2) |
