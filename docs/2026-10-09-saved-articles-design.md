# Saved articles

**Status**: **Design, for discussion.** Nothing is built.
**Date**: 9 October 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: Letting a member keep a private list of research articles they want to come back to.

**Origin**: Andrew Renshaw, testing the rebuilt Research screen — *"is it possible to add another option once a list has been created to 'email this article to me'? I think if people find articles interesting to them they'd want the ability of saving them."* Andrew has since agreed that **a list inside the app is the better answer**; Section 2 records why.

**Companion to**: EPIC-I (`docs/superpowers/specs/2026-07-14-epic-i-research-feed-technical-spec.md`), which owns the research feed, and EPIC-B §8, which owns `community.follows` — a table this design deliberately does **not** reuse (Section 3).

---

## Contents

1. [Why this matters more than it looks](#1-why-this-matters-more-than-it-looks)
2. [Saving, not emailing](#2-saving-not-emailing)
3. [Data model — a new table, not `follows`](#3-data-model--a-new-table-not-follows)
4. [Where you save from](#4-where-you-save-from)
5. [Where you see them](#5-where-you-see-them)
6. [Articles that change under you](#6-articles-that-change-under-you)
7. [Privacy](#7-privacy)
8. [API surface](#8-api-surface)
9. [Screens](#9-screens)
10. [Deliberately out of scope](#10-deliberately-out-of-scope)
11. [Open questions](#11-open-questions)
12. [Build shape and timing](#12-build-shape-and-timing)

---

## 1. Why this matters more than it looks

My Research used to be a feed. It was rebuilt in October to be a **search screen that shows nothing until you ask it something**, and that change — right in itself — removed the last place where a member's research had any continuity. Every visit starts from a question; nothing persists but the criteria you last typed.

So a saved list is not a convenience feature bolted onto a feed. **It is the only durable personal surface in the research half of the product.** That is the argument for building it properly rather than minimally.

It is also the first feature where a member accumulates something of their own that no one else can see. That makes the privacy section short but load-bearing.

## 2. Saving, not emailing

Andrew asked for "email this article to me". The need is real; email is the wrong mechanism:

- **It is write-only.** You cannot see what you sent yourself, change your mind, or find it again except by searching your inbox.
- **Every click becomes an outbound send.** Sender reputation was at a 9.9% bounce rate on 7 October and had to be repaired; a feature that emails on demand spends that reputation for something the app can do itself.
- **It moves clinical reading onto a personal mail server.** On a platform whose whole proposition is pseudonymity, that is a question worth not opening.

A list in the app is state: visible, reversible, countable, and private. **"Email me my saved list" becomes easy later** if anyone wants it — a single send of many articles, rather than many sends of one. Section 10 keeps it out of this design without ruling it out.

## 3. Data model — a new table, not `follows`

`community.follows` is tempting. It is already polymorphic — `enum(handle, post)` with a `target_id` — and adding `article` looks like a one-line migration.

**It is the wrong table, and the resemblance is superficial.** `follows` means *tell me when this changes*: it feeds `thread_activity` notifications, it is what unfollow mutes, and it drives Activity › Following. Saving an article means *I want to read this again*. It has no notification semantics at all. Overloading one table would mean every existing follow query grows a clause to exclude articles, the Following pane needs filtering, and the two meanings drift apart under the same name.

It also cannot carry a foreign key: `follows.target_id` is a bare uuid precisely because it points at two different tables.

Proposed instead:

```sql
CREATE TABLE "research"."saved_articles" (
  "handle_id"  uuid NOT NULL REFERENCES "community"."handles"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL REFERENCES "research"."articles"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("handle_id", "article_id")
);

-- "What have I saved", newest first — the only query the list screen makes.
CREATE INDEX "saved_articles_mine_idx"
  ON "research"."saved_articles" ("handle_id", "created_at" DESC);
```

Notes on the shape:

- **Keyed by handle, not member.** Everything member-facing in this codebase is handle-scoped; `member_interests` and `feed_preferences` both are. It also means a forced handle rename (moderation) carries the list with it, because the handle row survives.
- **Both foreign keys are real**, which is the main thing `follows` could not give us. Deleting a handle takes its list; deleting an article takes the saves pointing at it. See Section 6 for whether that second cascade is what we want.
- **The primary key is the uniqueness constraint**, so saving twice is idempotent — `ON CONFLICT DO NOTHING` and the API need not care whether it was already saved.
- **No `updated_at`, no soft delete.** Unsaving is a delete. There is nothing to audit here: it is a private bookmark, not a moderation action.

## 4. Where you save from

Two places, and they differ in cost:

**The article detail screen** (`/feed/[articleId]`) is straightforward. There is room, the article is already loaded, and a member deciding "this is worth keeping" has usually opened it.

**The results card** is where the need actually arises — you are scanning twenty results and three look useful — but ⚠️ **the whole card is currently a single `<Link>`**. A save control inside it would be a button nested in an anchor, which is invalid HTML and behaves inconsistently. Doing this properly means restructuring the card so the link covers the text and the control sits beside it, which is a bigger change than it sounds and touches search results too.

**Recommendation**: build the detail screen first and the card second, as two steps. If only one ships before the trial, the detail screen is the safer half.

## 5. Where you see them

The bottom navigation has five tabs and no room for a sixth; it was deliberately composed (two content tabs, Create in the centre, two personal tabs). A saved list is not a sixth peer of those.

**Proposed**: a **Saved** link in the My Research header, beside the title, showing a count — `Saved (12)` — leading to `/feed/saved`.

That puts it where research lives, makes the count a quiet reminder that the list exists, and costs one cheap indexed query per Research render. Activity › Following is the precedent for a sub-page hanging off a tab.

**Alternative considered**: hanging it off Profile. Rejected — Profile is about identity and account, and a member looking for an article they saved will look where they found it.

## 6. Articles that change under you

- **Retraction.** Articles carry `retracted_at`. A saved article that is later retracted must **stay in the list and say so**, prominently. Silently dropping it would be the worst option available: a clinician may have saved it precisely because they were citing it. This is the one place the list should shout.
- **Deletion.** Nothing deletes articles today — ingestion only inserts and merges — so the `ON DELETE CASCADE` above should never fire. It is there so that *if* a cleanup is ever written, it cannot leave dangling rows.
- **Merging.** `upsert` merges by DOI/PMID into the existing row rather than replacing it, so ids are stable and a save cannot be orphaned by deduplication.
- ⚠️ **Should a save survive the article?** The alternative is snapshotting title, journal, DOI and URL into the saved row, so a member's list is independent of our corpus. That is real insurance against a future cleanup, at the cost of denormalised data that can drift from the article it copies. **Recommendation: no snapshot**, on the grounds that articles are never deleted and the cascade is a backstop rather than an expected path — but it is a genuine decision and Section 11 asks it.

## 7. Privacy

A saved list is a window onto what a clinician is reading, which is close to a window onto what they are treating. On a pseudonymous platform that deserves one unambiguous rule:

> **A member's saved articles are visible to that member and to nobody else.** There is no endpoint that returns another handle's list, no count on a public profile, and no aggregate that could be narrowed to one person.

Three consequences:

- Every endpoint derives the handle from the session; none takes a handle as a parameter.
- Saving produces **no notification and no activity entry** — not to the member, not to anyone.
- Moderators have no view of it. Identity access is logged and justified (EPIC-F); a reading list is not evidence of a policy violation and should not become reachable by one.

## 8. API surface

Small, and shaped by the screens rather than by the table:

| | |
|---|---|
| `GET /v1/research-feed/saved` | The member's list, newest saved first, paginated with the same cursor convention as the feed. Returns full article rows, so the list screen can reuse `ArticleCard` unchanged. |
| `PUT /v1/research-feed/saved/:articleId` | Save. Idempotent. |
| `DELETE /v1/research-feed/saved/:articleId` | Unsave. Idempotent. |
| `GET /v1/research-feed/saved/count` | The number for the header. Separate because the header needs it on every Research render and must not pay for a page of articles. |

**Is this one saved?** The list screen knows by construction. The detail screen needs to know for one article — folded into the existing article response as a boolean rather than a second request. The results card needs it for twenty at once, which is one more reason Section 4 puts the card second: it means the feed query grows a per-member join, which the feed does not currently have at all.

## 9. Screens

**`/feed/saved`** — the list. Reuses `ArticleCard`, so it inherits the evidence pill, the open-access marker and the snippet, and stays consistent with results. Newest saved first. Each card carries an unsave control.

**Empty state** — this is the screen that has to teach the feature, because most members will arrive at it before they have saved anything. Something that says what saving is for and points back at Research, rather than "Nothing here".

**Retracted articles** — marked in place, not hidden (Section 6).

**The toggle itself** — a bookmark control with an accessible name that states the action and the current state, announced on change. It must not navigate, and on the card it must not trigger the card's own link.

## 10. Deliberately out of scope

- **Notes or annotations** on a saved article. A different feature with its own moderation questions, and the fastest way to turn a bookmark into a document editor.
- **Folders, tags or collections.** Worth wanting at a few hundred saved articles; nobody will have ten before the trial ends.
- **Sharing a list**, or any view of another member's. Section 7.
- **Email my saved list.** Anticipated, not built — and much more sensible as one email of many articles than Andrew's original one-per-article.
- **Export to a reference manager** (RIS/BibTeX). The obvious next ask from an academic audience, and genuinely easy once the list exists. Not now.

## 11. Open questions

1. **Does the save control ship on the results card, or only on the article page to begin with?** Section 4 — the card is one big link today, and fixing that properly is the larger half of this feature.
2. **Snapshot the article into the saved row, or rely on the corpus?** Section 6. Recommendation is no, but it is the one decision that is expensive to reverse later.
3. **Count in the header, or just a link?** The count is a nudge and costs a query per render; a plain "Saved" link costs nothing.
4. **Is there a cap?** No technical need. A soft limit exists only to stop one member saving 100,000 articles, which no real member will do.
5. **Does this ship before the first fifteen peers, or between phase 1 and phase 2?** Section 12.

## 12. Build shape and timing

Roughly, in the order that keeps each step shippable:

1. Migration, table, and the three endpoints.
2. The saved-list screen and the header link.
3. The save control on the article detail screen.
4. The card restructure, and the save control in results.

Steps 1–3 are a day's work and are independently useful: a member can save from an article page and see their list. Step 4 is where the real UI cost is.

⚠️ **On timing**: Andrew asked for this during the final review before the trial, and said himself it was "not a necessity". The whole value of the first fifteen peers is feedback on what exists; adding a feature in the same week adds a variable to that. **Recommendation: build steps 1–3 now so it is ready, but ship it to the peer group only if the trial start slips** — otherwise it is the first thing to land in the gap between phase 1 and phase 2, when there is real usage to shape step 4 around.
