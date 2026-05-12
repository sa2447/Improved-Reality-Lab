# Improved Project - Docker-First Decisions

This project is scoped only to improved_midterm/improved_project.
Reference files in improved_midterm/Refs are not runtime dependencies.

## Locked decisions for easiest Docker execution

1. Runtime stack
- Next.js app and PostgreSQL run as Docker Compose services.
- Single command start: docker compose up --build.

2. Auth direction
- Use Auth.js for local-first authentication.
- Avoid external auth dependency for MVP startup.

3. Database direction
- PostgreSQL in Docker with named volume persistence.
- Future schema should be applied automatically on container startup.

4. Data modeling strategy
- Use relational columns for filtering/sorting.
- Use JSONB snapshots for comparison payload details.

5. Chat persistence strategy
- Use chat_sessions and chat_messages tables.
- Support guest to user migration by session_id reassignment.

6. Deterministic calculations
- Version financial datasets in DB and reference dataset_version in saved outputs.

7. Cost controls
- Start with Postgres-backed usage logs and request caps.
- Add response caching keyed by normalized prompt + dataset_version.

## Next implementation milestones

1. Add Prisma and create initial schema.
2. Add migration + seed scripts.
3. Add startup command that runs migrations/seeds before app start.
4. Add Auth.js routes and protected dashboard.
5. Add state comparison API and save endpoints.
