# syntax=docker/dockerfile:1.7
FROM node:18-alpine AS base

# Install build dependencies for native modules and OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./

# Copy API package.json
COPY services/api/package.json ./services/api/

# Copy shared package if it exists
COPY packages/shared/package.json* ./packages/shared/

# Install dependencies (allow scripts to run) and rebuild native modules.
# Use cached pnpm store so packages are downloaded once then reused.
RUN pnpm config set store-dir /pnpm/store && \
    pnpm config set enable-pre-post-scripts true
RUN --mount=type=cache,id=hhourssop-pnpm-store,target=/pnpm/store \
    pnpm install --no-frozen-lockfile && \
    pnpm rebuild bcrypt || echo "Installation had issues, continuing..."

# Copy source code
COPY services/api ./services/api
COPY packages/shared ./packages/shared

WORKDIR /app/services/api

# Generate Prisma client with correct binary targets
RUN npx prisma generate || echo "Prisma generate failed"

# Install nest CLI globally so it's available in PATH
RUN pnpm add -g @nestjs/cli || npm install -g @nestjs/cli || echo "Global nest install had issues"

EXPOSE 3001

CMD ["npm", "run", "dev"]
