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

# Must succeed — do not swallow failures or images ship without deps
RUN pnpm install --frozen-lockfile

COPY . .

# pnpm may not hoist `next` to /app/node_modules/.bin — verify via the workspace package
RUN cd /app && pnpm --filter @social-commerce/shop exec next --version

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "shop", "dev"]
