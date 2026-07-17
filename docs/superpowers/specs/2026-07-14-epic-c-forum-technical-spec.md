# EPIC-C — Forum: Posting, Commenting, Tagging, Search — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 14 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The third per-epic technical spec, building on the architecture spec (`docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md`) and the EPIC-A/EPIC-B specs (verification, handles). Read the architecture spec's Section 4.2 (`community` schema) and Section 6 (search) first. EPIC-C is the largest surface area of the MVP by volume of member interaction, but architecturally the most conventional of the nine epics — most of its design questions are forum-software questions the anonymity model doesn't change, so this spec is more concise than EPIC-A/B where the identity boundary drove most of the content.

Source of truth: `docs/askapeer-prd-v0.1.md`, Section 6.1 (Must/Should/Could feature tables) and Section 6.2 (case discussion template, owned by EPIC-E but built on this epic's `posts` table).

---

## Contents

1. [Scope](#1-scope)
2. [Data model](#2-data-model)
3. [Tagging and the hybrid taxonomy (FD-4)](#3-tagging-and-the-hybrid-taxonomy-fd-4)
4. [Search](#4-search)
5. [API endpoints](#5-api-endpoints)
6. [Edit/delete policy](#6-editdelete-policy)
7. [Scope of the PRD's three Could-have items](#7-scope-of-the-prds-three-could-have-items)
8. [Personalised feed (Should-have)](#8-personalised-feed-should-have)
9. [Boundaries with other epics](#9-boundaries-with-other-epics)
10. [Non-functional notes specific to EPIC-C](#10-non-functional-notes-specific-to-epic-c)
11. [Test plan](#11-test-plan)
12. [Open questions](#12-open-questions)

---

## 1. Scope

**In scope**: posts (questions and, structurally, case discussions — see Section 8), threaded comments/replies, the hybrid tag taxonomy, and full-text search across posts/comments/tags.

**Out of scope for this spec** (owned elsewhere):

- The case-discussion-specific template, de-identification checklist, and attestation — EPIC-E, which builds directly on this epic's `posts` table (a `type = case_discussion` row) rather than a separate table.
- Kudos and answer ranking — EPIC-D. This spec's threads display comments in an order EPIC-D determines (kudos-first); it doesn't compute that order itself.
- Reporting a post/comment — EPIC-F, which reads `post_id`/`comment_id` as a foreign target, not owned here.
- Notification triggers (new reply, mention) — EPIC-G reacts to this epic's domain events; this spec doesn't specify notification delivery.

---

## 2. Data model

Builds on `community.posts`, `community.comments`, `community.tags`/`community.post_tags` already defined in the architecture spec, Section 4.2. This spec adds the **top-level category** table the hybrid taxonomy (FD-4, Option D) requires, which the architecture spec named but didn't fully model:

```
community.categories                  -- fixed, admin-managed, small set (CONTENT TYPE)
  id           uuid PK
  name         text unique            -- content type, not body area:
                                       -- e.g. "Clinical Case", "Research", "Career",
                                       -- "Equipment", "General" (final set TBD, admin-managed)
  description  text
  sort_order   int
  retired_at   timestamptz nullable   -- EPIC-J retire (hide from composer, keep on old posts)

community.posts
  id            uuid PK
  handle_id     uuid FK -> community.handles
  category_id   uuid FK -> community.categories        -- required; the "stable top-level
                                                          -- structure" FD-4's recommendation
                                                          -- calls for
  type          enum(question, case_discussion)
  title         text
  body          text
  status        enum(published, removed, draft, needs_correction)  -- see Section 6;
                                                          -- draft + needs_correction are
                                                          -- used only by case discussions
                                                          -- (EPIC-E), see note below
  tsv           tsvector generated                       -- see Section 4
  created_at    timestamptz
  edited_at     timestamptz nullable

community.comments
  id                 uuid PK
  post_id            uuid FK -> community.posts
  handle_id          uuid FK -> community.handles
  parent_comment_id  uuid FK -> community.comments nullable   -- threading
  body               text
  status             enum(published, removed)
  tsv                tsvector generated
  created_at         timestamptz
  edited_at          timestamptz nullable

community.tags        -- the unified clinical vocabulary (resolved 2026-07-17, §3)
  id           uuid PK
  name         text unique            -- canonical label, e.g. "Knee", "Tendinopathy"
  facet        enum(region, muscle, structure, pathology)
  parent_id    uuid FK -> community.tags nullable   -- region grouping (Upper/Lower limb)
  synonyms     text[]                 -- e.g. ACL -> "anterior cruciate ligament";
                                       -- feeds the search synonym dictionary (§4)
  mesh_id      text nullable          -- INTERNAL only: MeSH mapping for research-feed
                                       -- interop (EPIC-I); never member-facing
  sort_order   int
  retired_at   timestamptz nullable   -- EPIC-J retire (hide from composer, keep on old posts)
community.post_tags   (post_id FK, tag_id FK, primary key(post_id, tag_id))
```

`status = removed` (rather than a hard delete) is what Section 6 needs to distinguish "content that was here and got moderated" from "content that never existed" — a hard delete would break comment threads that reply to it and would be indistinguishable from the moderation action EPIC-F performs (`remove_content`), which needs something to act on.

**`draft` and `needs_correction` are case-discussion-only states** (added 2026-07-17 for EPIC-E). Ordinary questions/answers publish immediately on creation and only ever use `published`/`removed`. Case discussions have a multi-step publish flow (`draft` → `published`, EPIC-E Section 3) and a corrected-resubmission path (`published` → `needs_correction` → back to `published` after re-attestation, EPIC-E Section 8). `needs_correction` hides the whole thread from public view while preserving its comments and kudos — see EPIC-E for the full semantics.

---

## 3. Tagging and the hybrid taxonomy (FD-4) — resolved 2026-07-17

Per the PRD's recommendation (Section 15, FD-4, Option D) and now **confirmed with Andrew Renshaw** (2026-07-17): each post has exactly **one category and zero-or-more tags**.

**Categories = content type** (not body area): a small, fixed, admin-managed set — e.g. *Clinical Case, Research, Career, Equipment, General* (final list admin-managed, working set here). Chosen by the author at creation. This is the correction to an earlier ambiguity: body areas are **tags**, not categories.

**Tags = one unified clinical vocabulary** (`community.tags`, §2). The three previously-unreconciled vocabularies (Andrew's body-area list, the research-feed `taxonomy.json`, and the forum's own list) are **collapsed into a single controlled table** — resolving open-questions §1.2. The full decision, rationale, and the agreed seed rows are in `docs/2026-07-17-taxonomy-standards-research.md` (Decision section). In brief:

| Aspect | Resolution |
|---|---|
| **Structure** | One table, one list — used by **both** case posts and news-feed interests (EPIC-I). A post can carry a clinical tag (*tendinopathy*) **alongside** a region (*knee*), not regions only. |
| **Facets** | Each tag has a `facet` — `region` / `muscle` / `structure` / `pathology` — as organising metadata (composer grouping, feed filtering), **not** a restriction on which surface may use it. |
| **Grouping** | Region tags nest under Upper limb / Lower limb via `parent_id`. |
| **OSIICS** | **Omitted** — Andrew judged it too complex for the audience even as an optional field. |
| **MeSH** | Retained only as an **internal** `mesh_id` per tag (research-feed/search interop); never member-facing. |
| **Maintenance** | The table is extended over time (Andrew's fuller muscle list to follow) via EPIC-J's tag-vocabulary management — Andrew's "maintained in a table to allow additions going forward." |

`community.tags` is **admin-managed, not member-created** (via EPIC-J) — a curated vocabulary. A hybrid taxonomy where either half were freely member-extensible would collapse into pure tagging (Option B), which FD-4 recommends against for MVP. (FD-4 as a formal stakeholder decision is now substantively answered by this; see the open-questions doc §1.2 / Section 4.)

---

## 4. Search

Firmed up (Adrian, 2026-07-17) — this resolves the PRD's "(to be discussed/confirmed)" hedge on Search (Section 6.1), subject to stakeholder sign-off. Search stays **in PostgreSQL** for MVP (per the architecture spec, Section 6), specified properly rather than left as "tsvector and hope."

### Why in-Postgres, not a search engine

- **Third-party managed search (e.g. Algolia) is ruled out on principle**, not just cost: it means shipping forum content — including de-identified case discussions — to an external service, which cuts directly against the platform's trust proposition and the architecture's data-residency stance (`eu-west-2`, nothing sold or leaked). This is a *don't*, not a trade-off.
- **Self-hosted OpenSearch/Elasticsearch is premature**: better relevance out of the box, but a second datastore to run, secure, and keep in sync — real overhead for a small team, at a scale Postgres handles comfortably. It's the right answer *later* (Section 6 upgrade path in the architecture spec), not for MVP.
- **Postgres full-text search is sufficient at this scale, needs no new infrastructure, and stays transactionally consistent** with the content it indexes.

### The design

| Element | Choice | Why |
|---|---|---|
| Index | `tsvector` generated column + **GIN** index, on both `community.posts` and `community.comments` | The base full-text mechanism (architecture spec, Section 6) |
| Field weighting | `setweight` — title = A, body = B, tags/category = C, comment body = D | A title hit outranks a passing mention in a reply |
| Query parser | **`websearch_to_tsquery`** | Familiar search-box syntax (quoted phrases, `-exclude`) without exposing raw tsquery operators to members |
| Typo tolerance | **`pg_trgm`** extension (trigram matching) alongside the tsvector | Handles misspellings and partial matches plain tsvector misses ("achiles" → "achilles"), and powers a "did you mean" |
| Tag/category in query | Tag and category names folded into query construction | Searching "ACL tear" surfaces posts tagged `Anterior cruciate ligament` even when that phrase isn't in the body |
| Ranking | `ts_rank_cd` (relevance) → recency → a small kudos tiebreak | Text relevance leads; recency breaks ties; kudos is a light signal among equally-relevant results (a softening of the earlier "not kudos-weighted at all" position — kudos still doesn't *drive* search rank, it only nudges ties) |

```
GET /v1/search?q=...&category=&tag=&cursor=...
  -> cursor-paginated results across posts (and, transitively, their comments,
     surfaced as "N replies match" rather than as separate top-level results)
  -> ranked as above; a suspended/expelled handle's content and removed posts
     are excluded from results
```

### The clinical synonym dictionary — the domain-specific part

The single most important search-quality feature for this audience, and the reason Postgres FTS is genuinely good enough here: practitioners write "ACL" / "anterior cruciate ligament", "OA" / "osteoarthritis", "physio" / "physiotherapy" interchangeably, and search that doesn't reconcile these feels broken. Postgres supports **synonym and thesaurus dictionaries** configured into the text-search configuration, so those terms match each other.

This depends on the tag vocabulary decision (FD-4, still open — see Section 3 and `docs/2026-07-17-taxonomy-standards-research.md`): the same curated vocabulary that anchors tags can *seed the search synonym dictionary*, and **MeSH ships "entry terms" (synonyms) for every concept**, so if the tag vocabulary is mapped to MeSH (the current recommendation), the synonym list comes largely for free. One piece of curation, two payoffs (tags + search synonyms). Until FD-4 lands, this is a forward dependency, not buildable in isolation — flagged in Section 12.

---

## 5. API endpoints

Consistent with the architecture spec's Section 5.3 principles (versioned `/v1`, cursor pagination, no `identity`-schema leakage — trivially satisfied here since this epic never touches `identity` at all).

```
POST   /v1/posts                        { category_id, type, title, body, tag_ids[] }
GET    /v1/posts?category=&tag=&cursor=
GET    /v1/posts/:post_id
PATCH  /v1/posts/:post_id               -- see Section 6
DELETE /v1/posts/:post_id               -- see Section 6 (soft: status = removed)

POST   /v1/posts/:post_id/comments      { body, parent_comment_id? }
PATCH  /v1/comments/:comment_id
DELETE /v1/comments/:comment_id

GET    /v1/categories
GET    /v1/tags?prefix=                 -- typeahead when composing a post
```

All write endpoints require a handle-scoped session token at `active` status (architecture spec, Section 5.2); a `suspended`/`expelled` handle's token fails on refresh as already specified there, so this epic needs no bespoke status check beyond what already exists.

---

## 6. Edit/delete policy

**Agreed (Adrian, 2026-07-17.)** Not specified in the PRD; this is now a settled decision rather than a proposal:

| Action | Proposed policy | Rationale |
|---|---|---|
| Edit within 15 minutes of posting | Allowed, no visible "edited" marker | Typo-correction window |
| Edit after 15 minutes | Allowed indefinitely, `edited_at` timestamp shown | Balances genuine correction against the integrity of a thread others have already responded to or awarded kudos against |
| Author self-delete (ordinary question/comment) | Allowed — soft delete (`status = removed`) | Same mechanism as moderator removal (EPIC-F), so a deleted post's replies aren't orphaned (Section 2's reasoning) |
| Author self-delete (published case discussion) | **Not allowed** — moderator-only removal once attested | Deleting after attestation would undermine the attestation's purpose: PRD Section 10.3 records it "with timestamp and linked to the member's verified identity" specifically so it persists as a record (EPIC-E) |

---

## 7. Scope of the PRD's three Could-have items

The PRD lists three Could-have (MVP stretch) items. Scope decided by Adrian, 2026-07-17:

| Feature | Decision | Notes |
|---|---|---|
| **Best answer marker** | **In MVP** | See below |
| **Polls** | **In MVP** | See below |
| **Image attachments** | **Deferred — remains a future Could-have** | Held back on **privacy grounds** (Adrian, 2026-07-17): images are the highest-risk vector for inadvertent patient identification (faces, tattoos, scars, embedded EXIF/location, identifiable settings), which is exactly what the platform's no-PHI policy exists to prevent. The EXIF-stripping and content-warning mechanics only mitigate *metadata* — they can't stop a genuinely identifying image being uploaded. Not worth the risk for MVP; revisit post-launch with proper safeguards. **This has a knock-on effect on EPIC-E** (case-discussion checklist items 6/7 assume images exist) — see that spec's Section 4 and the note below. |

### Best answer marker (in MVP)

A nullable `community.posts.accepted_comment_id`, set by the post's **own author** (not moderators, not kudos-driven). Displayed above the kudos-ranked answer list, not replacing it — the Must-have kudos ranking (EPIC-D) and this marker are complementary: kudos is the community's signal, the accepted answer is the asker's own "this solved it."

### Polls (in MVP)

A lightweight, self-contained addition — a `community.polls (post_id, question, options jsonb)` table plus a votes table (`community.poll_votes (poll_id, option_index, handle_id, created_at)`, one vote per handle per poll via a unique constraint, the same one-per-handle pattern as kudos). No interaction with any other epic's data; votes are handle-scoped like everything else in `community`.

### Consequence of deferring images

EPIC-E's de-identification checklist (its Section 4) includes two image-related items (6: no identifying photographs; 7: EXIF review). With image attachments deferred, **those two checklist items have nothing to attach to for MVP** — case discussions are text-only at launch. **This is now reconciled in EPIC-E's spec (its Section 4): the MVP checklist is six items (1–5, 8), with 6/7 restored when images land.**

---

## 8. Personalised feed (Should-have)

PRD Section 6.1: "Home view based on tags and handles followed, with a trending/top view as fallback." This depends entirely on `community.follows` — the unified handle-and-tag follow mechanism EPIC-B's spec now owns (its Section 8, generalised 2026-07-14 from an earlier handle-only design; see `docs/2026-07-14-technical-specs-open-questions.md`, Section 2, for that history). This epic doesn't own or duplicate that table — it's a read-only consumer:

```
GET /v1/feed?cursor=...
  -> posts whose category/tags match the caller's tag-follows (community.follows,
     target_type = tag), or whose author matches the caller's handle-follows
     (target_type = handle), ranked by recency — this is a "what's new from what
     I follow" view, so chronological is the right order (the trending fallback
     below ranks differently, by kudos, since it's answering a different question)
  -> falls back to the trending view (below) when the caller follows nothing yet
     or the followed-content result set is thin — per the PRD's own "fallback"
     language
```

### The trending fallback (agreed, Adrian 2026-07-17)

**Platform-wide, with an adaptive time window.** Scope is platform-wide because the fallback exists precisely for members who haven't expressed a category interest yet (a brand-new member who follows nothing) — anything narrower would leave them with nothing.

The window is **adaptive rather than a fixed 24 hours**, to avoid the cold-start trap: at MVP/seed scale the posting rate may be low (a handful of posts a day, near-zero on a quiet weekend), so a fixed 24-hour window could render an empty or near-empty feed — exactly the wrong first impression on a new member's first visit, which is when this view matters most.

```
Trending fallback algorithm:
  1. Take posts from the last 24 hours, platform-wide.
  2. If that yields fewer than N results (proposed N = 10), widen the window:
     24 hours -> 7 days -> 30 days -> all-time.
  3. Stop at the first window that produces >= N results (or all-time if none do).
  4. Within the chosen window, rank by kudos_total descending, most-recent
     (created_at) breaking ties.
```

This keeps the "of-the-moment" feel of a 24-hour view whenever there's enough activity to fill it, while guaranteeing the fallback is never sparse in the early days. `N = 10` is a proposed threshold, tunable without design change.

No new schema is introduced — `community.follows` (EPIC-B) and `community.posts`/`post_tags` (this epic, Section 2), plus the existing `kudos_total`/`created_at` columns, are sufficient. Note the trending rank *does* use kudos (it's ranking distinct posts by overall community signal), which is a different question from EPIC-D's within-thread answer ranking — the two aren't in tension.

---

## 9. Boundaries with other epics

- **EPIC-B (follows)** owns `community.follows`; this epic reads it (Section 8) filtering both `target_type = tag` and `target_type = handle` for the personalised feed — a read-only consumer, not a second copy of the relationship.
- **EPIC-E (case discussions)** writes `type = case_discussion` posts through this epic's own `POST /v1/posts` path, but only after its own de-identification checklist and attestation gate — EPIC-E's spec should treat this epic's endpoint as the underlying mechanism it wraps, not duplicate it.
- **EPIC-D (kudos)** determines comment *display order* within a thread; this epic's `GET /v1/posts/:post_id` response includes comments in whatever order EPIC-D's ranking specifies, treating it as an injected ordering rather than this epic's own `created_at` ordering.
- **EPIC-F (moderation)** is the only actor that can set `status = removed` on someone else's content, and is what `community.moderation_actions` (architecture spec, Section 4.2) already logs.
- **EPIC-G (notifications)** subscribes to this epic's domain events (new comment, @mention parsed from `body`) — this spec doesn't define the notification payloads, only that the events exist.

---

## 10. Non-functional notes specific to EPIC-C

- **Rate limiting on posting/commenting**: not called out specifically in the architecture spec's Section 5.3 (which names auth and reporting endpoints) — worth extending that Redis-backed rate limiting to posting endpoints too, since a forum is an obvious spam target once real users exist.
- **@mention parsing** must resolve to a `handle_id`, never leak whether a mentioned handle exists if it's `expelled` (mentioning an expelled handle should behave identically to mentioning a nonexistent one, not reveal status).
- **`tsv` generated columns** on both `posts` and `comments` keep search index maintenance in the database rather than the application layer, consistent with the architecture spec's general preference for schema-level guarantees over code discipline (Section 4).

---

## 11. Test plan

- **Category/tag integrity**: a post always has exactly one `category_id` (not nullable); zero-or-more tags.
- **Soft delete**: deleting a post sets `status = removed`, doesn't cascade-delete comments; a `removed` post's comments remain readable in-thread but the post body is replaced with a removal notice. (The exact removal-notice *wording/display* is a visual-design detail — EPIC-F owns the moderation *action* and audit, not UI, which it scopes out in its §1 — so this is settled at the data level here; presentation is finalised in visual design.)
- **Search ranking**: a query matching a tag name surfaces the tagged post even when the exact phrase isn't in the body (Section 4).
- **Edit window**: a comment edited within the proposed 15-minute window shows no `edited_at` marker; after, it does.
- **Case-discussion delete restriction**: an attested case discussion (once EPIC-E exists to create one) cannot be author-deleted, only moderator-removed.
- **Personalised feed composition**: a post tagged with a followed tag, or authored by a followed handle, appears in the feed (Section 8); a post matching neither doesn't; the trending fallback activates when the caller follows nothing.

---

## 12. Open questions

- ~~**Taxonomy unification**~~ (Section 3) — **resolved 2026-07-17** (Andrew's input): the three vocabularies are collapsed into one controlled `community.tags` table (facet + grouping + synonyms + internal MeSH), used by both posts and the news feed; categories are content-type; OSIICS omitted. Closes open-questions §1.2. FD-4's taxonomy substance is answered (the remaining FD-4 formalities are stakeholder sign-off, tracked in the open-questions doc). Full record in `docs/2026-07-17-taxonomy-standards-research.md`.
- ~~**Search's "(to be discussed/confirmed)" hedge**~~ — **resolved 2026-07-17**: search design firmed up (Postgres FTS + `pg_trgm` + weighted `tsvector` + clinical synonym dictionary; no external/third-party engine), Section 4. The former forward dependency is now cleared: the synonym dictionary seeds from `community.tags.synonyms` (§2), which the taxonomy resolution above defines.
- ~~**Edit/delete policy**~~ — **resolved 2026-07-17**: the Section 6 policy (15-minute no-marker edit window, `edited_at` after, soft-delete for ordinary posts, moderator-only removal for attested case discussions) is agreed.
- ~~**Could-have scope confirmation**~~ — **resolved 2026-07-17** (Section 7): best-answer marker and polls are **in MVP**; image attachments are **deferred** on privacy grounds. Follow-up below.
- ~~**EPIC-E image-checklist reconciliation**~~ (from the image deferral, Section 7) — **resolved 2026-07-17**: EPIC-E's spec (its Section 4) now specifies a six-item MVP checklist (items 1–5, 8), with the two image items (6/7) restored when image support lands.
- ~~**"Trending" definition**~~ — **resolved 2026-07-17** (Section 8): platform-wide, adaptive time window (start 24h, widen to 7d/30d/all-time until ≥ N results), ranked by kudos with recency tiebreak. The adaptive window avoids an empty fallback feed at low launch volume.
