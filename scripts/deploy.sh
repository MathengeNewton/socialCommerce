#!/usr/bin/env bash
# Run for production (hhourssop.co.ke). Loads .env (secrets) then .env.deploy (URLs).
# On the server: create .env from .env.example with real values; .env.deploy is in git.
# Starts infra, runs migrations, then brings up all services.
set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck source=../.env
  . ./.env
  set +a
fi

COMPOSE_CMD="docker compose --env-file .env.deploy"

echo "Starting infrastructure (postgres, redis, minio)..."
$COMPOSE_CMD up -d --build postgres redis minio "$@"

echo "Waiting for postgres to be ready..."
for i in {1..30}; do
  if $COMPOSE_CMD exec -T postgres pg_isready -U postgres 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "Building API image..."
$COMPOSE_CMD build api

echo "Running database migrations..."
$COMPOSE_CMD run --rm api pnpm exec prisma migrate deploy

echo "Seeding database (admin user, demo data)..."
$COMPOSE_CMD run --rm api pnpm run seed

echo "Starting all services..."
$COMPOSE_CMD up -d --build "$@"
