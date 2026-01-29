#!/usr/bin/env bash
# Run everything on localhost. Uses .env (secrets) + defaults in docker-compose.
set -e
cd "$(dirname "$0")/.."
docker compose up -d "$@"
