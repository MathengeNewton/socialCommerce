#!/usr/bin/env bash
# Start stack with warm Docker caches for fast rebuilds.
# Avoid destructive prune during normal startup.
#
# Typical VPS (clean, stable):
#   DETACH=1 IO_WATCHDOG=0 WITH_BUILD=1 ./up.sh
# First deploy builds images; later runs omit WITH_BUILD=1 unless Dockerfiles/deps changed.
# WITH_BUILD=1 runs `scripts/compose-build-batched.sh` then `compose up` (no parallel build storm).
#   BUILD_BATCH_SIZE=2 (default) — max services built at once; set to 1 for fully sequential builds.
#
# I/O watchdog (optional; for diagnosing runaway disk load — not for normal prod):
#   IO_WATCHDOG=1 ./up.sh
# Do not combine IO_WATCHDOG=1 with DETACH=1 (watchdog only monitors foreground compose).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
export ROOT

# Load env so compose sees .env
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

COMPOSE="docker compose"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

PROD_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
WITH_BUILD="${WITH_BUILD:-0}"
export WITH_BUILD
# Server: DETACH=1 runs `docker compose up -d` and exits (foreground logs + watchdog not used).
DETACH="${DETACH:-0}"
# Default off: stable prod; set IO_WATCHDOG=1 when diagnosing I/O stalls (uses scripts/io-watchdog.sh).
IO_WATCHDOG="${IO_WATCHDOG:-0}"
BUILD_BATCH_SIZE="${BUILD_BATCH_SIZE:-2}"
export ROOT COMPOSE PROD_ARGS

_compose_build_batched() {
  echo "[up] Building images in batches of ${BUILD_BATCH_SIZE} (scripts/compose-build-batched.sh)..."
  BUILD_BATCH_SIZE="$BUILD_BATCH_SIZE" "$ROOT/scripts/compose-build-batched.sh"
}

# #region agent log
# Debug snapshots for session cf925e — NDJSON to .cursor/debug-cf925e.log (hypothesis H1–H5)
_agent_debug_snapshot() {
  export _AGENT_HID="$1"
  export _AGENT_MSG="$2"
  python3 <<'PY'
import json, os, subprocess, time
log = os.path.join(os.environ["ROOT"], ".cursor", "debug-cf925e.log")
os.makedirs(os.path.dirname(log), exist_ok=True)
hid = os.environ.get("_AGENT_HID", "?")
msg = os.environ.get("_AGENT_MSG", "")
data = {"with_build": os.environ.get("WITH_BUILD", "0")}
for name, cmd in [
    ("free_m", ["free", "-m"]),
    ("df_h", ["df", "-h", "/"]),
    ("df_i", ["df", "-i", "/"]),
]:
    try:
        data[name] = subprocess.check_output(cmd, text=True, timeout=10)
    except Exception as e:
        data[name + "_err"] = str(e)
try:
    with open("/proc/loadavg") as f:
        data["loadavg"] = f.read().strip()
except Exception as e:
    data["loadavg_err"] = str(e)
try:
    with open("/proc/meminfo") as f:
        lines = f.readlines()[:12]
    data["meminfo_head"] = "".join(lines)
except Exception as e:
    data["meminfo_err"] = str(e)
try:
    out = subprocess.check_output(["docker", "ps", "-q"], text=True, timeout=25)
    data["docker_running_containers"] = len([x for x in out.splitlines() if x.strip()])
except Exception as e:
    data["docker_ps_err"] = str(e)
try:
    di = subprocess.check_output(["docker", "info", "-f", "{{.ContainersRunning}}"], text=True, timeout=25)
    data["docker_info_containers_running"] = di.strip()
except Exception as e:
    data["docker_info_err"] = str(e)
entry = {
    "sessionId": "cf925e",
    "hypothesisId": hid,
    "location": "up.sh",
    "message": msg,
    "data": data,
    "timestamp": int(time.time() * 1000),
}
with open(log, "a") as f:
    f.write(json.dumps(entry) + "\n")
PY
}
# #endregion

_agent_debug_snapshot "H1_H2_H3_H4_H5" "baseline_before_compose_down"

echo "[up] Stop and remove existing stack..."
$COMPOSE $PROD_ARGS down --remove-orphans 2>/dev/null || true

_agent_debug_snapshot "H1_H2_H3_H4_H5" "after_compose_down_before_up"

if [ "$DETACH" = "1" ]; then
  echo "[up] Detached mode (DETACH=1): starting stack in background."
  if [ "$WITH_BUILD" = "1" ]; then
    _compose_build_batched
    $COMPOSE $PROD_ARGS up -d
  else
    $COMPOSE $PROD_ARGS up -d
  fi
  echo "[up] Done. Follow logs: $COMPOSE $PROD_ARGS logs -f"
  echo "[up] Status: $COMPOSE $PROD_ARGS ps"
  exit 0
fi

if [ "$IO_WATCHDOG" != "0" ]; then
  echo "[up] I/O watchdog enabled (IO_WATCHDOG=0 to disable)."
  echo "[up]   Trip log: $ROOT/.cursor/io-watchdog-trip.log"
  echo "[up]   Tune: IO_MAX_IOWAIT_PCT IO_MAX_DISK_MBPS IO_SUSTAINED_HITS IO_WATCH_GRACE_SEC"
  _agent_debug_snapshot "H1_H2_H3_H4_H5" "immediately_before_compose_up_watchdog_mode"
  if [ "$WITH_BUILD" = "1" ]; then
    echo "[up] Batched build, then start all services (logs stream below)..."
    _compose_build_batched
    $COMPOSE $PROD_ARGS up &
  else
    echo "[up] Start all services without rebuild (logs stream below)..."
    $COMPOSE $PROD_ARGS up &
  fi
  UP_PID=$!
  "$ROOT/scripts/io-watchdog.sh" "$UP_PID" &
  WD_PID=$!
  wait "$UP_PID"
  EXIT=$?
  kill "$WD_PID" 2>/dev/null || true
  wait "$WD_PID" 2>/dev/null || true
  exit "$EXIT"
fi

if [ "$WITH_BUILD" = "1" ]; then
  echo "[up] Batched build, then start all services (logs stream below)..."
  _compose_build_batched
  _agent_debug_snapshot "H1_H2_H3_H4_H5" "immediately_before_compose_up_build"
  exec $COMPOSE $PROD_ARGS up
else
  echo "[up] Start all services without rebuild (logs stream below)..."
  _agent_debug_snapshot "H1_H2_H3_H4_H5" "immediately_before_compose_up"
  exec $COMPOSE $PROD_ARGS up
fi
