#!/usr/bin/env bash
# Run database migrations. DB must be running (e.g. via docker compose).
# Use this when DB is in Docker - runs migrations inside the API container.
set -e
cd "$(dirname "$0")/.."

echo "Running database migrations..."
docker compose run --rm api pnpm exec prisma migrate deploy
