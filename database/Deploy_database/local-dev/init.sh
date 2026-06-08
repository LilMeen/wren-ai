#!/usr/bin/env bash
# ==============================================================================
# init.sh — Full local dev stack initialisation
#
# What it does:
#   1. Generate mock data  (python gen_mock.py)
#   2. Copy generated SQL into init/02_mock_data.sql
#   3. docker compose up -d  (starts all services)
#   4. Wait for StarRocks FE to be healthy
#   5. Verify data was loaded (row count check)
#
# Usage:
#   bash init.sh             # normal run
#   bash init.sh --no-data   # skip mock data generation (use existing SQL)
#   bash init.sh --down      # tear down stack + volumes first, then re-init
#
# Requirements:
#   - Docker with Compose plugin (docker compose)
#   - Python 3 with pandas (for gen_mock.py)
#   - mysql client (for verification step)
# ==============================================================================

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')] $*${NC}"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✔ $*${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${NC}"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✘ $*${NC}" >&2; exit 1; }

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOCK_DIR="$(realpath "$SCRIPT_DIR/../../mock_data")"
GEN_SCRIPT="$MOCK_DIR/gen_mock.py"
MOCK_SRC="$MOCK_DIR/mock_data.sql"
MOCK_DST="$SCRIPT_DIR/init/02_mock_data.sql"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"

# ── Parse args ─────────────────────────────────────────────────────────────────
SKIP_DATA=false
TEARDOWN=false
for arg in "$@"; do
  case $arg in
    --no-data) SKIP_DATA=true ;;
    --down)    TEARDOWN=true  ;;
    *) err "Unknown argument: $arg. Usage: $0 [--no-data] [--down]" ;;
  esac
done

# ── Preflight checks ───────────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v docker  >/dev/null 2>&1 || err "docker not found"
docker compose version >/dev/null 2>&1 || err "docker compose plugin not found"
command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || err "python not found"
ok "Prerequisites OK"

PYTHON=$(command -v python3 2>/dev/null || command -v python)

# ── Step 0: Optional teardown ──────────────────────────────────────────────────
if [ "$TEARDOWN" = true ]; then
  warn "Tearing down existing stack and volumes..."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
  ok "Stack torn down"
fi

# ── Step 1: Generate mock data ─────────────────────────────────────────────────
if [ "$SKIP_DATA" = false ]; then
  log "Generating mock data..."
  if [ ! -f "$GEN_SCRIPT" ]; then
    err "gen_mock.py not found at: $GEN_SCRIPT"
  fi
  pushd "$MOCK_DIR" > /dev/null
  $PYTHON gen_mock.py || err "gen_mock.py failed"
  popd > /dev/null
  ok "mock_data.sql generated"
else
  warn "Skipping mock data generation (--no-data)"
  if [ ! -f "$MOCK_SRC" ]; then
    err "mock_data.sql not found at $MOCK_SRC. Run without --no-data first."
  fi
fi

# ── Step 2: Copy SQL into init/ ────────────────────────────────────────────────
log "Copying mock data SQL to init/..."
mkdir -p "$SCRIPT_DIR/init"
cp "$MOCK_SRC" "$MOCK_DST"
ok "Copied to: $MOCK_DST"

# ── Step 3: Start the stack ────────────────────────────────────────────────────
log "Starting docker compose stack..."
docker compose -f "$COMPOSE_FILE" up -d || err "docker compose up failed"
ok "Stack started"

# ── Step 4: Wait for StarRocks FE ──────────────────────────────────────────────
log "Waiting for StarRocks FE to be healthy (up to 3 minutes)..."
TIMEOUT=180
ELAPSED=0
INTERVAL=5

until docker compose -f "$COMPOSE_FILE" exec -T starrocks-fe \
      bash -c "curl -sf http://localhost:8030/api/health > /dev/null 2>&1" 2>/dev/null; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    err "StarRocks FE did not become healthy within ${TIMEOUT}s. Check: docker compose logs starrocks-fe"
  fi
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
  log "  Still waiting... ${ELAPSED}s / ${TIMEOUT}s"
done
ok "StarRocks FE is healthy"

# ── Step 5: Wait for data loader to finish ─────────────────────────────────────
log "Waiting for starrocks-data-loader to complete..."
TIMEOUT=120
ELAPSED=0

while true; do
  STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json starrocks-data-loader 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('State','unknown'))" 2>/dev/null \
    || echo "unknown")

  case "$STATUS" in
    exited)
      EXIT_CODE=$(docker compose -f "$COMPOSE_FILE" ps --format json starrocks-data-loader 2>/dev/null \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ExitCode',1))" 2>/dev/null \
        || echo "1")
      if [ "$EXIT_CODE" = "0" ]; then
        ok "Data loader completed successfully"
        break
      else
        err "Data loader exited with code $EXIT_CODE. Check: docker compose logs starrocks-data-loader"
      fi
      ;;
    running)
      if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        err "Data loader still running after ${TIMEOUT}s — something may be stuck"
      fi
      sleep "$INTERVAL"
      ELAPSED=$((ELAPSED + INTERVAL))
      log "  Data loader running... ${ELAPSED}s / ${TIMEOUT}s"
      ;;
    *)
      warn "Data loader status: $STATUS — skipping wait"
      break
      ;;
  esac
done

# ── Step 6: Verify row counts ──────────────────────────────────────────────────
log "Verifying data..."
MYSQL_CMD="docker compose -f $COMPOSE_FILE exec -T starrocks-fe mysql -h 127.0.0.1 -P 9030 -u root --batch --silent"

EVT_COUNT=$($MYSQL_CMD -e "SELECT COUNT(*) FROM sdp_near_realtime.raw_dmp_evt_connectivity;" 2>/dev/null | tail -1 || echo "0")
TLM_COUNT=$($MYSQL_CMD -e "SELECT COUNT(*) FROM sdp_near_realtime.raw_dmp_tlm_raw;" 2>/dev/null | tail -1 || echo "0")

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│             Init complete — Row counts           │${NC}"
echo -e "${GREEN}├─────────────────────────────────────────────────┤${NC}"
printf "${GREEN}│  %-40s %6s │${NC}\n" "raw_dmp_evt_connectivity"  "$EVT_COUNT"
printf "${GREEN}│  %-40s %6s │${NC}\n" "raw_dmp_tlm_raw"           "$TLM_COUNT"
echo -e "${GREEN}└─────────────────────────────────────────────────┘${NC}"
echo ""

# Warn if counts look wrong (not fail — user may have run with --no-data on empty SQL)
if [ "$EVT_COUNT" = "0" ] && [ "$TLM_COUNT" = "0" ]; then
  warn "Both tables are empty. If this is unexpected, check: docker compose logs starrocks-data-loader"
else
  ok "Data verification passed"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
log "Stack is ready. Useful commands:"
echo "  docker compose -f $COMPOSE_FILE logs -f starrocks-data-loader"
echo "  mysql -h 127.0.0.1 -P 9030 -u root"
echo "  docker compose -f $COMPOSE_FILE down        # stop (keep data)"
echo "  docker compose -f $COMPOSE_FILE down -v     # stop + wipe data"
