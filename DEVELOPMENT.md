# Development

The Askapeer application: a TypeScript monorepo (npm workspaces) — a NestJS API and a Next.js web app, backed by Postgres + Redis. Features land as tracer-bullet slices (see `docs/2026-07-19-tracer-bullet-slice-backlog.md` and GitHub issues); **S0–S5 are in, plus a read-only admin console (S11a) with verification actions**.

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

Categories and the clinical tag vocabulary are **seeded by migration** (`0004`), not
managed in the app: EPIC-J's admin surfaces for editing them are S13. Both are read
through `GET /v1/categories` and `GET /v1/tags`, and post creation validates against
them — tags are **select-only** (FD-4), so an unknown or retired tag id is a 400 rather
than an invitation to create one. Andrew's fuller muscle list extends the same table
when it arrives; that is rows, not a migration.

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
