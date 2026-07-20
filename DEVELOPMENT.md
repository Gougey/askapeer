# Development

The Askapeer application: a TypeScript monorepo (npm workspaces) — a NestJS API and a Next.js web app, backed by Postgres + Redis. Features land as tracer-bullet slices (see `docs/2026-07-19-tracer-bullet-slice-backlog.md` and GitHub issues); **S0–S2 are in**.

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

## Conventions established at S0

- **Module-per-epic** in the API (`src/<epic>/…`), matching the technical specs.
- **i18n from day one**: every user-facing string is a key in `apps/web/messages/en-GB.json` (never a hardcoded literal). Adding locales later is additive.
- **Themeable UI**: colours are CSS variables (`apps/web/src/app/globals.css`); the style guide, when ready, overrides the tokens — a theming pass, not a rewrite.
