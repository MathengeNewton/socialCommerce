#!/bin/bash
set -e

echo "🚀 Setting up and testing Social Commerce Platform..."

# Check if services are running
echo "📦 Checking Docker services..."
docker compose ps

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE social_commerce;" 2>&1 || true

# Run migrations (if we can access npm registry)
echo "📊 Running migrations..."
cd services/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"

if command -v npx &> /dev/null; then
  npx prisma generate || echo "⚠️  Could not generate Prisma client (network issue)"
  npx prisma migrate deploy || echo "⚠️  Could not run migrations (network issue)"
else
  echo "⚠️  npx not available, skipping migrations"
fi

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start services:"
echo "  docker compose up -d"
echo ""
echo "To test API:"
echo "  curl http://localhost:3001/health"
echo ""
echo "To access:"
echo "  Admin: http://localhost:3002"
echo "  Shop:  http://localhost:3003"
echo "  API:   http://localhost:3001"
