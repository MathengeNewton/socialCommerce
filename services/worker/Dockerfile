FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Prisma needs OpenSSL libraries at runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json* ./
COPY pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml* ./
COPY services/worker/package.json ./services/worker/package.json
COPY services/api/package.json ./services/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

WORKDIR /app

CMD ["pnpm", "--filter", "worker", "dev"]
