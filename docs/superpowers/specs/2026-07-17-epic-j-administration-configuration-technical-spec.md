# EPIC-J — Administration & Platform Configuration — Technical Spec

**Status**: Draft — for stakeholder review
**Date**: 17 July 2026
**Author**: Adrian Hall (Technical Lead), drafted with Claude Code
**Scope**: The tenth per-epic technical spec, and a **scope addition beyond the PRD's original eight-epic MVP list** (like EPIC-I). Builds on the architecture spec (`docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md`), particularly Section 5.3 (admin JWT claim) and Section 7.2 (the `/admin/*` panel). Gives a single owner to the platform's **reference-data and settings management** surfaces, which several earlier specs describe as "admin-managed" without specifying the CRUD, audit, or access control for them.

Source of truth: `docs/askapeer-prd-v0.1.md`, Section 4 (personas — the PRD already distinguishes **Administrator** from **Moderator**, which this epic's role model implements).

**Why this is a separate epic, not part of EPIC-F**: EPIC-F is *enforcement* (reports → remove/warn/suspend/expel, audited identity access). This epic is *platform setup* — reference data (categories, tags, blocklist) and settings (tunable thresholds). Different concern, and — per the PRD's own personas — a different role. Folding config into EPIC-F would make it a grab-bag of two unrelated things. Verification review stays in EPIC-A; this epic does not touch it.

---

## Contents

1. [Scope](#1-scope)
2. [Role model — Administrator vs Moderator](#2-role-model--administrator-vs-moderator)
3. [Data model](#3-data-model)
4. [Configuration surfaces](#4-configuration-surfaces)
5. [Audit](#5-audit)
6. [API endpoints](#6-api-endpoints)
7. [Boundaries with other epics](#7-boundaries-with-other-epics)
8. [Non-functional notes specific to EPIC-J](#8-non-functional-notes-specific-to-epic-j)
9. [Test plan](#9-test-plan)
10. [Open questions](#10-open-questions)

---

## 1. Scope

**In scope**: the management (create / edit / reorder / retire) of the platform's admin-controlled reference data and settings, its audit trail, and the Administrator role that gates it. Specifically the surfaces that are currently "homeless" — mentioned as admin-managed in earlier specs but owned by none:

- Forum **categories** (EPIC-C Section 3 — "admin-managed")
- The **tag vocabulary** and, once FD-4 lands, the **search synonym dictionary** (EPIC-C Sections 3–4)
- The **handle-name blocklist** config table (EPIC-B Section 3, 11 — "config table" agreed)
- **Tunable platform settings**: top-contributor badge threshold (EPIC-D Section 6), trending window / result-count N (EPIC-C Section 8), the **billing grace-period days** and **default trial-length days** (EPIC-H Sections 4, 7 — numeric values here, billing semantics stay in EPIC-H; see Section 7), the **Onfido webhook timeout hours** (EPIC-A Section 8, default 48), and similar knobs

**Out of scope** (owned elsewhere):

- **Verification review queue and reapplication-attempts review** — EPIC-A. Identity gatekeeping, already specced there.
- **Moderation enforcement** (reports, remove/warn/suspend/expel/rename, identity reveal) — EPIC-F. Enforcement, not configuration.
- **Member-facing notification preferences** — EPIC-G. Member settings, not platform config.
- **Billing/subscription configuration** (trial-length defaults, cohort/invite codes) — EPIC-H, since those are coupled to the payment provider. This epic's generic settings store *could* hold billing tunables, but EPIC-H owns their semantics — see Section 7.
- **The admin panel's UI/routing** — generically covered in the architecture spec, Section 7.2 (`/admin/*` in the same Next.js app). The UI takes shape in visual design; this spec owns the data model, API, audit, and access control underneath it.

---

## 2. Role model — Administrator vs Moderator

The PRD's personas (Section 4) already distinguish two operator roles, and this epic implements that split:

| Role | Does | Gated surfaces |
|---|---|---|
| **Moderator** | Content/behaviour enforcement, audited identity access | EPIC-F reports & actions; EPIC-A verification review |
| **Administrator** | Platform configuration, operations, compliance | This epic — categories, tags, blocklist, settings |

This **refines the architecture spec's Section 5.3** (confirmed 2026-07-17), which originally assumed a single "moderator-role claim" covers all `/admin/*` endpoints. This epic splits that into two JWT claims — `moderator` and `administrator` — so config mutation and enforcement can carry different privileges.

**At MVP the two roles will very likely collapse to the same people** (verification and moderation are founder-led per PRD Section 8.3, and the founders will also be the ones configuring categories). The point of the split is clean access-control design, not a requirement to staff two teams — a single person can hold both claims. Stated explicitly so nobody over-builds a role/permissions system for MVP: two boolean-ish claims on the JWT is enough; a full RBAC system is not MVP scope.

---

## 3. Data model

Introduces a **new `config` schema** — an **architecture addition, approved 2026-07-17** (the architecture spec, Section 4, defined four schemas: `identity`, `community`, `billing`, `research`; this adds a fifth). Rationale: operational configuration is neither member content (`community`) nor sensitive PII (`identity`), and giving it its own schema makes the Administrator-write / everyone-else-read access grant clean, mirroring how `identity` gets restricted grants. Categories and tags are the exception — they stay in `community` (they're content-organisation structure members interact with directly); this epic provides only the *management* endpoints over them.

```
config.settings                        -- key/value tunable platform settings
  key           text PK               -- e.g. 'badge.top_contributor_percentile',
                                          'feed.trending_min_results', 'feed.trending_window_steps',
                                          'billing.grace_period_days', 'billing.default_trial_days',
                                          'verification.onfido_timeout_hours'
  value         jsonb
  description   text                   -- human-readable, shown in the admin UI
  updated_by    uuid                   -- Administrator's member_id
  updated_at    timestamptz

config.handle_blocklist                -- the EPIC-B blocklist, config-table form
  id            uuid PK
  term          text unique            -- case-insensitive; matched per EPIC-B Section 3
  category      enum(profanity, slur, role_impersonation, profession_specific, other)
  added_by      uuid                   -- Administrator's member_id
  added_at      timestamptz

config.admin_audit_log                 -- immutable: INSERT-only grant
  id            uuid PK
  admin_id      uuid                   -- the acting Administrator's member_id
  action        text                   -- e.g. 'category.create', 'blocklist.add', 'setting.update'
  target        text                   -- the affected entity (category id, term, setting key)
  before        jsonb nullable         -- prior value, for edits/deletes
  after         jsonb nullable         -- new value, for creates/edits
  created_at    timestamptz
```

`config.settings` is deliberately a small key/value store, not a column-per-setting table — new tunables are added as rows without a migration, which suits knobs that are expected to be tuned in operation (badge threshold, trending window) rather than fixed at design time.

Categories and tags are managed in their existing `community` tables (`community.categories`, `community.tags` — EPIC-C Section 2), with a **retire, not hard-delete** rule (Section 4).

---

## 4. Configuration surfaces

Each row is a surface this epic manages, its backing data, and the operations it exposes:

| Surface | Backing table | Owner of the *definition* | Operations this epic adds |
|---|---|---|---|
| Categories | `community.categories` | EPIC-C | Create, edit (name/description), reorder (`sort_order`), **retire** |
| Tag vocabulary | `community.tags` (faceted: `facet`, `parent_id`, `synonyms`, internal `mesh_id`) | EPIC-C | Add (with facet + optional grouping/synonyms), merge (fold one tag's posts into another), **retire**. This is the single maintained table the taxonomy decision (2026-07-17) requires for "additions going forward" — incl. Andrew's forthcoming muscle list |
| Search synonym dictionary | Postgres text-search config + `community.tags.synonyms` | EPIC-C Section 4 | Maintain synonym entries (seeded from `community.tags.synonyms`, e.g. ACL ⇄ anterior cruciate ligament, and the internal tag→MeSH mapping — see `docs/2026-07-17-taxonomy-standards-research.md`) |
| Handle blocklist | `config.handle_blocklist` | This epic | Add / remove terms, categorised |
| Platform settings | `config.settings` | This epic | Edit values (badge threshold, trending window/N, …) |

**Retire, not hard-delete** (categories and tags): a category or tag that existing posts reference cannot be hard-deleted without orphaning or rewriting content. Retiring instead hides it from the new-post composer (so no *new* posts use it) while leaving existing posts and their filtering intact — the same "content is an archive, don't break it" principle EPIC-B applied to expelled handles and EPIC-C applied to removed posts. Implemented as a `retired_at timestamptz nullable` column on `community.categories` / `community.tags` (a small addition to EPIC-C's tables — flagged in Section 7).

**Tag merge** exists because even a curated vocabulary accumulates near-duplicates over time (`acl` / `acl-tear` / `anterior-cruciate-ligament`) — from seed-data imports, or as Andrew and admins add terms independently. (Tags are admin-managed, not free member tagging — see EPIC-C §3 — so this is less frequent than under open tagging, but still needed.) Merge repoints the losing tag's `post_tags` rows to the winning tag and retires the loser — an Administrator cleanup action, audited like any other.

---

## 5. Audit

Every mutation through this epic writes a `config.admin_audit_log` row (immutable, INSERT-only grant — the same enforcement as `identity.verification_decisions` and `community.moderation_actions`). Changing the category list, editing the blocklist, or moving a threshold are all platform-wide privileged actions: less sensitive than identity access, but exactly the kind of change where "who changed this, when, from what to what" needs to be answerable — both for operational debugging ("why did every post lose a tag last Tuesday?") and for the trust/compliance posture the platform trades on.

This is a *config* audit trail, distinct from the identity-access log (EPIC-A/architecture Section 4.4) and the moderation-actions log (EPIC-F). It records no member PII — only which Administrator changed which setting.

---

## 6. API endpoints

All require an `administrator` JWT claim (Section 2). Consistent with the architecture spec's Section 5.3 principles (versioned `/v1`, no `identity` leakage — this epic touches no member PII at all).

```
--- categories (community.categories) ---
POST   /v1/admin/categories            { name, description, sort_order }
PATCH  /v1/admin/categories/:id        { name?, description?, sort_order? }
POST   /v1/admin/categories/:id/retire

--- tags (community.tags) ---
POST   /v1/admin/tags                  { name }
POST   /v1/admin/tags/:id/retire
POST   /v1/admin/tags/:id/merge        { into_tag_id }

--- handle blocklist (config.handle_blocklist) ---
GET    /v1/admin/blocklist
POST   /v1/admin/blocklist             { term, category }
DELETE /v1/admin/blocklist/:id

--- platform settings (config.settings) ---
GET    /v1/admin/settings
PATCH  /v1/admin/settings/:key         { value }

--- audit ---
GET    /v1/admin/config-audit?cursor=...   -- read the config.admin_audit_log
```

Synonym-dictionary endpoints are deferred until FD-4 closes and the tag vocabulary exists to seed from (Section 4).

Every mutating call writes a `config.admin_audit_log` row in the same transaction as the change.

---

## 7. Boundaries with other epics

- **EPIC-C (categories, tags)** owns the *table definitions*; this epic owns the *management endpoints* over them. The `retired_at` column this epic's retire operation needs is **now present on both `community.categories` and `community.tags`** in EPIC-C's spec (its §2) — reconciled 2026-07-17.
- **EPIC-B (handle blocklist)** agreed the blocklist lives in a config table (its Section 3, 11); this epic is where that table (`config.handle_blocklist`) and its management actually live. EPIC-B's creation-time validation *reads* it; this epic *writes* it.
- **EPIC-D (badge threshold)** and **EPIC-C (trending window/N)** define tunable knobs; their values live in `config.settings` and are edited here. The consuming epics read the setting; this epic owns editing it.
- **EPIC-F (moderation)** is the sibling operator surface — enforcement, under the `moderator` claim — distinct from this epic's configuration surface under the `administrator` claim. The two share the physical `/admin` panel (architecture Section 7.2) but not their role claims or their concerns.
- **EPIC-A (verification review)** is explicitly *not* here — it stays under EPIC-A, gated by its own admin access, per that spec.
- **EPIC-H (billing config)** — **boundary resolved 2026-07-17**: the *numeric tunables* live in `config.settings` and are edited here (`billing.grace_period_days`, default 7; `billing.default_trial_days`) — the grace period was explicitly designated a settings-store value (Adrian) — while EPIC-H owns the *semantics* (when they apply, how a cohort override resolves, any provider interaction) and any cohort/invite-code mechanism (not built for MVP; depends on FD-6). So the split is: numeric values here, billing logic in EPIC-H. See EPIC-H Sections 4 and 7.

---

## 8. Non-functional notes specific to EPIC-J

- **No `identity`-schema access**: this epic touches no member PII — it operates on `config` and (for category/tag management) `community`. The only member reference it stores is `updated_by`/`admin_id`, which is the acting *Administrator's* own `member_id` in an audit context, not another member's identity behind a handle.
- **Settings read path**: consuming epics (badge, trending) read `config.settings` frequently; cache it in Redis (or in-process with a short TTL) rather than hitting Postgres per request — these values change rarely. A settings change should invalidate the cache so it takes effect promptly.
- **Blocklist read path**: EPIC-B reads `config.handle_blocklist` at handle-creation time (low frequency), so no special caching is needed there beyond ordinary query performance.
- **Config-audit immutability**: `config.admin_audit_log` gets the same INSERT-only database-role grant as the platform's other audit logs.

---

## 9. Test plan

- **Role gating**: an `administrator`-claim token can call these endpoints; a `moderator`-only token cannot (and vice-versa for EPIC-F's enforcement endpoints) — confirms the Section 2 split is enforced, not just declared.
- **Retire, not delete**: retiring a category/tag hides it from the new-post composer but leaves existing posts and their tag associations intact and still filterable.
- **Tag merge**: merging tag B into tag A repoints B's `post_tags` to A, retires B, and no post loses its association.
- **Audit completeness**: every mutating endpoint writes exactly one `config.admin_audit_log` row with correct `before`/`after`; the log is INSERT-only (no update/delete grant).
- **Settings round-trip**: editing a setting (e.g. the trending window) changes the value read by the consuming epic within the cache TTL / after invalidation.
- **Blocklist integration**: a term added here is rejected by EPIC-B's handle-creation validation on the next attempt.

---

## 10. Open questions

- ~~**PRD update**~~ — **actioned 2026-07-17**: EPIC-I and EPIC-J are now added to the PRD's §6.1 MoSCoW (Must-have) list and the Phase-1 epic table, marked as agreed post-v0.1 scope additions. (Draft for the founders' review; Paul and Andrew to confirm formally.)
- ~~**New `config` schema**~~ (Section 3) — **approved 2026-07-17**: the fifth schema goes ahead (clean Administrator-write access boundary), amending the architecture spec's four-schema model. Config tables are *not* folded into `community`.
- ~~**Administrator/Moderator role split**~~ (Section 2) — **confirmed 2026-07-17**: the single "moderator-role claim" (architecture §5.3) splits into `moderator` (enforcement) and `administrator` (configuration) claims. A single person can hold both at MVP; the split is for clean access-control design, not two teams.
- ~~**Billing config boundary**~~ (Section 7) — **resolved 2026-07-17**: numeric billing tunables (`billing.grace_period_days`, `billing.default_trial_days`) live in this epic's `config.settings` and are Administrator-editable; EPIC-H owns their semantics and any provider/cohort mechanism. Settled by Adrian's call that the grace period is a settings-store value.
- ~~**Whether MVP needs all of this**~~ — **resolved 2026-07-17**: **all of EPIC-J is in MVP** (Adrian's call) — category management, handle blocklist, platform settings, tag-vocabulary seeding **and** tag-merge **and** the synonym dictionary. Nothing deferred within the epic; the admin tooling ships complete for launch.
