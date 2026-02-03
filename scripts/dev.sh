#!/usr/bin/env bash
# Run everything on localhost. Uses .env (secrets) + defaults in docker-compose.
# Starts infra first, runs migrations, then brings up all services.
set -e
cd "$(dirname "$0")/.."

echo "Starting infrastructure (postgres, redis, minio)..."
docker compose up -d postgres redis minio "$@"

echo "Waiting for postgres to be ready..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "Building API image (if needed)..."
docker compose build api

echo "Running database migrations..."
docker compose run --rm api pnpm exec prisma migrate deploy

echo "Starting all services..."
docker compose up -d "$@"
