# Improved Project

This app is intentionally scoped only to improved_midterm/improved_project.
Files in improved_midterm/Refs are reference material and are not runtime dependencies.

## Quick Start With Docker

Run from this folder:

```bash
docker compose up --build
```

What starts automatically:

- app service at http://localhost:3000
- postgres service at localhost:5432

No separate manual database start is required. On startup, the app service runs Prisma migrations and seed checks before starting Next.js.

## Local Run

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Environment Setup

Copy .env.example to .env and adjust secrets as needed.

Required variables:

- DATABASE_URL
- AUTH_SECRET
- AUTH_URL

## Core Commands

```bash
# quality
npm run lint
npm run typecheck
npm run build

# docker helpers
npm run docker:up
npm run docker:logs
npm run docker:down

# database
npm run db:migrate
npm run db:seed
npm run db:validate-data
npm run db:import
```

## Operational Notes

- For a clean database reset, run `docker compose down -v` before `docker compose up --build -d`.
- API smoke checks should run against the containerized app on port 3000.
- On Windows PowerShell, `Invoke-WebRequest` may prompt for script parsing; use `-UseBasicParsing` when needed.

## Dataset Import Workflow (Phase 4)

1. Place source JSON files in data/datasets.
2. Validate format:

```bash
npm run db:validate-data
```

3. Import to create a new dataset version and state profiles:

```bash
npm run db:import
```

## Rollback and Reimport Strategy

- Dataset imports are versioned; do not mutate old dataset versions.
- If a bad import occurs, mark the bad version as inactive and import a corrected file as a new version.
- Reproducibility is preserved by storing and referencing dataset_version_id.

## Current Stack

- Next.js 16 (App Router, TypeScript)
- PostgreSQL 16 (Docker service)
- Prisma ORM
- Auth.js credentials auth
- Docker Compose for one-command startup

Protected route enforcement is handled server-side in route/page handlers, which avoids edge runtime constraints with Prisma.

## Important Implementation Notes

- Prisma is on v7 and uses `@prisma/adapter-pg` with `pg` for runtime client initialization.
- `datasource.url` is intentionally not present in `prisma/schema.prisma`; Prisma connection URL is configured via `prisma.config.ts`.
- Docker image generation must run `npx prisma generate` before `npm run build`.
- Auth is pinned to `next-auth@5.0.0-beta.31` for the App Router `src/auth.ts` export pattern.
- Keep route protection server-side for Prisma-backed pages and APIs; avoid edge middleware imports that pull Prisma into edge runtime.
- Never commit real API keys. Keep secrets in local `.env` only.

## Planning Decisions

See ARCHITECTURE_DECISIONS.md for the locked Docker-first implementation choices.

## Known Limitations

- AI route uses OpenAI only when `OPENAI_API_KEY` is set; otherwise it falls back to deterministic local summaries.
- Auth.js uses `next-auth@5` beta APIs; future package upgrades may require minor config changes.
- Dashboard currently provides baseline saved snapshot views and JSON restore context, not advanced chart replay UI.
