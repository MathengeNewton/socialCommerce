#!/usr/bin/env bash
# Fix node_modules ownership after Docker (or root) created files as nobody/root.
# Run: sudo bash scripts/fix-permissions.sh   (then run pnpm install as yourself)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ME="${SUDO_USER:-$USER}"
if [ "$(id -u)" != 0 ]; then
  echo "Run with sudo so ownership can be changed: sudo $0"
  exit 1
fi
echo "Fixing ownership to $ME..."
chown -R "$ME:$ME" node_modules packages/shared/node_modules apps/admin/node_modules apps/shop/node_modules services/api/node_modules services/worker/node_modules 2>/dev/null || true
[ -d .pnpm-store ] && chown -R "$ME:$ME" .pnpm-store
[ -d services/api/dist ] && chown -R "$ME:$ME" services/api/dist
echo "Done. Run as yourself: pnpm install (and pnpm build if needed)"
