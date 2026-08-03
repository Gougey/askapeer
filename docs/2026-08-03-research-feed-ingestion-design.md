# S8a — Research feed: ingestion, classification and scoring

**Status**: **Built 2026-08-03**, except where §11 says otherwise. Ingestion, classification, scoring and the unfiltered Feed tab are live; member interests are not. Measured results from the first real run are in `DEVELOPMENT.md` under "Research feed".
**Date**: 3 August 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The ingestion half of S8 (EPIC-I). Everything that happens before a member sees anything: fetching literature, deduplicating it, classifying it against the clinical taxonomy, and scoring it. The feed UI, the interests picker and article detail (screens B1, B2, F5) are **S8b** and are not designed here.

**Companion to**: `docs/superpowers/specs/2026-07-14-epic-i-research-feed-technical-spec.md` and the architecture spec's Section 8, which specify the data model and the pipeline in outline. This document is where that outline meets the corpus we actually have and the taxonomy Andrew actually delivered — and it proposes **two amendments** to the model as specified (Section 10).

---

## Contents

1. [What changes from the prototype](#1-what-changes-from-the-prototype)
2. [The score has to split in two](#2-the-score-has-to-split-in-two)
3. [Building the corpus: what do we even search for?](#3-building-the-corpus-what-do-we-even-search-for)
4. [Source adapters](#4-source-adapters)
5. [Deduplication](#5-deduplication)
6. [Classification](#6-classification)
7. [Evidence type and the intrinsic score](#7-evidence-type-and-the-intrinsic-score)
8. [Scheduling and idempotency](#8-scheduling-and-idempotency)
9. [Failure modes](#9-failure-modes)
10. [Data model — the delta](#10-data-model--the-delta)
11. [Out of scope](#11-out-of-scope)
12. [Decisions needed](#12-decisions-needed)

---

## 1. What changes from the prototype

The prototype in `prototypes/research-feed/` is genuine prior art — the source adapters, the proximity-window classifier and the explanation strings all carry over close to intact. But it is built inside out relative to production, and the inversion is the single biggest thing this slice does.

**The prototype fetches per request, scoped to the member's selected tags.** `GET /api/feed?tags=…` calls Europe PMC and OpenAlex live, with the member's tags *as the query*, then classifies what comes back. That is exactly right for a demo — no storage, no schedule, always fresh — and exactly wrong for production:

- Every feed view is two third-party HTTP calls on the request path, so p95 latency is somebody else's infrastructure. The NFR target is 300ms.
- The corpus is whatever those two calls returned. There is no history, so "articles since you last looked" cannot exist, and neither can saves, dedupe across runs, or retraction flagging.
- Rate limits are hit by *members browsing*, which is the least controllable possible driver.
- 588 tags cannot become 588 queries per member.

**Production ingests a corpus on a schedule that has nothing to do with any member, classifies it once, and matches members to it at read time.** That is what the architecture spec means by "computed once at ingestion time and stored". Section 2 is the part that phrase leaves unresolved.

---

## 2. The score has to split in two

The architecture spec says scoring is "topic match plus evidence-type weighting plus recency, computed once at ingestion time and stored". Two of those three can be precomputed. **Topic match cannot** — it is a function of *this member's* interests, which are not known at ingestion time and change whenever they edit them.

So the score splits, and the split is the load-bearing design decision of this slice:

| | Computed | Depends on | Stored |
|---|---|---|---|
| **Intrinsic score** | Once, at ingestion | Evidence type, recency, open access | `research.articles.intrinsic_score` |
| **Classification** | Once, at ingestion | Article text × the whole taxonomy | `research.article_tags` (new — §10) |
| **Topic match** | Per request | `member_interests` × `article_tags` | Never |

The feed query is then a join, not a computation: take the member's weighted interests, join to the articles carrying those tags, sum the weights, add the stored intrinsic score, order, paginate. That keeps the expensive text work off the request path while leaving the personalised half genuinely personal.

It also means **`research.article_tags` is a table the current spec does not have**, and the feed cannot be built without it. See §10.

A worked ordering, for concreteness:

```
final = Σ(interest.weight × 1.0 for each matched tag)      -- member-relative
      + intrinsic_score                                     -- stored
```

with `intrinsic_score` in roughly 0–2 so that topic match always dominates. **A better-evidenced article about something you do not care about must never outrank a weaker one about something you do** — the prototype gets this right by filtering to `matchedTags.length > 0` before ranking, and that filter is kept: an article matching none of your interests is not shown, however good it is.

---

## 3. Building the corpus: what do we even search for?

The prototype dodges this by using the member's tags as the query. Once ingestion is member-independent, something has to decide what enters the corpus. Three options, and the third is the recommendation:

1. **One query per tag** — 588 queries per source per run. Wasteful, rate-limit hostile, and it re-does at fetch time the classification work that has to happen locally anyway.
2. **Everything recent, classify locally** — unbounded, and the classifier becomes the only thing standing between the feed and all of PubMed.
3. **A small set of broad, domain-bounded corpus queries, then classify locally against all 588 tags.** Ten to twenty queries per source per run, covering sports medicine, physiotherapy, musculoskeletal medicine, rehabilitation and sports injury, plus a journal allowlist for the titles this audience actually reads.

Option 3 gives the classifier a corpus that is already in the right domain, which matters more than it sounds — see the false-positive discussion in §6.

**Field-scope the queries.** Verified against the live API on 3 August 2026: an unscoped Europe PMC search for `"achilles tendinopathy"` returns **4,919** hits, and because `sort=P_PDATE_D desc` discards relevance entirely, the newest of them is a paper on *chikungunya virus differentiation* — it merely mentions the phrase somewhere in its full text. The same query as `TITLE_ABS:"achilles tendinopathy"` returns **1,914** hits and a clean first page. OpenAlex's equivalent is `filter=title_and_abstract.search:`, also verified working.

Sorting by date rather than relevance is right for an incremental ingest — but only once the query itself is scoped, or every run imports the newest irrelevant thing in the index.

The corpus query set is **configuration, not code** (`config.settings`, EPIC-J), so tuning what the feed is *about* does not need a deploy. This is also the natural place for Andrew to have an opinion.

---

## 4. Source adapters

One provider per source implementing the interface the architecture spec already names, matching the `PaymentProvider` and `IdentityCheckProvider` pattern already in the codebase:

```ts
interface ArticleSource {
  readonly name: string;                                  // 'europe-pmc'
  fetchSince(cursor: string | null): Promise<RawArticle[]>;
}
```

**Europe PMC and OpenAlex at MVP**, both free, neither needing a key — the two the prototype already proves. Semantic Scholar and Crossref are adapters someone can add later without touching the pipeline; that is the entire point of the interface.

Verified specifics as of 3 August 2026:

- **Europe PMC** — `resultType=core` returns the abstract, `pubTypeList` (which drives evidence type), `isOpenAccess`, DOI and PMID in one call. No key, no documented hard rate limit; be polite anyway.
- **OpenAlex** — abstracts arrive as an **inverted index** and must be reconstructed (the prototype's `reconstructAbstract` does this and carries over unchanged). Send a `User-Agent` with a contact address to enter the **polite pool**, which is the difference between predictable throughput and being throttled. `primary_location.source.type === 'repository'` and raw types containing *thesis*/*dissertation* are excluded — the prototype learned this the hard way, since OpenAlex's top-level `type` calls these "article".

Both adapters normalise to one `RawArticle` shape. Everything downstream — dedupe, classify, score — is source-agnostic and must stay that way.

---

## 5. Deduplication

The order the architecture spec specifies, applied at upsert: **DOI → PMID → other identifiers → normalised title + year → fuzzy title match**. In practice DOI catches the overwhelming majority, because both sources carry it and both can be normalised to a bare lowercase DOI.

Two rules the prototype already discovered and which are easy to lose:

- **Lowercase the DOI before comparing.** OpenAlex returns it as a `https://doi.org/…` URL, Europe PMC as a bare string, and case varies between them.
- **On collision, prefer the record with an abstract.** Same article, two sources, one of which has no abstract — take the richer one rather than whichever arrived first. Extend this to open-access status and evidence type: merge upward rather than overwrite.

Dedupe runs against the stored corpus, not only within a batch. A daily job will re-see the same article for as long as it stays in the date window, so the upsert has to be genuinely idempotent (§8).

---

## 6. Classification

**Keep the prototype's proximity-window matcher.** A tag matches when all its significant words appear within a small window of each other, in any order, after stemming and stop-word removal. The comment in the prototype explains why, and it was learned from a real failure: exact-phrase matching is too brittle (abstracts say "ACL injuries", not the tag string), while bare co-occurrence anywhere in the document let a **materials-science paper about stress fracture in alloys** match the *Stress fracture* tag.

**The risk is materially larger here than in the prototype**, and this is the main quality question of the slice. The prototype classified against roughly ten hand-picked tags. Production classifies against **588**, many of which are short, common English words in other contexts — *Foot*, *Hip*, *Chest*, *Nerve*, *Bone*. The false-positive surface grows with the taxonomy, not with the corpus.

Three mitigations, in order of how much they buy:

1. **The domain-bounded corpus (§3) does most of the work.** A materials-science paper never enters the corpus in the first place, so the classifier never gets the chance to mis-file it. This is why option 3 beats "everything recent".
2. **Weight by specificity.** A match on *Medial tibial stress syndrome* is worth more than a match on *Lower limb*: the leaf is a claim, the region is a category. Depth in the tag tree is already available and is a reasonable proxy.
3. **Require a title match, or two independent tag matches, for the shallowest tags.** A region matching once in a long abstract is weak evidence; the same tag in the title is not.

**MeSH is not available yet.** `community.tags.mesh_id` exists, and EPIC-I calls it the mechanism by which member interests match MeSH-indexed articles — but it is populated on **0 of 588 tags** (verified 3 August 2026). So MVP classification is rule-based on title and abstract text, exactly as the architecture spec's "Classification (MVP)" already anticipates. MeSH is the precision upgrade, not the starting point, and populating it is a data task (fuzzy-match tag names against the NLM vocabulary, then have Andrew review) rather than a blocker on this slice.

Store the matched tags with a confidence score in `research.article_tags` rather than a bare join row, so that raising the bar later is a query change and not a re-ingest.

---

## 7. Evidence type and the intrinsic score

Evidence type is normalised from the source's publication types into the ladder the design conversation specifies: **systematic review > randomised controlled trial > cohort study > case report > other**. Europe PMC's `pubTypeList` is the better signal; OpenAlex's `type` is coarse and mostly says "article".

The intrinsic score combines evidence weight, recency and open access. The prototype's recency curve — a linear decay of 0.1 per year, floored at zero, so a ten-year-old paper contributes nothing — is a reasonable start and visibly wrong at the edges: a 2015 systematic review is not worthless. Recommend a gentler decay with a floor, tuned once there is a real corpus to look at.

**Every weight in this section belongs in `config.settings`, not in code.** The evidence ladder, the recency half-life, the open-access bonus and the specificity weighting are all things that will be tuned by looking at output, repeatedly, and each tuning cycle should not be a deploy. `SettingsService` already exists and already caches with a 30-second TTL, so this is free.

Recompute the intrinsic score when its inputs change — which for recency means *time itself*, so either recompute on a schedule or express recency relative to `published_date` at query time. **Recommend the latter**: store the stable part (evidence, open access) and apply decay in the query, or the whole corpus silently rots between recomputes.

---

## 8. Scheduling and idempotency

BullMQ repeatable jobs, one per adapter, on the same worker infrastructure as verification and notifications — same `Queue`/`Worker` pattern, same in-process-for-the-prove-phase deployment (`VerificationQueue` is the model to copy, including its `attempts`/backoff defaults).

**Daily is the right cadence to start.** Literature does not move hourly, and the whole value of the schedule is that it is not on anyone's request path. `research.ingestion_cursors` carries `last_run_at` and `last_cursor` per source, so each run asks for what has appeared since the last one.

**Idempotency is the property that matters**, because every retry, every overlapping run and every restart will re-present articles already stored. The upsert keys on the dedupe identity from §5 and merges upward. A run that fails halfway must be safe to run again, which means no "mark processed" step separate from the write.

Do not advance the cursor until the batch is committed. Advancing first means a failure silently drops a window of literature, and nothing downstream would ever notice it was missing.

---

## 9. Failure modes

- **A source is down or rate-limiting.** Fail that adapter, not the run. The prototype already has the shape of this: it degrades to a cached fallback and reports `errors` alongside `mode`. Production equivalent is simpler — the corpus is already stored, so one source failing means one source's worth of new articles is late, and the feed is unaffected.
- **A source changes its response shape.** The adapters are the only place that knows a source's JSON. A contract test per adapter — the architecture spec's NFRs already call for exactly this on pluggable interfaces — is what turns this from a silent empty feed into a failing build.
- **The classifier matches nothing.** A member with interests and an empty feed is indistinguishable from a broken feed. Worth an explicit signal: if a run classifies a suspiciously low proportion of the corpus, that is an alert, not a quiet Tuesday.
- **An article is retracted after ingestion.** Not solved at MVP — Retraction Watch via Crossref is already on the carried-forward list in EPIC-I §7. Worth knowing that the corpus is append-mostly and *will* contain retracted papers until that lands. Given the audience is clinicians, this deserves a decision rather than a shrug (§12).

---

## 10. Data model — the delta

Against `research.articles` / `research.ingestion_cursors` / `community.member_interests` as specified, this slice needs:

**New table — `research.article_tags`** (§2). Without it the topic-match half of the score has nowhere to live, and the feed query would have to re-run the text classifier per request.

```
research.article_tags
  article_id, tag_id, confidence, matched_in ('title' | 'abstract' | 'both'), created_at
  primary key (article_id, tag_id)
  index on (tag_id)                    -- the feed query enters from the member's interests
```

**Amendments to `research.articles`**: add `intrinsic_score` (§2), `url` (the canonical outbound link — B2 needs it and neither source's identifier is a URL by itself), and `retracted_at` as a nullable placeholder so the column exists before Retraction Watch does.

`community.member_interests` is unchanged and stays handle-scoped. Note it is keyed on `tag` in the current spec — that should be a `tag_id` foreign key to `community.tags`, consistent with everything else since the vocabulary reconciliation of 17 July.

---

## 11. Out of scope

**S8b** — the feed endpoint, the article list and detail screens (B1/B2), and the interests picker (F5). This slice ends at a scored, classified corpus in the database, which is exactly the seam to hand over on.

Also out, and already tracked in EPIC-I §7: DOAJ predatory-journal checks, Retraction Watch, PEDro (no confirmed public API — worth an enquiry, not engineering time), and saves/bookmarks (gap G-22, which is a shared posts-and-articles mechanism and does not belong to this slice).

---

## 12. Decisions needed

Three for Adrian, one for Andrew, one legal-shaped:

1. **Corpus scope.** Sports medicine and physiotherapy only, or the wider MSK/rehab literature? This sets the query set in §3 and, more importantly, sets what the feed is *for*. Narrow reads as expert; wide reads as a news feed. FD-1's professional-scope decision leans on the same question.
2. **Retraction handling before or after launch.** The corpus will contain retracted papers until Retraction Watch is integrated. For a clinical audience, showing a retracted trial without a flag is a different class of problem from showing an irrelevant one.
3. **Interests: reuse `community.follows` or keep `member_interests` separate?** EPIC-I §4 explicitly leaves this open. The vocabulary is already shared; the question is whether the *weighted* research interest and the *binary* forum follow stay two mechanisms. Cheaper to answer now than after both have data.
4. **Andrew — the corpus queries and the journal allowlist.** Which journals this audience actually reads is domain knowledge, not a technical decision, and it is the highest-leverage input available to the feed's quality. This is the same shape of ask as the tag synonyms, and can be done in the same sitting.
5. **Abstract-redistribution licensing** (EPIC-I §7, carried forward). This slice *stores* abstracts and S8b *displays* them. Europe PMC and OpenAlex are the comfortable cases, which is why this has not bitten yet — worth confirming before it does.
