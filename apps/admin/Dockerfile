# syntax=docker/dockerfile:1.7
FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files so pnpm install sees the full workspace (installs next, etc.)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/shop/package.json ./apps/shop/
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/
COPY services/worker/package.json ./services/worker/

# Persist pnpm package store across builds to avoid re-downloading deps.
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,id=hhourssop-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN cd /app && pnpm --filter @social-commerce/admin exec next --version

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "admin", "dev"]
