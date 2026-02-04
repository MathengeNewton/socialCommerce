#!/bin/bash
set -e

echo "🚀 Starting API Server..."

cd services/api

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install || echo "⚠️  Installation failed - check network connection"
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found, using defaults (DB in Docker uses port 5488)"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5488/social_commerce"
    export REDIS_URL="redis://localhost:6379"
    export S3_ENDPOINT="http://localhost:9000"
    export S3_ACCESS_KEY="minioadmin"
    export S3_SECRET_KEY="minioadmin"
    export S3_BUCKET="media"
    export JWT_SECRET="dev-secret-key-min-32-chars-long"
    export JWT_REFRESH_SECRET="dev-refresh-secret-key-min-32-chars"
    export PORT=3001
fi

# Generate Prisma client
echo "📊 Generating Prisma client..."
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5488/social_commerce}"
npx prisma generate || echo "⚠️  Prisma generate failed"

# Run migrations (DB in Docker: ensure postgres is up first, e.g. via ./scripts/dev.sh)
echo "📊 Running database migrations..."
npx prisma migrate deploy || echo "⚠️  Migrations failed - is postgres running? (./scripts/dev.sh starts it)"

echo "✅ Starting NestJS server on port 3001..."
echo "📡 API will be available at: http://localhost:3001"
echo ""

npm run dev
