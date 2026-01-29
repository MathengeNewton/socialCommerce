#!/usr/bin/env bash
# Run for production (hhourssop.co.ke). Loads .env (secrets) then .env.deploy (URLs).
# On the server: create .env from .env.example with real values; .env.deploy is in git.
set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck source=../.env
  . ./.env
  set +a
fi
docker compose --env-file .env.deploy up -d --build "$@"
