# Development

The Askapeer application: a TypeScript monorepo (npm workspaces) — a NestJS API and a Next.js web app, backed by Postgres + Redis. This is the **S0 walking skeleton**; features land as tracer-bullet slices (see `docs/2026-07-19-tracer-bullet-slice-backlog.md` and GitHub issues).

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

## Conventions established at S0

- **Module-per-epic** in the API (`src/<epic>/…`), matching the technical specs.
- **i18n from day one**: every user-facing string is a key in `apps/web/messages/en-GB.json` (never a hardcoded literal). Adding locales later is additive.
- **Themeable UI**: colours are CSS variables (`apps/web/src/app/globals.css`); the style guide, when ready, overrides the tokens — a theming pass, not a rewrite.
