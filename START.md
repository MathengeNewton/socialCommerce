# Starting and Testing the Social Commerce Platform

## Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ and pnpm installed
- Network access to npm registry

## Quick Start

### 1. Start Infrastructure Services
```bash
cd /home/newton/projects/uzahX
docker compose up -d postgres redis minio
```

Wait for services to be healthy (about 10-15 seconds).

### 2. Setup Database
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

### 3. Start API Server
```bash
cd services/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_commerce"
export REDIS_URL="redis://localhost:6380"
export S3_ENDPOINT="http://localhost:9000"
export S3_ACCESS_KEY="minioadmin"
export S3_SECRET_KEY="minioadmin"
export S3_BUCKET="media"
export JWT_SECRET="dev-secret-key-change-in-production"
export JWT_REFRESH_SECRET="dev-refresh-secret-key-change-in-production"
export PORT=3001

pnpm install  # if not already installed
pnpm dev
```

The API should start on http://localhost:3001

### 4. Test API Health
```bash
curl http://localhost:3001/health
```

### 5. Start Admin App (in new terminal)
```bash
cd apps/admin
export NEXT_PUBLIC_API_URL="http://localhost:3001"
pnpm install  # if not already installed
pnpm dev
```

Admin app will be on http://localhost:3002

### 6. Start Shop App (in new terminal)
```bash
cd apps/shop
export NEXT_PUBLIC_API_URL="http://localhost:3001"
pnpm install  # if not already installed
pnpm dev
```

Shop app will be on http://localhost:3003

## Test Credentials
- Email: `admin@demo.com`
- Password: `admin123`

## Test Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'
```

### Get Products (Public)
```bash
curl http://localhost:3001/store/products
```

### Get Products (Authenticated)
```bash
# First get token from login, then:
curl http://localhost:3001/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Database Connection Issues
- Ensure postgres container is running: `docker compose ps`
- Check postgres logs: `docker compose logs postgres`
- Verify connection: `docker compose exec postgres psql -U postgres -c "SELECT 1;"`

### Port Already in Use
- Change ports in docker-compose.yml or stop conflicting services

### Network Issues (npm registry)
- Check internet connection
- Try using a VPN or different network
- Use `npm config set registry https://registry.npmjs.org/`

### Prisma Issues
- Ensure DATABASE_URL is set correctly
- Run `npx prisma generate` after schema changes
- Check Prisma Studio: `npx prisma studio`
