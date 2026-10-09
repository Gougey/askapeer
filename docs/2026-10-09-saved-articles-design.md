# Saved articles

**Status**: **Built and live, 9 October 2026.** The five open questions were put to Adrian in turn and answered; Section 11 records the answers and what changed.

⚠️ **Sections 4, 9, 11 and 12 are superseded in part — read the amendment at the end first.** They record a decision to keep the save control off the results card, which held for one afternoon. Using the saved list showed the control had to be *on* the card; it now is (PR #169), and the amendment sets out what that cost and where this document got the cost wrong.
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

**Decided**: the detail screen only, to begin with. The results cards and search results are untouched, which is what makes this safe to put in front of the first fifteen — see Section 12. The card restructure is deferred, not cancelled.

⚠️ **Superseded the same day** — it was deferred by about four hours. See the amendment: a control *under* a card in the saved list cannot say which article it belongs to, which made the restructure the fix for a defect rather than an enhancement to schedule.

## 5. Where you see them

The bottom navigation has five tabs and no room for a sixth; it was deliberately composed (two content tabs, Create in the centre, two personal tabs). A saved list is not a sixth peer of those.

**Decided**: a **Saved** link in the My Research header, beside the title, showing a count **at all times including zero** — `Saved (0)` on a first visit, `Saved (12)` later — leading to `/feed/saved`.

Showing the zero was the deliberate choice over hiding it. The worry was that a zero beside an unused feature reads as an empty promise; the answer is that fifteen strangers have to *discover* this exists, and a count that only appears once you have used it cannot advertise anything. It costs one indexed query per Research render, which is negligible now the database has dedicated cores.

Activity › Following is the precedent for a sub-page hanging off a tab.

**Alternative considered**: hanging it off Profile. Rejected — Profile is about identity and account, and a member looking for an article they saved will look where they found it.

## 6. Articles that change under you

- **Retraction.** Articles carry `retracted_at`. A saved article that is later retracted must **stay in the list and say so**, prominently. Silently dropping it would be the worst option available: a clinician may have saved it precisely because they were citing it. This is the one place the list should shout.
- **Deletion.** Nothing deletes articles today — ingestion only inserts and merges — so the `ON DELETE CASCADE` above should never fire. It is there so that *if* a cleanup is ever written, it cannot leave dangling rows.
- **Merging.** `upsert` merges by DOI/PMID into the existing row rather than replacing it, so ids are stable and a save cannot be orphaned by deduplication.
- ⚠️ **Should a save survive the article? Decided: no — foreign key only, nothing copied.**

A middle option was raised while the question was being put: keep the DOI alone, one text column, so a saved entry still resolves to a real paper on `doi.org` if its row ever vanished, with no title or journal to drift out of step. It was declined in favour of the simpler shape, and the reasoning holds — nothing deletes articles, ingestion only inserts and merges, so the cascade is a backstop rather than a path we expect to take.

**The exposure, stated plainly**: if a cleanup is ever written, it will empty members' lists silently. A DOI column could be added later, but only for saves made after it — the ones already in the table would have nothing to backfill from. That is the cost of this decision and it is accepted knowingly.

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

## 11. The five questions, answered

Put to Adrian in turn on 9 October and settled the same day.

| | Question | Answer |
|---|---|---|
| 1 | Save control on the results card, or the article page only? | **Article page only.** Results and search untouched. ⚠️ *Reversed the same day — see the amendment.* |
| 2 | Snapshot the article into the saved row? | **No.** Foreign key only. |
| 3 | Count in the header? | **Always, including zero.** |
| 4 | Any cap? | **None.** |
| 5 | Ship to the first fifteen, or hold until phase 2? | **Ship to the first fifteen.** |

**Two answers went against what this document first recommended, and both deserve recording:**

⚠️ **Question 2 — I changed my own mind mid-question and was overruled.** Writing out the trade-off persuaded me that keeping the DOI alone was better than nothing; Adrian held to the document's original recommendation. He is right that an unused insurance column is still a column, and the exposure is now written into Section 6 rather than left implicit.

⚠️ **Question 5 — the first answer changed the fifth.** This document recommended building but holding back, on the grounds that a new feature adds a variable to the trial. Once the card restructure was out of scope that argument largely dissolved: the build no longer touches the screen the peers will spend their time in. The recommendation to hold back was really an argument about the card, and it should have said so.

## 12. Build shape and timing

Roughly, in the order that keeps each step shippable:

1. Migration, table, and the three endpoints.
2. The saved-list screen and the header link.
3. The save control on the article detail screen.
4. The card restructure, and the save control in results.

Steps 1–3 are a day's work and are independently useful: a member can save from an article page and see their list. Step 4 is where the real UI cost is.

**Decided: steps 1–3 ship to the first fifteen.** Step 4 waits for real usage to shape it.

⚠️ **Real usage arrived immediately and step 4 shipped the same day.** See the amendment.

What that build touches, and what it does not:

| Touched | Untouched |
|---|---|
| New table, migration, endpoints | Results cards |
| `/feed/saved` — a new screen | Search results |
| `/feed/[articleId]` — one control | The criteria panel |
| My Research header — one link | Ranking, ingestion, the corpus |

⚠️ **The right-hand column is the argument.** The screen the peers will spend their time in — Research results — is not modified at all, so the risk of this landing before the trial is a new screen that nobody has to visit and one control on a page they will mostly reach from a result they already wanted to read.

---

## Amendment, 9 October 2026 — step 4 shipped the same day

Steps 1–3 went live, were used for an afternoon, and step 4 followed immediately. "Real usage to shape it" turned out to be one session with the saved list, and what it said was not a preference but a defect:

> When you view the saved list, the Saved button appears between two articles and it is not obvious whether the button is for the article above or below.
>
> — Adrian, after using it

That is unanswerable. A control placed *between* two cards has no owner, and the layout could not say which article it would unsave. The same change fixes it and delivers what Section 4 wanted all along: the control is now **inside the card, on the top row beside the evidence pill**, so it appears on results, on search results and in the saved list, and a member can save from a list without opening the article at all.

**The card restructure, as built.** Section 4 described the obstacle correctly — the whole card was one `<Link>`, so a nested button was out. The fix is the stretched-link pattern: the anchor now wraps the **title**, and `after:absolute after:inset-0` spreads its hit area over the card. The whole card still opens the article, the anchor has a real accessible name (which an empty overlay anchor would not), and the save button is a sibling with `relative z-10` so it paints above the overlay rather than under it. What it costs is dragging to select the snippet, which the pseudo-element swallows; on a phone a long-press on a link was already the context menu.

⚠️ **Section 9 was wrong about the cost, and the correction matters.** It said the card "means the feed query grows a per-member join, which the feed does not currently have at all". It does not. `saved` is stamped on *after* ranking, by a single primary-key lookup over the twenty ids already in hand (`SavedArticlesService.mark`). Two reasons that is better than the join this document assumed:

- The ranking query is the one that went from 160ms to five seconds in October and had to be rebuilt (migration 0052). It is the last place to add a join for a cosmetic flag.
- `FeedService` takes **no handle at all**. That is what makes "two members asking the same question see the same page" a property of the code rather than a promise, and a per-member join would have quietly ended it.

**Two smaller departures from this document.** Section 10 specified "a bookmark control"; it shipped as a star (`☆` / `★`) with the word beside it. The collision was raised with Adrian — the product's one status colour is **kudos gold, rendered as a star**, so this is two meanings for one shape, even though the save star is accent navy and always carries a label. **Decided 9 October: leave the star for now.** It is a one-line change if the two ever read as the same thing on a device; the mitigations are that the label is always present and that kudos never appears on a research card. And the compact control cannot show its error message: there is no room on a card's top row, so a failure gives the optimistic revert plus a live region, where the article page gets a line of red text.

**The touch target.** The visual is a 24px pill at the scale of the evidence chip; the hit area is taken out to 44×44 with `before:-inset-2.5`, which the style guide asks for explicitly ("even when the visual is smaller", §9). Making the visual 44px was the obvious alternative and costs 24px of height on every card in an infinite list.

| Now touched | Still untouched |
|---|---|
| `ArticleCard` — restructured, used by results, search and the saved list | Ranking, ingestion, the corpus |
| `/research-feed` and `/research-feed/search` — one flag each | The criteria panel |
| `FeedArticle` — gains `saved` | `FeedService`, which still knows nothing about the member |
