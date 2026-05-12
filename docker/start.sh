#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent)..."
npx prisma db seed

echo "Starting app..."
npm run start -- -H 0.0.0.0 -p 3000
