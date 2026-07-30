# Development

The Askapeer application: a TypeScript monorepo (npm workspaces) — a NestJS API and a Next.js web app, backed by Postgres + Redis. Features land as tracer-bullet slices (see `docs/2026-07-19-tracer-bullet-slice-backlog.md` and GitHub issues); **S0–S5 are in, plus notifications and the Activity tab (S10 — in-app inbox, per-type preferences, own questions and answers), a read-only admin console (S11a) with verification actions, member reporting (S11b — report content or a handle), the moderation queue (S11c — remove content with kudos clawback / warn / dismiss), handle enforcement (S11d — suspend / expel / rename), and the audited reveal-identity action (S11e)**.

**Build approach:** *prove-then-migrate* — develop locally + deploy to Fly.io (London) for the early slices; migrate to AWS `eu-west-2` before real practitioners. See the architecture spec (`docs/superpowers/specs/2026-07-14-askapeer-architecture-design.md`).

## Layout

```
apps/
  api/   NestJS modular monolith (module-per-epic); Drizzle ORM + drizzle-kit; Postgres
  web/   Next.js (App Router); Tailwind v4 (themeable tokens); next-intl (en-GB catalog)
docker-compose.yml   Postgres 16 + Redis 7 for local dev
.env / .env.example  shared config (DATABASE_URL, REDIS_URL, API_PORT, API_ORIGIN)
```

## Prerequisites

- Node.js ≥ 20 (developed on 24)
- Docker + Docker Compose

## First-time setup

```bash
cp .env.example .env        # already present; adjust if needed
npm install                 # installs all workspaces
docker compose up -d        # Postgres + Redis
npm run db:migrate          # apply migrations (creates the config schema + app_meta)
```

## Run

```bash
npm run dev:api             # API  -> http://localhost:4000  (health: /health)
npm run dev:web             # web  -> http://localhost:3000
```

Open http://localhost:3000 — the home page shows live system health fetched from the API (a green tick per check confirms the stack is wired end-to-end).

## Database (Drizzle)

- Schema lives in `apps/api/src/db/schema/` — one file per epic-module, aggregated in `index.ts`.
- After changing the schema: `npm run db:generate` (writes a new SQL migration to `apps/api/drizzle/`), then `npm run db:migrate`.
- Migrations are committed to the repo; `db:migrate` applies any not-yet-applied.

## Useful scripts (from the repo root)

| Command | Does |
|---|---|
| `npm run dev:api` / `dev:web` | run one app in watch mode |
| `npm run build` | build all workspaces |
| `npm run typecheck` | typecheck all workspaces |
| `npm run db:generate` / `db:migrate` | generate / apply migrations |
| `npm run infra:up` / `infra:down` | start / stop Postgres + Redis |
| `npm run tokens:build` / `tokens:check` | regenerate the CSS token layer from `packages/design-tokens` / fail if it drifted |

## Design tokens

`packages/design-tokens` is the source of truth for colour, type **and geometry** values
(spacing, layout, radius, elevation — style guide §4 and §5);
`apps/web/src/app/globals.css` is **generated** from it between `@tokens:start` /
`@tokens:end` markers. Edit the package, run `npm run tokens:build`, commit both — CI runs
`tokens:check` and fails if the CSS was hand-edited instead. See that package's README for
why the values live outside the CSS (short version: CSS does not transfer to a non-CSS
client, and the decisions are worth more than their CSS expression).

Reference every token through `var()` in a style prop — `style={{ borderRadius:
'var(--radius)' }}` — the same way colours already are. Tailwind utilities stay Tailwind's.

### Geometry tokens are not in `@theme`, and three are renamed

Tailwind v4 reads `@theme` namespaces as *utility scales*: `--radius-*` defines what
`rounded-*` means, `--container-*` defines `max-w-*`, `--breakpoint-*` defines responsive
variants. Declaring the style guide's geometry there would rewrite utilities the app
already uses, so it is emitted as a plain `:root` block instead.

**Staying out of `@theme` is not enough on its own** — this is the trap, and it cost a
silent restyle before it was caught. Tailwind compiles `.rounded-lg` to `border-radius:
var(--radius-lg)` and puts its own `--radius-lg` in `:root`; a second `:root` declaration
of that name wins on source order. The first cut of the geometry tokens moved all 44
`rounded-lg` usages from 8px to 20px across screens that had already been demoed. The
collision is by **name**, not by block, so the three names Tailwind claims are renamed:

| Style guide §5.1 | In code |
|---|---|
| `--radius-lg` | `--radius-large` |
| `--radius-md` | `--radius-medium` |
| `--radius-sm` | `--radius-small` |

`--radius-pill`, `--radius`, `--radius-avatar` and `--radius-avatar-lg` keep the guide's
spelling — Tailwind does not claim them. If you add a geometry token, check the compiled
CSS for a second declaration of its name before assuming it is safe.

Two things the guide leaves open and the code decides: **dark-theme shadows are derived**,
not specified (§5.2 gives the direction — "reduce opacity, lean on borders" — but no
values; the light shadows tint toward navy, invisible on a dark ground), and the app-wide
geometry migration is **partial**: the shared shell (app bar, bottom nav, cards, tag
chips, the app column) and the Activity and settings screens are on tokens; the admin
console is deliberately untouched (the guide treats it as a separate, desktop-first
context) and a handful of one-off screens still use Tailwind radius utilities.

### Form controls must be 16px

Every focusable text control renders at `text-base` (16px). This is a **constraint, not a
style choice**: iOS Safari auto-zooms when a focused control is smaller, and the zoom
resizes the visual viewport, so `position: fixed` panels — the tag sheet, the anonymity
gate, the bottom nav — visibly change width the moment the field is tapped. Installed to
the home screen, with no browser chrome to re-anchor against, the whole panel appears to
jump.

It means some inputs read large against small surrounding type (the report box is the
worst offender). That is the trade. The fix is never `maximum-scale=1` in the viewport
meta, which stops the zoom by taking pinch-zoom away from everyone.

`npm run lint:inputs -w apps/web` enforces it and runs in CI. For a genuine exception, add
an `input-zoom-allow` comment on the line.

## Installable web app (PWA)

The app installs to the home screen and runs **standalone** — full screen, no browser
chrome. That is the manifest (`apps/web/src/app/manifest.ts`) plus the icon set, and
nothing else: **there is deliberately no service worker.** Standalone display does not
need one, and a service worker's cache invalidation would fight a daily
cosmetic-iteration loop. Offline, push and the Android install prompt are phase-2
concerns (FD-3).

Things that only bite once installed, all handled and all no-ops in a normal browser tab:

- `viewportFit: 'cover'` in the root layout. It lets the page reach under the notch, and
  it is also the switch that makes `env(safe-area-inset-*)` return anything but zero —
  every safe-area rule in the app is inert without it.
- The `AppBar` pads by the top inset (otherwise the wordmark sits behind the clock) and
  `BottomNav` by the bottom inset (otherwise the tabs sit under the home indicator).
- `start_url` is `/discussions`, not `/`: `requireAppAccess` already routes every session
  state, so a signed-in member launches into the app rather than onto a sign-in screen.

Icons are generated from the brand **mark** (a wordmark is illegible at 192px) and are
committed, so this only runs when the brand artwork changes:

```bash
pip install Pillow && python3 apps/web/scripts/generate-pwa-icons.py
```

> **Known issue — signing in to the installed app on iOS.** An installed iOS web app has
> its own cookie store, separate from Safari. A magic link tapped in Mail opens Safari and
> signs *Safari* in, leaving the installed app signed out, with no address bar to paste the
> link into. Android is unaffected. The 30-day refresh cookie makes this survivable while
> the three of us are testing; a short numeric sign-in code is the fix, and is scheduled
> before phase 2 (see FD-3 in the PRD).

## Verification (S2) — running without Onfido

EPIC-A's pipeline needs two external providers we don't have accounts for yet: a
**professional-register lookup** (HCPC) and an **identity-document check** (Onfido).
Both sit behind interfaces in `apps/api/src/verification/providers/`, with simulated
implementations bound in `verification.module.ts`. Wiring the real services is a change
to those two bindings — the worker, decision logic, state machine and web screens are
already the production path.

Set `VERIFICATION_SIMULATE=true` (in `.env.example`) to activate the simulators. With it
unset, the simulated-callback endpoint returns **404**, exactly as if it were never
deployed — so this must never be `true` in real production.

**Register lookup** is deterministic, driven by the registration number, so every branch
of the EPIC-A §5 decision table is reachable on demand:

| Registration number | Result |
|---|---|
| ends `8` | `fail` — number not on the register → admin review |
| ends `9` | `needs_review` — register unavailable → admin review |
| anything else | `pass` → proceeds to the identity check |

BASRAT and SST always return `needs_review` regardless of the number. That is **not**
simulation — it is the real MVP rule (no public API exists for either body), and it
survives the swap to the real provider.

**Identity check** is driven by a human. On a register `pass` the worker opens a check
session and stops, exactly as it will when waiting on an Onfido webhook. The applicant
lands on `/verify/identity` (screen A4), which renders a stand-in for the Onfido SDK
offering the three outcomes in Onfido's own vocabulary:

- **clear** → auto-approve (`pending → approved_verified`) — the only unattended decision
- **consider** / **fail** → routes to the admin review queue, staying `pending`
- **leave the page** → the delayed timeout job fires and the applicant surfaces as
  `needs_more_info`, rather than being stuck silently in `pending`

The timeout is `verification.onfido_timeout_hours` in `config.app_meta` (EPIC-J config),
defaulting to 48h. To watch it fire without waiting two days:

```sql
insert into config.app_meta (key, value) values ('verification.onfido_timeout_hours', '0.0011')
  on conflict (key) do update set value = excluded.value;   -- ~4 seconds
```

Delete that row to restore the default. From `needs_more_info` the applicant can
restart the pipeline themselves via the holding page's "Try again"
(`POST /v1/auth/verification/resubmit`, gap G-1).

The verification worker (BullMQ) currently runs **in-process** with the API. The
architecture spec's separate background-worker service is a deployment split at the
AWS migrate step, not a code change.

## Forum (S4) — the seeded vocabulary

Categories and the clinical tag vocabulary are **seeded by migration** (`0004`, with the
full taxonomy replacing the placeholder in `0009`/`0010`), not managed in the app:
EPIC-J's admin surfaces for editing them are S13. Both are read through
`GET /v1/categories` and `GET /v1/tags`, and post creation validates against them — tags
are **select-only** (FD-4), so an unknown or retired tag id is a 400 rather than an
invitation to create one.

`GET /v1/tags` returns Andrew's v2.0 taxonomy — **588 nodes, four levels deep**
(region → axis → sub-group → leaf) — flat, one row per node, walked with a recursive CTE
in `vocabulary.service.ts`. Each row carries `parentId` (the composer rebuilds the tree),
`region` (the root it descends from) and `hasChildren`. Two consequences worth knowing:

- **`region` is not decoration.** Tag names are only *sibling-scoped* unique, so 41 names
  recur across branches ("Rheumatoid arthritis" sits under several regions). `region` is
  what tells two identically-named chips apart, in the picker and on a post.
- **Retiring is inherited.** The recursion only descends through non-retired parents, so
  retiring a sub-group hides its whole subtree from the composer — while posts already
  carrying those tags are left exactly as they are.

The composer's picker (`create/TagPicker.tsx`) is a **collapsed block plus a bottom
sheet**: the compose page shows only the chosen chips and an "Add tags" button, and the
sheet holds search and browse. Inline was built first and rejected — it pushed "Post
question" far below the fold. **Any node is taggable**, not just leaves; tapping a node
in browse both selects it and drills into it, and selection **keeps the most specific**
tag (adding a descendant drops an ancestor already chosen). Broadening is the read side's
job: a filter on an ancestor expands to its subtree at query time, so storing both ends
of the same branch would be noise. All 588 nodes ship to the client in one payload
(~110 KB) and search runs locally, which is what makes typing feel instant; EPIC-C §5's
`?prefix=` typeahead only earns its keep if the taxonomy outgrows that.

Two rules worth knowing before extending this epic:

- `POST /v1/posts` hardcodes `type = 'question'` and **rejects** a `type` in the body.
  Case discussions must travel EPIC-E's checklist-and-attestation route (S9), so this
  endpoint can never become a way around that gate.
- `draft` / `needs_correction` posts are returned **only to their author**, and `removed`
  posts to nobody — as **404**, not 403, since "this exists but isn't for you" is itself
  a disclosure (EPIC-C §13.4). Nothing in S4 creates those statuses; the rule lives at
  the read layer so S9 and S11 inherit it rather than re-deriving it.

Answering, kudos and the ranked ordering are **S5** (now in): a thread renders its
answers, members award kudos, and answers sort by that score.

## Notifications and the Activity tab (S10)

Replies, kudos and account-status changes reach members in-app (`/activity`) and by
email. The domain services **announce**; EPIC-G decides who hears about it — `CommentsService`
and `KudosService` enqueue a job carrying ids only, and the worker resolves the recipient
(the parent comment's author for a nested reply, the post author otherwise, never
yourself).

Four rules are worth knowing before extending this epic, because three of them are
enforced by the database rather than by code remembering:

- **`notifications.handle_id` is a foreign key**, and that *is* EPIC-G §4's pre-handle
  asymmetry. An applicant without a handle cannot have a notification row, so the
  `pending` / `needs_more_info` / `rejected` emails have nowhere to write one — and a
  rejected applicant never gets a handle at all. The branch lives in exactly one place,
  `verification/status-change.notifier.ts`.
- **A CHECK constraint rejects `email_enabled = false` for `verification_status_change`**
  (§6.1), on INSERT and UPDATE alike. This is not ceremony: a suspended member is stopped
  at the holding page by the access gate, so the inbox they cannot open is not a channel.
  Email is the only thing that reaches them, which is why it cannot be switched off.
- **`dedupe_key` + `onConflictDoNothing` makes a retried job a no-op.** BullMQ retries;
  without it a handler dying midway writes a second row. Notices key off the id of the
  audit row that caused them, so every one traces back to its `verification_decisions` or
  `moderation_actions` entry. One deliberate side effect: retracting and re-awarding kudos
  does not notify twice.
- **A missing `notification_preferences` row means the defaults apply** — in-app and email
  on, push off — and rows are written only when a member changes something. Seeding a row
  per handle × type would make every new notification type a backfill, and any handle
  created before it ran would silently receive nothing.

**Announcing never fails the action that caused it.** `NotificationEvents` swallows and
logs enqueue failures: the caller has already committed, so throwing would report a 500
for an answer that was genuinely posted, and the client's retry would post it twice.

**Email is still a stub.** `notifications/email.sender.ts` logs what would be sent and is
the single seam a real provider (SES or Postmark) binds to — used by EPIC-A's pre-handle
status email too. The F4 settings screen says so rather than implying mail is going out.
`identity.member_emails` (the email-only view §3 wants `NotificationService`'s grant to
target) lands with the real sender and the per-role split at the AWS migrate step; under
one database role it would name the guarantee without providing it.

Deferred, and why: **`mention`** needs EPIC-C's @mention parser, which does not exist;
the **weekly digest** needs `community.follows` (S7); **push** ships inert (§6.2) — the
`push_enabled` preference is stored and shown greyed, but there is no
`push_subscriptions` table or `/v1/push/*` yet, and no service worker to grant against.
All three exist in the `notification_type` enum so adding them is behaviour, not a
migration.

### Sending real email

Mail goes through one seam — `notifications/email/` — and the provider is chosen by
`EMAIL_PROVIDER`: `log` (the default) writes to the API log and sends nothing; `postmark`
sends for real. SES arrives with the AWS migrate step (architecture spec §6) as one more
class and one more `case`. Callers ask for a **template**, never a body, which is what keeps
three rules in one reviewable file (`templates.ts`) rather than spread across every epic:

- Address by handle, never by name — `legal_name` is not reachable, by way of the
  `identity.member_emails` view.
- **Never quote member-authored content.** A reply's text, and above all a case discussion's,
  does not travel to an inbox that may be read on a lock screen. The email says what
  happened and links back.
- Engagement mail links to notification settings; account mail does not offer, because that
  channel cannot be turned off (EPIC-G §6.1) and an opt-out in the footer would be a lie.

**Sending from `mail.askapeer.co.uk`, a subdomain of Andy's domain.** Postmark needs a DKIM
TXT record and a `pm-bounces` CNAME on it; it does **not** need an SPF record, because its
custom Return-Path is what makes SPF alignment pass. The root domain's own Microsoft 365
mail is therefore untouched, which is the point of using a subdomain.

Two things gate turning `EMAIL_PROVIDER=postmark` on, and getting them the wrong way round
takes sign-in down: the domain must be **verified**, and the Postmark account must be
**approved**. While an account is pending approval Postmark refuses any recipient outside
the From domain, so every send fails — and `POST /v1/auth/request-link` surfaces that as a
503. Until both are done, live stays on `log`.

`AUTH_DEV_MAGIC_LINK=true` is the other half of this. It returns the sign-in token in the
API response, which means **anyone who knows an address can sign in as that member**. It is
tolerable only because this deployment has no real members, and it cannot come out until
email sends. Treat it as the gate on letting anyone else near the platform.

### Bounces, complaints, and rate limits

**`POST /v1/webhooks/postmark`** consumes bounce and spam-complaint events, authenticated by
HTTP Basic against `POSTMARK_WEBHOOK_SECRET` (Postmark's webhook URL field takes
`https://postmark:<secret>@host/...`). With no secret configured it refuses everything
rather than defaulting open. Only **hard** bounces and complaints suppress; a soft bounce is
a full mailbox, and Postmark is already retrying it.

Suppression lands in `identity.email_suppressions`, keyed by **address, not member** — a
bounce is a fact about an address, which may belong to no member or to one who has since
changed it. It is deliberately **not** a notification preference: a CHECK constraint forbids
disabling the account-status email, and more importantly the member has not opted out of
anything. Their address is broken, which is a delivery fact, not a wish.

`EmailSender.deliver` is the choke point that checks it, so a suppressed address gets
nothing **of any kind** — including the mail §6.1 makes non-optional. That is not a
contradiction: §6.1 stops a *member* silencing that channel; it says nothing about an
address that cannot physically receive mail, and sending anyway informs nobody while
teaching the provider that we ignore bounces. ⚠️ **The real gap this leaves**: a member whose
address dies becomes unreachable and cannot sign in, and there is no admin surface showing
suppressed addresses yet. `email_suppressions_active_idx` exists for that read; until it is
built, suppression is logged at warn level so it is at least visible.

**Rate limiting** (architecture spec §5.3, named there and previously unbuilt) is a
Redis-backed guard on `auth/*` and `POST /v1/reports`. Hand-rolled rather than
`@nestjs/throttler` plus a storage adapter — ioredis is already here for BullMQ and the
mechanism is an `INCR` and an `EXPIRE`. Two properties worth knowing:

- **Limits are per dimension, not one number shared across them.** A per-email limit governs
  one mailbox; a per-IP limit governs everyone behind that address — and our members work in
  clinics where a whole building shares one outbound IP. The first cut used a single limit
  and locked out a second member on the same IP.
- **It fails open.** If Redis is unreachable the request is allowed, with a warning: the
  limiter is a mitigation, not an authorisation boundary, and locking every member out of
  sign-in because the cache blinked is the worse outage.

Without this, `register` and `request-link` are a way to send mail to arbitrary strangers,
which is how a sending reputation dies and a Postmark account gets suspended.

### Moderation notices, and what a member may see

Every member-affecting moderation action — `warn`, `remove_content`, `suspend`, `expel`,
`rename_handle` — writes an account-status notification, and the row opens a notice screen
(`/activity/notices/:actionId`) showing the reported content, the category it was reported
under, and the moderator's decision and comment. A warning that says only "your account
status has changed" tells a member they did something wrong but not what.

**None of this is in EPIC-F**, which defines the actions and their immutable audit trail
but never says what the actioned member is told — there is no notice screen or appeal flow
in that spec. Treat this section as the record of that decision.

Three things are withheld from the member, and **`npm run lint:disclosure -w apps/api`
enforces it** (in CI):

| Withheld | Why |
|---|---|
| The reporter's handle | Handing a reported member their reporter's identity invites retaliation, and the reporting flow only has value if it is safe to use. |
| The reporter's free-text comment | It can identify its author by circumstance ("I saw this right after your talk on…") even when it names nobody. The category is the substance without the fingerprint. |
| Which moderator acted | `moderation_actions.moderator_id` is an identity-side member id — a real person, not a handle. |

The guard derives member-facing API files from the `@Controller` route (anything not under
`admin`, plus its one-hop local imports) and scans all of `apps/web/src` except the admin
console, so a new `/me/` surface is covered the day it is written. It strips comments
before scanning — the file that documents this boundary necessarily names the fields it
withholds. The **filing** side is the designed exception: `ReportsService.create` takes the
reporter's own handle from their own token and carries a `disclosure-allow` pragma.

One structural limit worth knowing: a **suspended or expelled** member cannot pass
`AppAccessGuard`, so they cannot open the notice screen at all — their access is precisely
what was withdrawn. That is why EPIC-G §6.1 makes the account-status email non-optional,
and it is the strongest argument for wiring a real email sender: right now that member gets
an in-app notice they cannot reach and a stubbed email that never sends.

One product decision that lives in code: **kudos notifications do not name the giver.**
Nothing else in the product exposes who awarded kudos — the thread DTO carries counts and
your own `hasKudosed` — so naming them in the inbox would introduce a disclosure by way of
an implementation detail, and make reciprocal kudos-trading legible. See
`notifications/notification-payloads.ts`.

## Admin console (S11a)

An allowlisted **admin** role gets a console at `/admin` (web) backed by
`GET/POST /v1/admin/*` (API). Every route sits behind `JwtAuthGuard` + `AdminGuard`,
so the surface is reachable only by an allowlisted admin — see `admin.guard.ts` and the
allowlist in `apps/web/src/lib/admin.ts`.

Two slices landed here:

- **Read-only observability** (`GET`): members (filterable by verification status), a
  single member's verification journey, the manual **review queue**, and the immutable
  **verification audit log**.
- **Verification actions** (`POST /v1/admin/members/:id/verification-decision`): an admin
  clears a `pending`/`needs_more_info` application with **approve** / **reject** /
  **request_more_info**. This is EPIC-A §6 — the *manual* exit the automated pipeline never
  takes (§5's asymmetry means the worker only ever auto-*approves*; a reject is always a
  human's call).

The decision runs through the same `verification.transition()` as a system decision, so it
writes the same immutable `verification_decisions` row and fires the same status-change
email — the only difference is `decided_by` carries the **admin's** member id, not
`'system'`. That structural rule (§3: no status change without a decision row) is enforced
in one transaction, not by convention. The web action then revalidates `/admin`,
`/admin/review` and the member page so the new status and audit entry appear without a
refresh.

## Deployed environments (Fly, prove phase)

Both apps deploy to Fly (London) on merge to `main` via `.github/workflows/deploy.yml`.
The API's `[deploy] release_command` runs migrations before the new release goes live.

**Every environment needs Postgres *and* Redis.** Redis is a hard dependency, not an
optimisation: registration enqueues the verification job (EPIC-A §5) and blocks on it,
so with Redis absent `POST /v1/auth/register` hangs indefinitely. Current staging wiring:

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Fly secret | `askapeer-db` |
| `REDIS_URL` | Fly secret | `askapeer-redis` (Upstash, lhr) — secret, not `fly.toml [env]`, as the URL embeds a password |
| `AUTH_DEV_MAGIC_LINK` | `apps/api/fly.toml [env]` | staging only |
| `VERIFICATION_SIMULATE` | `apps/api/fly.toml [env]` | staging only |
| `ADMIN_EMAILS` | Fly secret | comma-separated allowlist for `/admin`; a **secret, not `[env]`**, because this repo is public and the list is the founders' personal email addresses |

Admin access (S11a) is that allowlist, matched case-insensitively against `members.email`
and resolved **per request**, so adding or removing an admin takes effect without waiting
for a token to expire — but the value is read at construction, so the process must restart
to pick up a change (`flyctl secrets set` restarts the machines for you). There is no UI
for this yet; the moderator/administrator claims and their management surfaces are S11/S13.

The Redis instance is created with **eviction disabled**. BullMQ requires a `noeviction`
policy — under memory pressure an evicting Redis would silently drop queue keys and lose
verification jobs, where a refused write fails loudly instead.

`GET /health` (unprefixed) probes both dependencies and returns **503** if either is
down, so a missing one is visible rather than silent:

```json
{"status":"ok","db":{"reachable":true,"migrationsApplied":true},"redis":{"reachable":true}}
```

## Conventions established at S0

- **Module-per-epic** in the API (`src/<epic>/…`), matching the technical specs.
- **i18n from day one**: every user-facing string is a key in `apps/web/messages/en-GB.json` (never a hardcoded literal). Adding locales later is additive.
- **Themeable UI**: colours are CSS variables (`apps/web/src/app/globals.css`); the style guide, when ready, overrides the tokens — a theming pass, not a rewrite.
