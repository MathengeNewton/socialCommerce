#!/usr/bin/env bash
# Fix ownership of node_modules (and pnpm store) then optionally remove node_modules for clean reinstall.
# Run: sudo bash scripts/fix-permissions.sh
# Optional: sudo bash scripts/fix-permissions.sh --clean   (also removes node_modules so next pnpm install is fresh)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ME="${SUDO_USER:-$USER}"
if [ "$(id -u)" != 0 ]; then
  echo "Run with sudo: sudo bash scripts/fix-permissions.sh"
  exit 1
fi
echo "Fixing ownership to $ME..."

# Fix ownership first so we can delete if needed
chown -R "$ME:$ME" "$ROOT/node_modules" 2>/dev/null || true
chown -R "$ME:$ME" "$ROOT/packages/shared/node_modules" 2>/dev/null || true
chown -R "$ME:$ME" "$ROOT/apps/admin/node_modules" 2>/dev/null || true
chown -R "$ME:$ME" "$ROOT/apps/shop/node_modules" 2>/dev/null || true
chown -R "$ME:$ME" "$ROOT/services/api/node_modules" 2>/dev/null || true
chown -R "$ME:$ME" "$ROOT/services/worker/node_modules" 2>/dev/null || true
[ -d "$ROOT/.pnpm-store" ] && chown -R "$ME:$ME" "$ROOT/.pnpm-store"
[ -d "$ROOT/services/api/dist" ] && chown -R "$ME:$ME" "$ROOT/services/api/dist"
REAL_HOME=$(getent passwd "$ME" | cut -d: -f6)
[ -d "$REAL_HOME/.local/share/pnpm/store" ] && chown -R "$ME:$ME" "$REAL_HOME/.local/share/pnpm/store" 2>/dev/null || true

# Optional: remove node_modules for clean reinstall (so pnpm creates everything as $ME)
if [ "${1:-}" = "--clean" ]; then
  echo "Removing node_modules for clean reinstall..."
  rm -rf "$ROOT/node_modules"
  rm -rf "$ROOT/packages/shared/node_modules"
  rm -rf "$ROOT/apps/admin/node_modules" "$ROOT/apps/shop/node_modules"
  rm -rf "$ROOT/services/api/node_modules" "$ROOT/services/worker/node_modules"
  echo "Done. Run as yourself (no sudo): pnpm install"
else
  echo "Done. Run as yourself: pnpm install"
fi
echo "Then: ./scripts/dev.sh   or   ./start-api.sh"
