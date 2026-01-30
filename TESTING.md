# Testing Guide - Social Commerce Platform

## Current Status

✅ **Infrastructure Services Running:**
- PostgreSQL: `localhost:5432` (healthy)
- Redis: `localhost:6380` (healthy)  
- MinIO: `localhost:9000` (healthy, console at `localhost:9001`)

⏳ **Applications (Need to Start):**
- API Server: Port 3001
- Admin App: Port 3002
- Shop App: Port 3003

## Quick Test Commands

### 1. Verify Infrastructure
```bash
# Check services
docker compose ps

# Test PostgreSQL
docker compose exec postgres psql -U postgres -c "SELECT version();"

# Test Redis
docker compose exec redis redis-cli ping

# Test MinIO (browser)
open http://localhost:9001
# Login: minioadmin / minioadmin
```

### 2. Setup Database (Run Once)
```bash
cd services/api

# Set environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"

# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# Seed database
npx ts-node prisma/seed.ts
```

### 3. Start API Server
```bash
cd services/api

# Install dependencies (if network allows)
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"
export REDIS_URL="redis://localhost:6380"
export S3_ENDPOINT="http://localhost:9000"
export S3_ACCESS_KEY="minioadmin"
export S3_SECRET_KEY="minioadmin"
export S3_BUCKET="media"
export JWT_SECRET="dev-secret-key-min-32-chars-long"
export JWT_REFRESH_SECRET="dev-refresh-secret-key-min-32-chars"
export PORT=3001

# Start server
pnpm dev
```

### 4. Test API Endpoints

#### Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

#### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'
```

Expected response:
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### Get Products (Public Store API)
```bash
curl http://localhost:3001/store/products
```

#### Get Products (Admin - requires auth)
```bash
# Use token from login
TOKEN="your-access-token-here"
curl http://localhost:3001/products \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Start Admin App
```bash
cd apps/admin

# Install dependencies
pnpm install

# Set environment
export NEXT_PUBLIC_API_URL="http://localhost:3001"

# Start dev server
pnpm dev
```

Visit: http://localhost:3002
- Login page should load
- Use: `admin@demo.com` / `admin123`

### 6. Start Shop App
```bash
cd apps/shop

# Install dependencies  
pnpm install

# Set environment
export NEXT_PUBLIC_API_URL="http://localhost:3001"

# Start dev server
pnpm dev
```

Visit: http://localhost:3003
- Homepage should show products
- Product listing at `/products`
- Product detail at `/p/[slug]`

## Test Scenarios

### Scenario 1: Complete E-commerce Flow
1. ✅ Start all services
2. ✅ Login to admin (http://localhost:3002)
3. ✅ Create a product
4. ✅ View product on shop (http://localhost:3003)
5. ✅ Add to cart
6. ✅ Checkout
7. ✅ Verify order in admin

### Scenario 2: API Testing
```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}' \
  | jq -r '.accessToken')

# 3. Get current user
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Get products
curl http://localhost:3001/products \
  -H "Authorization: Bearer $TOKEN"

# 5. Create product
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "description": "A test product",
    "price": 29.99,
    "currency": "USD",
    "slug": "test-product",
    "status": "published"
  }'
```

## Troubleshooting

### Database Issues
- Check if postgres is running: `docker compose ps postgres`
- View logs: `docker compose logs postgres`
- Connect manually: `docker compose exec postgres psql -U postgres -d social_commerce`

### API Not Starting
- Check if port 3001 is available: `lsof -i :3001`
- Check API logs for errors
- Verify environment variables are set
- Ensure Prisma client is generated: `npx prisma generate`

### Network Issues (npm/pnpm install)
- Check internet connection
- Try: `npm config set registry https://registry.npmjs.org/`
- Use VPN if needed
- Check firewall settings

### MinIO Setup
- Access console: http://localhost:9001
- Create bucket named "media"
- Set bucket policy to public read if needed

## Next Steps

Once basic testing is complete:
1. ✅ Test authentication flow
2. ✅ Test product CRUD
3. ✅ Test storefront
4. ⏳ Test media uploads
5. ⏳ Test orders
6. ⏳ Test social integrations (Phase 5)
7. ⏳ Test publishing engine (Phase 5)
