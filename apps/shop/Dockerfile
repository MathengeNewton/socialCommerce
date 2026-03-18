FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files so pnpm install sees the full workspace and installs next + app deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/shop/package.json ./apps/shop/
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/
COPY services/worker/package.json ./services/worker/

RUN pnpm install --no-frozen-lockfile || echo "Installation had issues, continuing..."

COPY . .

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "shop", "dev"]
