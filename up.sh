#!/usr/bin/env bash
# Start the full stack in Docker only (nothing required on host except Docker).
# Prunes dangling resources, tears down existing stack, then builds and runs with streaming logs.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Load env so compose sees .env
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

COMPOSE="docker compose"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "[up] Garbage collect: prune stopped containers, unused networks, dangling images..."
docker system prune -f
docker network prune -f 2>/dev/null || true

echo "[up] Stop and remove existing stack..."
$COMPOSE down --remove-orphans 2>/dev/null || true

echo "[up] Build and start all services (logs stream below)..."
exec $COMPOSE up --build
