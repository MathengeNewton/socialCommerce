#!/bin/bash
set -e

echo "🚀 Starting Admin App..."

cd apps/admin

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/next" ]; then
    echo "📦 Installing dependencies..."
    pnpm install || npm install
fi

# Set environment
export NEXT_PUBLIC_API_URL="http://localhost:3001"

echo "✅ Starting Next.js dev server on port 3002..."
echo "📱 Admin app will be available at: http://localhost:3002"
echo ""
echo "⚠️  Note: Make sure the API is running on port 3001 first!"
echo ""

pnpm dev || npm run dev
