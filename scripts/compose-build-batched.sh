#!/usr/bin/env bash
# Build only services that declare `build:` in compose, N at a time (default N=2).
# Reduces parallel BuildKit load on small VPS disks.
#
# Env:
#   ROOT / COMPOSE / PROD_ARGS — same as up.sh
#   BUILD_BATCH_SIZE — default 2
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
cd "$ROOT"
COMPOSE="${COMPOSE:-docker compose}"
_DEFAULT_PROD_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
PROD_ARGS="${PROD_ARGS:-$_DEFAULT_PROD_ARGS}"
BATCH_SIZE="${BUILD_BATCH_SIZE:-2}"

if ! [[ "$BATCH_SIZE" =~ ^[1-9][0-9]*$ ]]; then
  echo "BUILD_BATCH_SIZE must be a positive integer" >&2
  exit 1
fi

mapfile -t SERVICES < <(
  $COMPOSE $PROD_ARGS config --format json 2>/dev/null | python3 -c "
import json, sys
try:
    c = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
services = c.get('services') or {}
# Backend / worker first, then Next apps (lighter parallel load story on small disks)
priority = ['api', 'worker', 'shop_web', 'admin_web']
out = []
for name in priority:
    svc = services.get(name)
    if svc and svc.get('build'):
        out.append(name)
for name, svc in services.items():
    if svc and svc.get('build') and name not in out:
        out.append(name)
for name in out:
    print(name)
"
)

if [ "${#SERVICES[@]}" -eq 0 ]; then
  echo "[compose-build-batched] No services with build: in compose; nothing to do."
  exit 0
fi

echo "[compose-build-batched] Services to build (${#SERVICES[@]}): ${SERVICES[*]}"
echo "[compose-build-batched] Batch size: $BATCH_SIZE"

i=0
while [ "$i" -lt "${#SERVICES[@]}" ]; do
  batch=()
  j=0
  while [ "$j" -lt "$BATCH_SIZE" ] && [ $((i + j)) -lt "${#SERVICES[@]}" ]; do
    batch+=("${SERVICES[$((i + j))]}")
    j=$((j + 1))
  done
  echo "[compose-build-batched] Building: ${batch[*]}"
  $COMPOSE $PROD_ARGS build "${batch[@]}"
  i=$((i + j))
done

echo "[compose-build-batched] Done."
