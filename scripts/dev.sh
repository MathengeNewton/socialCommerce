#!/usr/bin/env bash
# Run everything: install deps, infra, migrations, then bring up all services (api, admin, shop, worker, etc.).
# Uses .env (secrets) + .env.deploy if present (same as finish.sh).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Same compose env as finish.sh
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi
COMPOSE_CMD="docker compose"
[ -f "$ROOT/.env.deploy" ] && COMPOSE_CMD="docker compose --env-file $ROOT/.env.deploy"

echo "[dev] Full setup (install + infra + migrations + all services)..."
echo ""

# One-shot install + generate + infra + migrations
if [ -x "$ROOT/scripts/finish.sh" ]; then
  bash "$ROOT/scripts/finish.sh"
else
  echo "[dev] scripts/finish.sh not found; doing minimal setup..."
  pnpm install
  cd "$ROOT/services/api" && pnpm exec prisma generate && cd "$ROOT"
  $COMPOSE_CMD up -d postgres redis minio
  for i in $(seq 1 30); do
    $COMPOSE_CMD exec -T postgres pg_isready -U postgres 2>/dev/null && break
    [ "$i" -eq 30 ] && { echo "Postgres did not become ready."; exit 1; }
    sleep 1
  done
  $COMPOSE_CMD run --rm api pnpm exec prisma migrate deploy
fi

echo ""
echo "[dev] Building API image (if needed)..."
$COMPOSE_CMD build api

echo "[dev] Starting all services..."
$COMPOSE_CMD up -d "$@"

echo ""
echo "Done. API/Admin/Shop/Worker are up. Check: docker compose ps"
