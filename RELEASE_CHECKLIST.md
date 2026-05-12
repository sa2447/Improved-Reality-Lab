# Release Checklist

## Build and quality
- [x] npm run test
- [x] npm run lint
- [x] npm run typecheck
- [x] npm run build

## Docker lifecycle
- [x] docker compose down -v
- [x] docker compose up --build -d
- [x] docker compose ps reports healthy db and running app
- [x] docker compose logs app includes migration, seed, and ready messages

## Core API readiness
- [x] compare API supports minimum_wage and custom modes
- [x] chat API supports guest sessions, cache hits, and rate-limit path
- [x] saved comparisons API supports CRUD and ownership checks

## Auth and persistence
- [x] credential registration and sign-in work
- [x] protected profile endpoint rejects unauthenticated requests
- [x] dashboard is server-protected and renders saved snapshots

## Deployment prerequisites
- [ ] set production AUTH_SECRET
- [ ] set production AUTH_URL
- [ ] set production OPENAI_API_KEY if AI provider path is required
- [ ] rotate any previously exposed API keys
