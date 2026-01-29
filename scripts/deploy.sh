#!/usr/bin/env bash
# Run for production (hhourssop.co.ke). Load .env.deploy for domain URLs.
# Ensure .env has real secrets; DNS and reverse proxy must point api/admin/shop subdomains here.
set -e
cd "$(dirname "$0")/.."
docker compose --env-file .env.deploy up -d --build "$@"
