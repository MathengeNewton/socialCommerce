#!/bin/sh
cd /app
pnpm install --no-frozen-lockfile
pnpm rebuild bcrypt 2>/dev/null || true

# Create symlink for zod in shared package node_modules so it can be resolved
mkdir -p /app/packages/shared/node_modules
ZOD_PATH=$(find /app/node_modules/.pnpm -name 'zod@*' -type d 2>/dev/null | head -1)
if [ -n "$ZOD_PATH" ] && [ ! -e /app/packages/shared/node_modules/zod ]; then
  ln -sf "${ZOD_PATH}/node_modules/zod" /app/packages/shared/node_modules/zod
fi

cd /app/services/api
pnpm exec prisma generate
exec npx ts-node-dev --respawn --transpile-only src/main.ts
