FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json* ./
COPY pnpm-workspace.yaml* ./

# Install dependencies (no frozen lockfile for now)
RUN pnpm install --no-frozen-lockfile || echo "Installation had issues, continuing..."

# Copy source code
COPY . .

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "admin", "dev"]
