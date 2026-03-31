#!/usr/bin/env bash
# Watch host disk pressure while `docker compose up` runs. If I/O stays dangerously
# high for a sustained window (after an optional grace period), stop compose and write diagnostics.
#
# Env (optional):
#   IO_WATCH_INTERVAL=3           seconds between samples
#   IO_MAX_IOWAIT_PCT=55          vmstat "wa" column trip threshold (0-100)
#   IO_MAX_DISK_MBPS=90           approximate combined read+write MB/s trip threshold
#   IO_SUSTAINED_HITS=8           consecutive over-threshold samples required
#   IO_WATCH_GRACE_SEC=180        no trips during first N seconds (covers first build burst)
#   IO_WATCHDOG_DEBUG_LOG=path    NDJSON append (default: $ROOT/.cursor/debug-cf925e.log)
#   IO_WATCHDOG_TRIP_LOG=path     human log (default: $ROOT/.cursor/io-watchdog-trip.log)
#
# Usage: scripts/io-watchdog.sh <compose_up_pid>
# Parent must set: ROOT, COMPOSE, PROD_ARGS (optional)

set -u
UP_PID="${1:-}"
if [ -z "$UP_PID" ] || ! [[ "$UP_PID" =~ ^[0-9]+$ ]]; then
  echo "usage: $0 <docker_compose_up_pid>" >&2
  exit 2
fi

ROOT="${ROOT:-$(pwd)}"
COMPOSE="${COMPOSE:-docker compose}"
_DEFAULT_PROD_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
PROD_ARGS="${PROD_ARGS:-$_DEFAULT_PROD_ARGS}"

INTERVAL="${IO_WATCH_INTERVAL:-3}"
MAX_WA="${IO_MAX_IOWAIT_PCT:-55}"
MAX_MBPS="${IO_MAX_DISK_MBPS:-90}"
HITS="${IO_SUSTAINED_HITS:-8}"
GRACE="${IO_WATCH_GRACE_SEC:-180}"

DEBUG_LOG="${IO_WATCHDOG_DEBUG_LOG:-$ROOT/.cursor/debug-cf925e.log}"
TRIP_LOG="${IO_WATCHDOG_TRIP_LOG:-$ROOT/.cursor/io-watchdog-trip.log}"

mkdir -p "$(dirname "$DEBUG_LOG")" "$(dirname "$TRIP_LOG")"

started="$(date +%s)"
consecutive=0

sectors_total() {
  awk '
    $3 ~ /^(sda|sdb|nvme0n1|nvme1n1|vda|vdb|xvda)$/ { r += $6; w += $10 }
    END { printf "%d %d\n", r + 0, w + 0 }
  ' /proc/diskstats 2>/dev/null || echo "0 0"
}

read_vmstat_wa() {
  if ! command -v vmstat >/dev/null 2>&1; then
    echo "0"
    return
  fi
  # Last numeric row is the 1s sample: wa is field 16 when "st" exists
  local line
  line="$(vmstat 1 2 2>/dev/null | awk 'NF >= 16 && $1 ~ /^[0-9]+$/ { line = $0 } END { print line }')"
  if [ -z "$line" ]; then
    echo "0"
    return
  fi
  echo "$line" | awk '{ print ($16 + 0) }'
}

append_ndjson() {
  local msg="$1"
  export DEBUG_LOG
  export _AGENT_MSG="$msg"
  export _AGENT_DATA_JSON="$2"
  python3 <<'PY'
import json, os, time
log = os.environ.get("DEBUG_LOG", "")
msg = os.environ.get("_AGENT_MSG", "")
try:
    data = json.loads(os.environ.get("_AGENT_DATA_JSON", "{}"))
except json.JSONDecodeError:
    data = {"parse_error": True}
entry = {
    "sessionId": "cf925e",
    "hypothesisId": "IO_WATCHDOG",
    "location": "scripts/io-watchdog.sh",
    "message": msg,
    "data": data,
    "timestamp": int(time.time() * 1000),
}
with open(log, "a") as f:
    f.write(json.dumps(entry) + "\n")
PY
}

trip_log_block() {
  {
    echo "========== IO WATCHDOG TRIP $(date -Iseconds) =========="
    echo "reason=${1:-unknown}"
    echo "up_pid=$UP_PID grace_sec=$GRACE interval=${INTERVAL}s max_wa=$MAX_WA max_mbps=$MAX_MBPS hits=$HITS"
    echo "--- uptime ---"
    uptime 2>/dev/null || true
    echo "--- free -m ---"
    free -m 2>/dev/null || true
    echo "--- df -h / ---"
    df -h / 2>/dev/null || true
    echo "--- df -i / ---"
    df -i / 2>/dev/null || true
    echo "--- vmstat (once) ---"
    vmstat 1 2 2>/dev/null || true
    echo "--- top disk lines /proc/diskstats ---"
    head -20 /proc/diskstats 2>/dev/null || true
    echo "--- dmesg (last 40) ---"
    dmesg -T 2>/dev/null | tail -40 || true
    echo "--- docker ps -a ---"
    docker ps -a 2>/dev/null | head -50 || true
    echo "--- compose ps ---"
    (cd "$ROOT" && $COMPOSE $PROD_ARGS ps -a 2>/dev/null) || true
    echo "========== END =========="
  } >> "$TRIP_LOG"
}

sample_over_threshold() {
  local age="$1"
  local wa="$2"
  local mbps="$3"
  [ "$age" -lt "$GRACE" ] && return 1
  awk -v wa="$wa" -v mbps="$mbps" -v m="$MAX_WA" -v mm="$MAX_MBPS" 'BEGIN {
    if (wa + 0 >= m + 0) exit 0
    if (mbps + 0 >= mm + 0) exit 0
    exit 1
  }'
}

# --- main loop ---
read -r r0 w0 <<< "$(sectors_total)"
t0=$(date +%s)

while kill -0 "$UP_PID" 2>/dev/null; do
  sleep "$INTERVAL"

  now=$(date +%s)
  age=$((now - started))
  read -r r1 w1 <<< "$(sectors_total)"
  t1=$(date +%s)
  dt=$((t1 - t0))
  [ "$dt" -lt 1 ] && dt=1

  dr=$((r1 - r0))
  dw=$((w1 - w0))
  [ "$dr" -lt 0 ] && dr=0
  [ "$dw" -lt 0 ] && dw=0
  mbps=$(awk -v dr="$dr" -v dw="$dw" -v dt="$dt" 'BEGIN { printf "%.2f", (dr + dw) * 512 / 1024 / 1024 / dt }')

  wa="$(read_vmstat_wa)"

  if sample_over_threshold "$age" "$wa" "$mbps"; then
    consecutive=$((consecutive + 1))
  else
    consecutive=0
  fi

  r0=$r1
  w0=$w1
  t0=$t1

  if [ "$consecutive" -ge "$HITS" ]; then
    data_json=$(python3 -c "import json; print(json.dumps({'wa': float('$wa'), 'disk_mbps': float('$mbps'), 'age_sec': int('$age'), 'consecutive': int('$consecutive')}))")
    append_ndjson "io_watchdog_trip" "$data_json"
    trip_log_block "sustained_high_io wa=${wa}% disk_mbps=${mbps} age_sec=${age}"

    kill -TERM "$UP_PID" 2>/dev/null || true
    sleep 2
    kill -KILL "$UP_PID" 2>/dev/null || true
    (cd "$ROOT" && $COMPOSE $PROD_ARGS down --remove-orphans 2>/dev/null) || true

    append_ndjson "io_watchdog_compose_down_after_trip" '{"ok": true}'
    exit 0
  fi
done

exit 0
