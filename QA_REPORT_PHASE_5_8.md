# QA Report - Phases 5 to 8

Date: 2026-05-11
Scope: improved_midterm/improved_project

## Summary
Phases 5 through 8 completed with successful lint, typecheck, build, and Docker cold-start checks.

## Commands executed
- npm run test
- npm run lint
- npm run typecheck
- npm run build
- docker compose down -v
- docker compose up --build -d
- docker compose ps
- docker compose logs app --tail 50

## API verification highlights
- Compare API:
  - 2-state request returns 2 rows
  - 3-state request returns 3 rows
  - custom hourly wage mode works
  - invalid hours input returns 400
- Chat API:
  - guest sessions persist by sessionId
  - repeated prompt returns cacheHit true
  - unauthenticated migrate endpoint returns 401
- Saved comparisons API:
  - create, list, detail, rename, and delete succeed for owner
  - cross-user access returns 404

## Docker cold-start verification
- Migrations apply on empty volume
- Seed executes successfully
- App reaches ready state at port 3000

## Residual risks
- OpenAI provider path depends on valid OPENAI_API_KEY at runtime.
- next-auth is on beta v5; monitor for upgrade changes.
- PowerShell may prompt on Invoke-WebRequest parsing unless basic parsing flags are used.
