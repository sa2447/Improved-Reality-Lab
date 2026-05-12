# Phase 1-4 QA Handoff

Date: 2026-05-11
Scope checked: improved_midterm/improved_project

## QA result summary
- Phase 1 status: implemented and verified
- Phase 2 status: implemented and verified
- Phase 3 status: implemented and verified
- Phase 4 status: implemented and verified

## Verification commands executed
- npm run lint
- npm run typecheck
- npm run build
- npm run db:validate-data
- npm run db:import

All commands passed.

## Behavior verified
- Docker-first startup path exists and app + db run together.
- Prisma migration and seed run during container startup.
- Schema entities required by phases 1-4 exist.
- Auth registration works and protected profile endpoint returns 401 when unauthenticated.
- Dataset validation and versioned import scripts work.

## Important implementation decisions for phases 5+
1. Prisma runtime model
- Prisma v7 requires adapter-based client initialization.
- App and scripts use @prisma/adapter-pg + pg.
- Do not remove adapter usage in src/lib/db.ts or script clients.

2. Prisma config model
- DATABASE_URL is configured in prisma.config.ts.
- schema.prisma intentionally omits datasource url field due Prisma 7 behavior.

3. Auth model
- next-auth is pinned to v5 beta for src/auth.ts export pattern.
- Avoid downgrading to v4 without refactor.

4. Route protection strategy
- Protected page checks are server-side in page handlers.
- Avoid edge middleware importing Prisma modules.

5. Docker build requirement
- Dockerfile must run prisma generate before next build.

6. Dataset import strategy
- Imports create new dataset_versions and mark prior active versions inactive.
- Keep historical versions immutable for reproducibility.

## Risks for upcoming phases
- Phase 06 (AI): requires real OPENAI_API_KEY at runtime if OpenAI is chosen.
- Cache and usage-event paths must preserve dataset_version_id in keys and payloads.
- Any move to middleware-based auth gating may reintroduce edge runtime Prisma failures.

## Recommended preflight checklist for Phase 05
1. Confirm npm run build passes before adding new APIs.
2. Keep calculation modules independent from provider SDKs.
3. Include dataset_version_id in all comparison responses.

## Recommended preflight checklist for Phase 06
1. Add provider abstraction behind a server-only module.
2. Validate OPENAI_API_KEY presence on startup for AI routes only.
3. Add rate limiting and cache checks before external model calls.
