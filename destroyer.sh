#!/usr/bin/env bash
set -euo pipefail

# Complete teardown for this project:
# - Stops/removes compose services
# - Removes project containers, images, volumes, networks
# - Prunes dangling Docker resources
#
# Usage:
#   ./destroyer.sh --yes

PROJECT_NAME="hhourssop"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
PROD_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"

if [[ "${1:-}" != "--yes" ]]; then
  cat <<'EOF'
WARNING: This will DESTROY this app's Docker state:
  - all containers for project hhourssop
  - all images built for this app
  - all project volumes and networks
  - all dangling Docker resources (system-wide)

Run again with:
  ./destroyer.sh --yes
EOF
  exit 1
fi

echo "==> Destroying project: ${PROJECT_NAME}"

if command -v docker compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "ERROR: docker compose/docker-compose not found."
  exit 1
fi

if [[ -f "${PROD_COMPOSE_FILE}" ]]; then
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" -f "${PROD_COMPOSE_FILE}" -p "${PROJECT_NAME}" down --volumes --rmi all --remove-orphans || true
else
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down --volumes --rmi all --remove-orphans || true
fi

echo "==> Removing any remaining project containers"
docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" | xargs -r docker rm -f || true

echo "==> Removing project images by compose label"
docker images -q --filter "label=com.docker.compose.project=${PROJECT_NAME}" | sort -u | xargs -r docker rmi -f || true

echo "==> Removing common local images used by this app"
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
  | awk '/^hhourssop-/ {print $2}' \
  | sort -u \
  | xargs -r docker rmi -f || true

echo "==> Removing project volumes"
docker volume ls -q --filter "label=com.docker.compose.project=${PROJECT_NAME}" | xargs -r docker volume rm -f || true
docker volume ls -q | awk -v p="${PROJECT_NAME}_" 'index($0,p)==1 {print $0}' | xargs -r docker volume rm -f || true

echo "==> Removing project networks"
docker network ls -q --filter "label=com.docker.compose.project=${PROJECT_NAME}" | xargs -r docker network rm || true
docker network ls --format '{{.Name}}' | awk -v p="${PROJECT_NAME}_" 'index($0,p)==1 {print $0}' | xargs -r docker network rm || true

echo "==> Pruning dangling resources (system-wide dangling only)"
docker container prune -f || true
docker image prune -f || true
docker volume prune -f || true
docker network prune -f || true
docker builder prune -af || true

echo "==> Done. Fresh clean slate for ${PROJECT_NAME}."
