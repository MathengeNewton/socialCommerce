# Starting the API Server

## The Problem
The admin app shows "Failed to fetch" because the API server isn't running on port 3001.

## Quick Fix

### Option 1: Use pnpm (Recommended)
```bash
# From project root
cd /home/newton/projects/uzahX
pnpm install --filter @social-commerce/api

# Then start API
cd services/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"
export REDIS_URL="redis://localhost:6379"
export S3_ENDPOINT="http://localhost:9000"
export S3_ACCESS_KEY="minioadmin"
export S3_SECRET_KEY="minioadmin"
export S3_BUCKET="media"
export JWT_SECRET="dev-secret-key-min-32-chars-long"
export JWT_REFRESH_SECRET="dev-refresh-secret-key-min-32-chars"
pnpm dev
```

### Option 2: If pnpm has network issues, use Docker
```bash
cd /home/newton/projects/uzahX
docker compose up api
```

### Option 3: Manual npm install (temporary fix)
If you can't use pnpm, temporarily modify `services/api/package.json`:
- Change `"@social-commerce/shared": "workspace:*"` to `"@social-commerce/shared": "file:../../packages/shared"`
- Then run `npm install` in `services/api`

## After Starting API

1. **Verify API is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Test login endpoint:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.com","password":"admin123"}'
   ```

3. **Refresh admin app** at http://localhost:3002/login

## Database Setup (First Time Only)

Before starting API, you may need to run migrations:

```bash
cd services/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npx ts-node prisma/seed.ts
```

## Troubleshooting

- **Port 3001 in use?** Check: `lsof -i :3001`
- **Database connection error?** Verify postgres is running: `docker compose ps postgres`
- **Module not found?** Run `pnpm install` from project root
