#!/bin/bash
# One script to do everything: install deps, start infra, run migrations, then start the API.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🚀 Full API start (install + infra + migrations + API)..."
echo ""

# Run finish so we have: pnpm install, prisma generate, docker up (postgres/redis/minio), migrate
if [ -x "scripts/finish.sh" ]; then
    bash scripts/finish.sh
else
    echo "⚠️  scripts/finish.sh not found; doing minimal setup..."
    pnpm install
    cd services/api
    pnpm exec prisma generate
    cd "$ROOT"
fi

echo ""
echo "✅ Starting API server..."
cd "$ROOT/services/api"

# Load env (finish may have set DATABASE_URL via .env already)
if [ -f ".env" ]; then
    set -a
    . .env
    set +a
elif [ -f "$ROOT/.env" ]; then
    set -a
    . "$ROOT/.env"
    set +a
else
    export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5488/social_commerce}"
    export REDIS_URL="${REDIS_URL:-redis://localhost:6380}"
    export S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
    export S3_ACCESS_KEY="${S3_ACCESS_KEY:-minioadmin}"
    export S3_SECRET_KEY="${S3_SECRET_KEY:-minioadmin}"
    export S3_BUCKET="${S3_BUCKET:-media}"
    export JWT_SECRET="${JWT_SECRET:-dev-secret-key-min-32-chars-long}"
    export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-dev-refresh-secret-key-min-32-chars}"
    export PORT="${PORT:-3004}"
fi

echo "📡 API will be at: http://localhost:${PORT:-3004}"
echo ""
pnpm run dev
