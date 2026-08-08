# S15 — Follow a discussion

**Status**: **Built and deployed 2026-08-06** (PRs #104–#107, migrations `0027` + `0028`). Build notes are in `DEVELOPMENT.md`; this document remains the design rationale.
**Date**: 6 August 2026 · **amended 8 August 2026** (handle-following dropped — see the box below)
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: Following a *post* — subscribing to a discussion so that later replies reach you, whether or not you wrote anything in it. Tag-following is **withdrawn** as a concept; Section 2 explains why.

**Companion to**: `docs/superpowers/specs/2026-07-14-epic-b-handles-profile-technical-spec.md` §8, which owns `community.follows`, and EPIC-G §5–6, which owns notification types and channels. This document proposes **one amendment** to EPIC-B §8 (Section 3) and **one new notification type** (Section 5).

> ### Amendment, 8 August 2026 — following a **handle** is not required
>
> Following a review, handle-following is **not required for the time being**. It is deferred, not deleted: the reasoning in Section 2 still holds if it ever returns, and `follow_target_type` keeps its unused `handle` value rather than paying for a migration to remove and later re-add it.
>
> **The consequence is larger than this document.** Two of the three follow targets are now gone — tags to `member_interests` on 6 August, handles today — and *both* were the inputs to EPIC-C §8's personalised Discussions feed. That feature is therefore not deferred but **hollowed out**: it has nothing left to select on. What survives from that section is the **trending view**, which stops being a *fallback* (there is nothing left to fall back from) and becomes simply an alternative ordering, if it is wanted at all. See the S7 entry in the slice backlog.
>
> Following a discussion — everything else in this document — is unaffected and live.

---

## Contents

1. [Why this before the rest of S7](#1-why-this-before-the-rest-of-s7)
2. [Three verbs, not one](#2-three-verbs-not-one)
3. [Data model — the delta](#3-data-model--the-delta)
4. [Who is subscribed, and when](#4-who-is-subscribed-and-when)
5. [A new notification type, not a reuse of `reply`](#5-a-new-notification-type-not-a-reuse-of-reply)
6. [Collapsing, or the inbox floods](#6-collapsing-or-the-inbox-floods)
7. [API surface](#7-api-surface)
8. [Screens](#8-screens)
9. [Anonymity and status constraints](#9-anonymity-and-status-constraints)
10. [Failure modes](#10-failure-modes)
11. [Out of scope](#11-out-of-scope)
12. [Decisions needed](#12-decisions-needed)

---

## 1. Why this before the rest of S7

S7 bundles four things — follows, the personalised feed, trending, and search — on the reasoning that they share a discovery surface. Search shipped on its own on 2026-08-02, which already demonstrated the bundle was separable. This slice takes a second piece out, and it is the piece with the best ratio of member value to build cost.

**There is a hole in the current behaviour, and it is bigger than "I can't follow a thread".** `notifications.service.ts:74-122` resolves exactly one recipient per comment: the parent comment's author for a nested reply, otherwise the post's author. Everything else follows from that single line. So today:

- You read a question, don't reply, and want to know how it turns out. Nothing tells you. You have to remember to come back.
- You *answer* a question, and someone else posts a different answer. **You are told nothing.** Only a direct reply to your own comment reaches you. The member who contributed to a discussion is the last to know it moved on.

The second case is the one worth dwelling on. It is not a missing feature so much as a defect in what "reply" notifications currently mean, and it works against the whole proposition: a network where ideas win on merit needs the people with ideas to still be in the room when the discussion develops.

**It is also the cheapest of the three follow types.** It needs no personalised-feed query, no adaptive trending window, no subtree expansion of the taxonomy. It is a table, a fan-out in one recipient-resolution function, a toggle on the thread, and a list. It reuses the notification pipeline that has been live since S10 — the queue, the worker, the dedupe key, the per-type preference matrix, the email sender, all of it.

Handle-follow, by contrast, delivers nothing at all until the entire personalised Discussions list exists behind it. That is the right order to build them in.

---

## 2. Three verbs, not one

EPIC-B §8 generalised an earlier handle-only design into one `follows` table covering handles *and* tags, on the reasoning that the PRD "already treats following a person and following a topic as one verb applied to two target types". That was a sound reading of the PRD. It is the wrong model for the product that has since been built, for two reasons.

**First, the tag half now has an owner.** `community.member_interests` shipped with S8b: handle-scoped, tag-scoped, weighted, expanded to the subtree at query time, with a picker over the full 588-node taxonomy already built and in front of members. A tag-follow would be a second, binary, parallel answer to a question a member has already been asked — *which parts of the body do I care about* — stored in a second table, edited on a second screen, and guaranteed to drift from the first. It would also mean building the tag picker a third time (composer, interests, follows).

**Second, following a tag and following a post are not the same act.** A tag-follow shapes *what appears in a list*. A post-follow shapes *what pings you*. They have different consumers (a query vs. the notification pipeline), different failure modes, and — as Section 9 of this document argues and the filter discussion behind it showed — different UI consequences.

So the product has three distinct acts, and they should have distinct names:

| Act | Object | Means | Mechanism |
|---|---|---|---|
| **Follow** | a discussion | tell me when there's more | `community.follows`, `target_type = post` — **built** |
| ~~**Follow**~~ | ~~a handle~~ | ~~tell me when they post~~ | **not required** (8 Aug 2026); the enum value survives, unused |
| **Interests** | tags | this is my clinical area | `community.member_interests` (built) |

"Follow" was to carry both a handle and a post because in both cases it means the same thing to a member — *tell me when there's more* — and the object makes the difference obvious in context. Tags never meant that; they mean *this is my area*, which is why they read badly as a follow and read naturally as an interest. **"Tag follow" is retired as a term.**

With handle-following dropped (8 Aug), one target remains — which is why the shipped control reads **"Follow discussion"** rather than a bare "Follow". Naming the object cost two words and stopped the label from having to be renamed if a second target ever arrives.

---

## 3. Data model — the delta

`community.follows` did not exist when this was written — it was specified in EPIC-B §8 and referenced in two schema comments, but no migration created it. This slice created it (migration `0027`), with one amendment to the specified shape.

```
community.follows
  follower_handle_id   uuid  FK -> community.handles (on delete cascade)
  target_type          enum(handle, post)     -- AMENDED: was enum(handle, tag)
  target_id            uuid                   -- a handle_id or a posts.id
  created_at           timestamptz
  primary key (follower_handle_id, target_type, target_id)

  index follows_target_idx on (target_type, target_id)   -- the fan-out read
```

**The amendment**: `target_type` becomes `enum(handle, post)`; tag-following is dropped in favour of `member_interests` (Section 2). Everything else in EPIC-B §8 survives intact — the `target_type`/`target_id` discriminator, EPIC-B's ownership of the write path, other epics as read-only consumers. If anything the table fits its own description better now, since both remaining target types genuinely mean the same thing.

**Only `post` is implemented, and — as of 8 August — only `post` is planned.** The `handle` value shipped in the enum on the reasoning that carrying an unused label costs nothing while adding one later costs a migration. That reasoning now works in the other direction and is why it **stays**: removing it would cost a migration today, and re-adding it another one if the decision is revisited. An unused enum label is the cheapest possible way to hold a door open.

Two consequences of the polymorphic `target_id` worth naming, both shared with `community.kudos` and `community.reports`, which already use this pattern:

- **No foreign key on `target_id`.** A deleted post leaves dangling follow rows. Harmless — every read joins through `posts`, so a dangling row is invisible — but it means a periodic tidy-up, not a cascade, is what keeps the table honest. Not worth building at this size.
- **`follows_target_idx` is the load-bearing index.** The fan-out asks "who follows post X", which is the opposite direction from the primary key. Without it, every reply on every thread scans.

---

## 4. Who is subscribed, and when

**Authoring subscribes you.** Posting a question or writing a comment inserts a follow on that post.

It is worth being precise about what that adds, because the obvious reading — *so that you hear about your own posts* — is wrong. You already do. As the author of a post you are the direct recipient of every top-level answer, and as the author of a comment you are the direct recipient of every reply to it. Both already fire today. The genuine delta is two cases:

| Situation | Today | With auto-follow |
|---|---|---|
| Someone answers your question | `reply` | unchanged |
| Someone replies under *another* answer in your thread | nothing | `thread_activity` |
| Someone replies directly to your answer | `reply` | unchanged |
| Someone posts a *different* answer to the same question | nothing | `thread_activity` |

Only the last of those is a strong motivation on its own, and it is the defect described in Section 1.

**The real work auto-follow does is create the off-switch.** There is currently no way to mute a thread. Your own question gets busy and you receive a notification for every answer, indefinitely, with no control short of turning off `reply` notifications for the whole product. Auto-following on authoring creates the row that an unfollow control deletes — an affordance members do not have today and will want on the first genuinely busy thread.

That only works if unfollow actually silences the thread, which requires the change in Section 5: **the follow row is the subscription record, and `reply` consults it too.** Otherwise a member unfollows a thread, keeps receiving reply notifications from it, and the control is a lie.

**Kudos does not subscribe you.** Awarding kudos is a cheap, one-tap gesture of approval. Treating it as a subscription would sign people up to threads they merely nodded at, and the resulting noise would teach them not to award kudos — which would damage the one signal the platform actually runs on.

**Explicit follow covers the rest**: read it, said nothing, want to know how it turns out.

**Unfollow always wins, until you write again.** An explicit unfollow deletes the row; a subsequent comment by the same member re-follows them. A deliberate and slightly lossy simplification — someone who mutes a thread and then replies to it is re-subscribed — but the alternative is a tombstone that suppresses future auto-follows, which is more state for a case that is rare and self-correcting.

**For existing members this preserves current behaviour rather than changing it.** Backfilling a follow row for every post and comment already authored reproduces exactly what people receive today, then adds the two rows in the table above and — for the first time — a way to turn any of it off. That is a materially easier thing to ship than the behaviour change an earlier draft of this section described.

---

## 5. A new notification type, not a reuse of `reply`

A direct reply is *addressed to you*. Activity on a thread you follow is *ambient*. They warrant different urgency, and the per-type preference matrix (screen F4) already exists to let a member say so. Folding thread activity into `reply` would make that impossible: a member wanting "answers to my question, yes; every message in a busy thread, no" would have no way to express it, and would turn both off.

So: a sixth value on `community.notification_type` — **`thread_activity`** — and a sixth row in the F4 matrix. This costs a migration, which `community.schema.ts:507` explicitly anticipated as the price of adding a type after the fact. It is a small, known cost, paid once.

```ts
export type ThreadActivityPayload = {
  postId: string;
  postTitle: string;
  /** How many unseen replies this row currently stands for (Section 6). */
  count: number;
  /** The most recent replier — attributed in the thread already, so no disclosure. */
  actorHandleName: string;
  /** Guards the collapse against a BullMQ retry double-counting (Section 6). */
  lastCommentId: string;
};
```

The payload obeys the two rules in `notification-payloads.ts`: handle-attributed only, and no quoted text that could reach a lock screen when push is switched on. Note it carries **no snippet**, unlike `ReplyPayload`. A direct reply is addressed to you and previewing it helps you triage; a collapsed count of ambient activity has nothing useful to preview, and leaving the field out keeps de-identified case text out of one more place.

`LIVE_NOTIFICATION_TYPES` gains `thread_activity`, which is what surfaces the toggle on F4.

**One subscription, two types.** The follow row is the thread's subscription record and **both** types honour it — including `reply`, which today consults nothing. Without that, unfollowing a thread would stop the ambient notifications and leave the direct ones arriving, which is not what the word means and not what the control appears to promise.

So, for each new comment:

1. Resolve the direct recipient exactly as today — the parent comment's author, else the post author — and send them `reply`, **if they still follow the post**.
2. Fan out `thread_activity` to every other follower, excluding the actor and the direct recipient.

Step 2's exclusions matter: without them the post author, auto-followed by definition, gets two notifications for every answer to their own question.

The two types then differ only in urgency and in which preference row governs them, over a single subscription a member can revoke in one place. Note what this makes possible that nothing in the product currently offers — muting one noisy thread without muting the category of notification it belongs to.

**A mute is a thread-level silence, and `mention` is what pierces it.** Someone addressing you directly in a thread you have muted will not reach you through `reply`, which is the correct reading of an explicit unfollow but is worth stating rather than discovering. `mention` is already in the notification enum, waiting on EPIC-C's parser; this gives it a second job and makes it load-bearing rather than a nicety. Whoever builds the parser should know that.

---

## 6. Collapsing, or the inbox floods

This is the part that decides whether the feature survives contact with a real thread. `record()` dedupes on `(handle_id, dedupe_key)` with `onConflictDoNothing`, and today's key is `reply:<commentId>` — one row per comment. Applied unchanged to a fan-out, a lively thread puts one notification per reply into every follower's inbox. Follow three of those and the inbox is nothing else. Members would turn it off within a week and never turn it back on.

**One row per followed thread, collapsed while unread.** The dedupe key becomes `thread:<postId>`, and the insert becomes a conditional upsert:

```sql
insert into community.notifications (handle_id, type, payload, dedupe_key)
values (:handleId, 'thread_activity', :payload, 'thread:' || :postId)
on conflict (handle_id, dedupe_key) where dedupe_key is not null
do update set
  payload = jsonb_build_object(
    'postId',          excluded.payload->'postId',
    'postTitle',       excluded.payload->'postTitle',
    'actorHandleName', excluded.payload->'actorHandleName',
    'lastCommentId',   excluded.payload->'lastCommentId',
    -- Reset to 1 once the member has seen the previous batch.
    'count', case when notifications.read_at is null
                  then coalesce((notifications.payload->>'count')::int, 1) + 1
                  else 1 end),
  read_at    = null,
  created_at = now()
where notifications.payload->>'lastCommentId'
      is distinct from excluded.payload->>'lastCommentId'
returning (xmax = 0) as inserted, read_at;
```

Which gives, in order of importance:

- **"3 new replies on *ACL graft choice*"** rather than three rows.
- **It resurfaces.** `read_at = null` and `created_at = now()` push the thread back to the top of the inbox and back into the unread count when it moves again, so a thread you have already read still reaches you on the next reply.
- **The count resets after reading**, because the `case` distinguishes a still-unread row from one already seen. No extra state, no second table, one statement.
- **A BullMQ retry is a no-op.** The trailing `where` clause compares `lastCommentId`, so a replayed job updates nothing and cannot double-count. This preserves the idempotency property the existing dedupe key was built for — the reason `record()` uses `onConflictDoNothing` in the first place.

**Email collapses harder.** An email per reply on a followed thread is worse than an in-app notification per reply, because there is no inbox of ours to absorb it. The `returning` clause above is what makes the rule cheap: **enqueue the email only when the row was inserted, or when the update flipped `read_at` from set to null.** In other words, at most one email per thread per read — activity while you already have an unread notice for that thread adds to the count silently. A member who reads their notifications gets one email per burst; a member who does not read them gets one email, ever, until they do.

---

## 7. API surface

Per EPIC-B §8, with `target_type` narrowed to `post` for this slice:

```
POST   /v1/follows                       { target_type: 'post', target_id }
DELETE /v1/follows/post/:postId
GET    /v1/follows/me?target_type=post   -> the followed-discussions list
```

- `POST` is idempotent (`on conflict do nothing`) — a double tap is not an error.
- `POST` on an unpublished, removed or non-existent post is a 404, resolved through the same visibility rules the thread read uses. Following something you cannot see must not be a way to learn that it exists.
- Self-follow has no meaning for a post (you are auto-followed as the author anyway), so the EPIC-B rejection rule applies to handles only.
- `GET /v1/follows/me?target_type=post` returns **`PostCard[]`**, not bare ids — the pane needs titles, categories, tags and answer counts, and search already established that this DTO is what every list surface renders (`search.service.ts`). Keyset-paginated on the follow's `created_at`, consistent with every other list. **It excludes threads the caller authored a post or comment in** (§8.1) — those belong to My Q&A, and the exclusion belongs here rather than in the client so both stay disjoint by construction.
- **The thread DTO's `viewerContext` gains `isFollowing`**, alongside `isAuthor` and `hasKudosedPost`. EPIC-C §13.1's stated reason for bundling viewer context — every control state in one round-trip rather than N, a deliberate choice for mobile latency — applies exactly.

The write endpoints go behind the existing rate-limit guard. Follow/unfollow is cheap to spam and there is no reason for a member to do it fifty times a minute.

---

## 8. Screens

**C4, the thread.** A follow control in the thread header, below the title with the other post-level affordances. Secondary pill button (`--radius-pill`), line icon plus label, `--color-accent` when active and muted when not. It must **not** use `--color-kudos` in any state: gold is the product's one status colour and this is not kudos.

The icon is a **bell**, matching the Activity tab's, because that is what this control does — route later activity to that tab. Reusing the glyph makes the connection without a word of explanation. Label: `Following` when on, `Follow` when off, with the accessible name carrying the fuller meaning (`Get notified of new replies`) since the visible label has to survive a 390px screen.

Authored threads open already-following, which is correct and also gives the affordance an obvious first meaning: it is how you turn the notifications *off* for your own noisy question.

**Activity gains a fourth pane.** `activity/layout.tsx` already renders a `SegmentedControl` over addressable routes (`/activity`, `/activity/mine`, `/activity/drafts`) — its own comment explains the reasoning: "separate routes rather than one screen with state, so each is addressable, a refresh keeps you where you were, and a notification deep-link can return you to the inbox". `/activity/following` joins them, listing followed discussions as `PostCard`s, newest-followed first. Four labels fit at 390px (checked on device, Adrian, 2026-08-06).

The pane is not decoration: without it a member can only reach a followed thread through a notification, and once that notification is read there is no way to find the thread again or to unfollow it. A subscription you cannot enumerate is a subscription you cannot revoke.

### 8.1 Following and My Q&A must not both list the same thread

Auto-following on authoring means every thread in **My Q&A** is also a followed thread. Listed in both panes, Following fills up with the member's own content — which is the content they least need a watch-list for, since it already has a pane of its own — and the distinction between the two collapses.

The line to draw is **authorship, not subscription**:

| Pane | Contains | Answers |
|---|---|---|
| **Mine** | threads I wrote a question or an answer in | *how did my contributions land?* |
| **Following** | threads I follow but did **not** write in | *what am I watching?* |

So a member's own posts stay in My Q&A and do not appear under Following. The panes stay disjoint, each keeps a single clear question, and Following stays small enough to be worth opening.

Two consequences to accept deliberately:

- **A thread migrates when you join it.** Follow a discussion, then answer it, and it moves from Following to Mine. Defensible — it *is* yours now, and the move happens at a moment the member caused — but it will look like a disappearance to anyone who does not connect the two, so Mine is where the notification deep-link should land after you reply.
- **You unfollow your own thread from the thread, not from a list.** Since your own posts never appear under Following, the mute control for a noisy question of your own lives on C4. My Q&A rows should therefore carry a small muted indicator when the member has unfollowed, or the state is invisible from the only pane that lists the thread.

---

## 9. Anonymity and status constraints

**No watcher counts.** No "12 people are following this" on a thread, no follower counts anywhere, no notification when someone follows you. (This mattered most for handle-follows, now dropped — but it is stated as a standing rule rather than a property of one feature, because the argument is about status signalling, not about which object is followed.) The style guide is unambiguous that kudos-derived standing is the only ranked signal a member may see about another (§1.3), and an attention count is a ranking signal wearing different clothes. It also buys nothing: the member gets no decision from it.

**Nothing new is disclosed.** A follow is a `handle_id`-to-`post_id` row; the payload names the replying handle, who is already publicly attributed in the thread. No path to `identity` is involved, and the existing disclosure guard (`npm run lint:disclosure -w apps/api`) covers the new payload file for free.

**Follows are private to the follower.** No member can see who follows a post, and no admin surface should list it either without a stated reason — it is a low-value read that would create a "who is interested in this case" query nobody has asked for.

---

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Post unpublished, removed, or sent back for correction (S11f) between the reply and the job | The handler returns early, exactly as `handleReplyEvent` does today. A follower is never notified about a thread they can no longer open. |
| Comment deleted between event and job | Same early return on `status !== 'published'`. |
| Comment removed by a moderator *after* the notification | The row survives with a stale count. Consistent with today's `reply` behaviour, which has the same gap; the notification deep-links to the thread, which shows the correct current state. |
| Redis unreachable when the reply is posted | The reply still succeeds and no notification is sent — `enqueue()` swallows deliberately, and its comment explains why: "a missed notification is a smaller loss than a duplicated contribution." |
| A thread with many followers | The fan-out is one insert per follower. At MVP scale this is fine inline in the worker; if a thread ever has hundreds of followers it becomes a batched insert, not an architecture change. |
| Follower suspended or expelled between the follow and the reply | Notification is written but the member cannot sign in to see it. Consistent with the rest of EPIC-G; not worth a special case. |

---

## 11. Out of scope

- ~~**Handle-follows** and the personalised Discussions list~~ — **not required** as of 8 August 2026. The enum keeps its unused `handle` value (§3), but nothing is planned against it, and EPIC-C §8's personalised feed has lost both of its inputs rather than one.
- **The trending view** — still S7, and now the only part of §8 with anything behind it. Note it is no longer a *fallback*: there is nothing left for it to be a fallback from, so if it is built it is a view in its own right, and the adaptive-window design that exists to stop a cold-start feed looking empty applies to it directly.
- **The weekly digest** — EPIC-G, deferred at S10 pending `community.follows`. This slice creates the table the digest was waiting for, but the digest itself needs the tag half of a member's interests (now `member_interests`) and is a separate piece of work.
- **A separate mute-versus-unfollow distinction** — one control, one row. Unfollowing silences the thread completely (Section 5), which is what members mean by muting.
- **`mention`** — the parser is EPIC-C's and unchanged by this slice. But Section 5 gives it a second job: it is the channel that reaches someone in a thread they have muted, which makes it more load-bearing than it looked when it was deferred at S10.
- **Following a category.** Plausible, and cheap once the table exists, but it overlaps with interests and should wait until the interests-versus-discovery boundary has been through the same discussion tags just went through.

---

## 12. Decisions needed

1. ~~**Confirm the EPIC-B §8 amendment**~~ — **settled.** `target_type` is `enum(handle, post)`, tag-following retired to `member_interests`, and as of 8 August the `handle` half is not required either. In practice one live target remains: `post`.

2. ~~**Confirm the backfill in Section 4.**~~ — **done**; it ran on live with 0 posts and 0 commenters left unsubscribed. Auto-following on authoring, with a follow row backfilled for every post and comment already written, keeps existing members' notifications exactly as they are today and adds a mute they have never had. The two new notifications it introduces — sibling answers, and replies under someone else's answer in your own thread — are additive. Worth a conscious yes, but a much smaller ask than an earlier draft of this document implied.

3. **Default channels for `thread_activity`** — *still open.* Shipped as recommended, but not ratified. The recommendation was **in-app on, email on** — but only under Section 6's collapsing rule, which caps it at one email per thread per read. The conservative alternative is email off by default, at the cost of the feature being invisible to anyone who does not go looking in settings.

4. ~~**Slice number.**~~ — **S15.** Filed as S15 because it is a new deliverable rather than a split of S7, and because it is being built ahead of the rest of S7. If it reads better as S7a, that is a naming preference and nothing in this document depends on it.
