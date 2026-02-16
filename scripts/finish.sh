#!/usr/bin/env bash
# One-shot infra finish: install deps, Prisma generate, start DB (if Docker), run migrations, optional seed.
# Usage: ./scripts/finish.sh [--no-docker] [--seed]
#   --no-docker  skip starting postgres/redis/minio (use existing DATABASE_URL)
#   --seed       run API seed after migrations (default: no)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_DOCKER=""
DO_SEED=""
for arg in "$@"; do
  case "$arg" in
    --no-docker) NO_DOCKER=1 ;;
    --seed)      DO_SEED=1 ;;
  esac
done

echo "[finish] Installing dependencies..."
if ! pnpm install; then
  echo ""
  echo "[finish] Install failed (often EACCES on node_modules). Fix ownership then retry:"
  echo "  sudo bash scripts/fix-permissions.sh"
  echo "  pnpm run finish   # or ./scripts/dev.sh"
  echo ""
  exit 1
fi

echo "[finish] Generating Prisma client..."
cd "$ROOT/services/api"
pnpm exec prisma generate
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi

if [ -n "$NO_DOCKER" ]; then
  echo "[finish] Skipping Docker (using existing DATABASE_URL)."
else
  COMPOSE_CMD="docker compose"
  [ -f "$ROOT/.env.deploy" ] && COMPOSE_CMD="docker compose --env-file $ROOT/.env.deploy"

  echo "[finish] Starting infrastructure (postgres, redis, minio)..."
  $COMPOSE_CMD up -d postgres redis minio 2>/dev/null || true

  echo "[finish] Waiting for postgres..."
  for i in $(seq 1 30); do
    if $COMPOSE_CMD exec -T postgres pg_isready -U postgres 2>/dev/null; then
      break
    fi
    [ "$i" -eq 30 ] && { echo "Postgres did not become ready."; exit 1; }
    sleep 1
  done

  # Ensure DB exists (local dev)
  $COMPOSE_CMD exec -T postgres psql -U postgres -c "CREATE DATABASE social_commerce;" 2>/dev/null || true
fi

# Migrate (needs DATABASE_URL for local; in Docker we run inside api container below)
if [ -z "$NO_DOCKER" ]; then
  echo "[finish] Running database migrations (via API container)..."
  $COMPOSE_CMD run --rm api pnpm exec prisma migrate deploy
  [ -n "$DO_SEED" ] && { echo "[finish] Seeding..."; $COMPOSE_CMD run --rm api pnpm run seed; }
else
  if [ -z "$DATABASE_URL" ]; then
    echo "[finish] DATABASE_URL not set; skipping migrations. Set it and run: cd services/api && pnpm exec prisma migrate deploy"
  else
    echo "[finish] Running database migrations (local)..."
    cd "$ROOT/services/api"
    pnpm exec prisma migrate deploy
    cd "$ROOT"
    [ -n "$DO_SEED" ] && { echo "[finish] Seeding..."; cd "$ROOT/services/api" && pnpm run seed && cd "$ROOT"; }
  fi
fi

echo "[finish] Done. Start apps with: pnpm dev   (or docker compose up -d for full stack)"
