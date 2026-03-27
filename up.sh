#!/usr/bin/env bash
# Start stack with warm Docker caches for fast rebuilds.
# Avoid destructive prune during normal startup.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Load env so compose sees .env
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

COMPOSE="docker compose"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

PROD_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
WITH_BUILD="${WITH_BUILD:-0}"

echo "[up] Stop and remove existing stack..."
$COMPOSE $PROD_ARGS down --remove-orphans 2>/dev/null || true

if [ "$WITH_BUILD" = "1" ]; then
  echo "[up] Build (with cache) and start all services (logs stream below)..."
  exec $COMPOSE $PROD_ARGS up --build
else
  echo "[up] Start all services without rebuild (logs stream below)..."
  exec $COMPOSE $PROD_ARGS up
fi
