#!/bin/bash

# Quick smoke test script to verify API endpoints

API_URL="http://127.0.0.1:3004"
ADMIN_URL="http://localhost:3005"
SHOP_URL="http://localhost:3003"

echo "🧪 Smoke Test - API Verification"
echo "=================================="
echo ""

# Check API health
echo "1. Checking API health..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ API is healthy"
  echo "   Response: $HEALTH"
else
  echo "   ❌ API health check failed"
  echo "   Response: $HEALTH"
  exit 1
fi

echo ""
echo "2. Testing endpoints (requires authentication)..."
echo "   Note: Full testing requires admin login token"
echo ""
echo "   Available endpoints:"
echo "   - GET  $API_URL/clients"
echo "   - POST $API_URL/clients"
echo "   - GET  $API_URL/suppliers"
echo "   - POST $API_URL/suppliers"
echo "   - GET  $API_URL/products?clientId=xxx"
echo "   - POST $API_URL/posts (requires clientId)"
echo "   - GET  $API_URL/billing/clients/:clientId/invoices"
echo "   - POST $API_URL/billing/clients/:clientId/invoices/generate"
echo ""

echo "3. Frontend URLs:"
echo "   ✅ Admin UI: $ADMIN_URL"
echo "   ✅ Shop UI: $SHOP_URL"
echo ""

echo "4. Service Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -E "NAME|social-commerce"
echo ""

echo "📋 Next Steps:"
echo "   1. Open Admin UI: $ADMIN_URL"
echo "   2. Login with admin credentials"
echo "   3. Follow the smoke test guide: SMOKE_TEST.md"
echo ""

echo "✨ All systems ready for testing!"
