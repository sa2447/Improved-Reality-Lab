# Project Structure

This project uses Next.js App Router with Prisma and Auth.js.

## Core directories
- src/app: routes, pages, and API route handlers
- src/lib: shared server and validation utilities
- prisma: schema, migrations, and seed
- scripts: operational scripts such as dataset validation and import
- data/datasets: curated input datasets for versioned import
- docker: startup script for container runtime orchestration

## Conventions
- Keep API and business logic deterministic and testable.
- Keep all runtime code in improved_midterm/improved_project.
- Keep data imports append-only via dataset versioning.
