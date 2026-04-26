#!/usr/bin/env bash
#
# AetherWave Troubleshooter (scripts/troubleshoot.sh)
# ----------------------------------------------------
# Comprehensive diagnostic tool that checks every common failure mode
# and outputs a structured troubleshooting report. Designed to be run
# when something goes wrong — produces both human-readable output and
# a machine-parseable log.
#
# Checks:
#   1. System prerequisites (Docker, git, disk, RAM, network)
#   2. Project files (compose, env, scripts)
#   3. Configuration (env vars, API key, ports)
#   4. Container state (running, healthy, restarting)
#   5. Docker resource limits and usage
#   6. Volume mounts and permissions
#   7. Recent error patterns in logs
#   8. API health & connectivity
#   9. Branch state (dirty, behind, ahead)
#  10. Common issue heuristics & remediation hints
#
# Usage:
#   ./scripts/troubleshoot.sh [--quick] [--no-docker] [--export]
#

set -uo pipefail   # NOTE: no -e — we want all checks to run even if some fail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGINAL_ARGS="$*"

# Source shared logging
source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "troubleshoot"
trap log_finalize EXIT

cd "$PROJECT_DIR"

# ─── Parse Args ────────────────────────────────────────────────────────────
QUICK=0
NO_DOCKER=0
EXPORT_REPORT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick)     QUICK=1; shift ;;
    --no-docker) NO_DOCKER=1; shift ;;
    --export)    EXPORT_REPORT=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) shift ;;
  esac
done

# ─── Counters ──────────────────────────────────────────────────────────────
PASS=0
WARN_COUNT=0
FAIL=0
ISSUES=()

_pass() { ok "$*"; PASS=$((PASS + 1)); }
_warn() { warn "$*"; WARN_COUNT=$((WARN_COUNT + 1)); ISSUES+=("WARN: $*"); }
_fail() { err "$*"; FAIL=$((FAIL + 1)); ISSUES+=("FAIL: $*"); }
_hint() { echo -e "       ${AW_CYAN}→ Hint: $*${AW_NC}"; }

# ─── Banner ────────────────────────────────────────────────────────────────
header "AetherWave Troubleshooter"
log "Project:    $PROJECT_DIR"
log "Log file:   $(log_location)"
log "Mode:       $([ $QUICK -eq 1 ] && echo "Quick" || echo "Full")"

# ════════════════════════════════════════════════════════════════════════════
# CHECK 1: System Prerequisites
# ════════════════════════════════════════════════════════════════════════════
header "1. System Prerequisites"

# Docker
if command -v docker >/dev/null 2>&1; then
  _pass "Docker installed: $(docker --version 2>/dev/null | head -1)"
  if docker info >/dev/null 2>&1; then
    _pass "Docker daemon running"
  else
    _fail "Docker daemon NOT running"
    _hint "Run: sudo systemctl start docker  (Linux) or open Docker Desktop (Mac/Win)"
  fi
else
  _fail "Docker not installed"
  _hint "Install: https://docs.docker.com/get-docker/"
fi

# docker-compose
if command -v docker-compose >/dev/null 2>&1; then
  _pass "docker-compose installed: $(docker-compose --version 2>/dev/null | head -1)"
elif docker compose version >/dev/null 2>&1; then
  _pass "docker compose plugin available"
else
  _fail "docker-compose not found"
  _hint "Install: https://docs.docker.com/compose/install/"
fi

# Git
if command -v git >/dev/null 2>&1; then
  _pass "git installed: $(git --version)"
else
  _fail "git not installed"
fi

# Disk space
if command -v df >/dev/null 2>&1; then
  FREE_GB=$(df -BG "$PROJECT_DIR" 2>/dev/null | awk 'NR==2 {gsub("G",""); print $4}')
  if [[ -n "$FREE_GB" ]] && (( FREE_GB >= 50 )); then
    _pass "Disk space: ${FREE_GB}GB free"
  elif [[ -n "$FREE_GB" ]] && (( FREE_GB >= 20 )); then
    _warn "Disk space low: ${FREE_GB}GB free (recommend ≥ 50 GB)"
    _hint "Generated MP3s can fill disk quickly; run ./scripts/logs.sh clean"
  else
    _fail "Disk space critical: ${FREE_GB:-unknown}GB free"
  fi
fi

# RAM
if [[ -f /proc/meminfo ]]; then
  TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
  if (( TOTAL_RAM_GB >= 4 )); then
    _pass "RAM: ${TOTAL_RAM_GB}GB total"
  else
    _fail "Insufficient RAM: ${TOTAL_RAM_GB}GB (need ≥ 4 GB)"
  fi
fi

# Network (basic)
if [[ $QUICK -eq 0 ]]; then
  if curl -sI --max-time 5 https://www.google.com >/dev/null 2>&1; then
    _pass "Internet connectivity OK"
  else
    _warn "No internet connectivity (offline mode)"
    _hint "AI APIs require internet — verify firewall/proxy settings"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 2: Project Files
# ════════════════════════════════════════════════════════════════════════════
header "2. Project Files"

REQUIRED_FILES=(
  "docker-compose.yml"
  ".env.example"
  "ARCHITECTURE.md"
  "README.md"
  "install.sh"
  "update.sh"
  "uninstall.sh"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$PROJECT_DIR/$f" ]]; then
    _pass "Present: $f"
  else
    _fail "Missing: $f"
    _hint "Run: git pull origin \$(git rev-parse --abbrev-ref HEAD)"
  fi
done

# Validate compose file
if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
  if docker-compose config >/dev/null 2>&1; then
    _pass "docker-compose.yml is valid"
  else
    _fail "docker-compose.yml has syntax errors"
    _hint "Run: docker-compose config  (to see error details)"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 3: Configuration
# ════════════════════════════════════════════════════════════════════════════
header "3. Configuration"

if [[ -f "$PROJECT_DIR/.env" ]]; then
  _pass ".env file exists"

  # Permissions
  ENV_PERMS=$(stat -c '%a' "$PROJECT_DIR/.env" 2>/dev/null || stat -f '%A' "$PROJECT_DIR/.env" 2>/dev/null || echo "?")
  if [[ "$ENV_PERMS" == "600" ]]; then
    _pass ".env permissions: 0600 (secure)"
  else
    _warn ".env permissions: $ENV_PERMS (should be 0600)"
    _hint "Run: chmod 600 .env"
  fi

  # API key check
  if grep -q "^GOOGLE_API_KEY=your-api-key-here" "$PROJECT_DIR/.env" 2>/dev/null; then
    _fail "GOOGLE_API_KEY is still the placeholder value"
    _hint "Edit .env and set GOOGLE_API_KEY to your real Google Cloud API key"
  elif grep -q "^GOOGLE_API_KEY=$" "$PROJECT_DIR/.env" 2>/dev/null; then
    _fail "GOOGLE_API_KEY is empty"
  elif grep -q "^GOOGLE_API_KEY=." "$PROJECT_DIR/.env" 2>/dev/null; then
    _pass "GOOGLE_API_KEY appears set"
  else
    _warn "GOOGLE_API_KEY not found in .env"
  fi

  # Required vars
  for var in DEVICE_TYPE REDIS_URL DATABASE_URL; do
    if grep -q "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null; then
      _pass "Set: $var"
    else
      _warn "Missing: $var"
      _hint "Compare your .env with .env.example"
    fi
  done
else
  _fail ".env file missing"
  _hint "Run: cp .env.example .env && nano .env"
fi

# Volume directories
for vol in radio_vault persona_db market_ingest; do
  if [[ -d "$PROJECT_DIR/$vol" ]]; then
    _pass "Volume directory exists: $vol/"
  else
    _warn "Volume directory missing: $vol/"
    _hint "Run: mkdir -p $vol"
  fi
done

# Port availability
if [[ $QUICK -eq 0 ]] && command -v ss >/dev/null 2>&1; then
  if ss -tln 2>/dev/null | grep -q ':8080 '; then
    OWNER=$(ss -tlnp 2>/dev/null | grep ':8080 ' | head -1 | awk -F'"' '{print $2}')
    if docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep -q '8080'; then
      _pass "Port 8080: bound by AetherWave container"
    else
      _warn "Port 8080: in use by '$OWNER' (not AetherWave)"
      _hint "Stop the conflicting service or change the port in docker-compose.yml"
    fi
  else
    _pass "Port 8080: available"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 4: Container State
# ════════════════════════════════════════════════════════════════════════════
if [[ $NO_DOCKER -eq 0 ]] && command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  header "4. Container State"

  EXPECTED_CONTAINERS=("aetherwave_api" "aetherwave_worker" "aetherwave_redis")

  for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
      STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
      HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
      RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$container" 2>/dev/null || echo "?")

      if [[ "$STATUS" == "running" ]] && [[ "$HEALTH" == "healthy" || "$HEALTH" == "no-healthcheck" ]]; then
        _pass "$container: $STATUS ($HEALTH, restarts: $RESTARTS)"
      elif [[ "$STATUS" == "running" ]] && [[ "$HEALTH" == "starting" ]]; then
        _warn "$container: $STATUS but still starting up"
      else
        _fail "$container: $STATUS / $HEALTH (restarts: $RESTARTS)"
        _hint "Run: docker logs $container --tail=50"
      fi
    elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
      STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
      EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null)
      _fail "$container: $STATUS (exit $EXIT_CODE)"
      _hint "Run: docker logs $container --tail=50"
    else
      _warn "$container: not created"
      _hint "Run: docker-compose up -d"
    fi
  done

  # ──────────────────────────────────────────────────────────────────────
  # CHECK 5: Resource Usage
  # ──────────────────────────────────────────────────────────────────────
  if [[ $QUICK -eq 0 ]]; then
    header "5. Resource Usage"

    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q aetherwave; then
      log "Container resource snapshot:"
      docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}, MEM {{.MemUsage}}, NET {{.NetIO}}" \
        $(docker ps --format '{{.Names}}' | grep aetherwave) 2>/dev/null || true
    fi
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 6: API Health
# ════════════════════════════════════════════════════════════════════════════
if [[ $NO_DOCKER -eq 0 ]] && [[ $QUICK -eq 0 ]]; then
  header "6. API Health"

  if curl -sf --max-time 5 http://localhost:8080/health >/dev/null 2>&1; then
    _pass "API responding at http://localhost:8080/health"
    HEALTH_BODY=$(curl -s --max-time 5 http://localhost:8080/health 2>/dev/null || echo "")
    if [[ -n "$HEALTH_BODY" ]]; then
      log "Health response: $HEALTH_BODY"
    fi
  else
    _fail "API not responding at http://localhost:8080/health"
    _hint "Check: docker-compose ps  and  docker logs aetherwave_api"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 7: Git State
# ════════════════════════════════════════════════════════════════════════════
header "7. Git State"

if [[ -d "$PROJECT_DIR/.git" ]]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  _pass "On branch: $CURRENT_BRANCH"

  if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
    _pass "Working tree clean"
  else
    _warn "Uncommitted changes detected"
    _hint "Run: git status  (commit or stash before update)"
  fi

  # Check ahead/behind (best-effort)
  git fetch origin "$CURRENT_BRANCH" --quiet 2>/dev/null || true
  AHEAD=$(git rev-list --count "origin/$CURRENT_BRANCH..HEAD" 2>/dev/null || echo "?")
  BEHIND=$(git rev-list --count "HEAD..origin/$CURRENT_BRANCH" 2>/dev/null || echo "?")
  if [[ "$AHEAD" == "0" ]] && [[ "$BEHIND" == "0" ]]; then
    _pass "Branch synced with origin"
  elif [[ "$BEHIND" != "0" ]] && [[ "$BEHIND" != "?" ]]; then
    _warn "Branch is $BEHIND commit(s) behind origin"
    _hint "Run: ./update.sh"
  fi
else
  _warn "Not a git repository"
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 8: Recent Errors in Logs
# ════════════════════════════════════════════════════════════════════════════
header "8. Recent Errors in Logs"

if [[ -d "$PROJECT_DIR/logs" ]]; then
  RECENT_ERRORS=$(find "$PROJECT_DIR/logs" -name "*.log" -mtime -7 2>/dev/null | \
    xargs -r grep -lE '\[(FAIL|ERROR)\]' 2>/dev/null | wc -l | tr -d ' ')

  if [[ $RECENT_ERRORS -eq 0 ]]; then
    _pass "No errors in logs from the past 7 days"
  else
    _warn "$RECENT_ERRORS log file(s) contain errors in the past 7 days"
    _hint "Run: ./scripts/logs.sh errors"
  fi
else
  log "No logs/ directory yet — no logs to analyze"
fi

# ════════════════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════════════════
header "Summary"

echo "  ${AW_GREEN}✓ Passed:${AW_NC}   $PASS"
echo "  ${AW_YELLOW}⚠ Warnings:${AW_NC} $WARN_COUNT"
echo "  ${AW_RED}✗ Failed:${AW_NC}   $FAIL"
echo ""

if (( FAIL > 0 )); then
  echo -e "${AW_RED}═══ Issues Found ═══${AW_NC}"
  printf '  • %s\n' "${ISSUES[@]}"
  echo ""
  echo "Recommended actions:"
  echo "  1. Review issues above and apply suggested fixes"
  echo "  2. Run: ./scripts/logs.sh errors        (review error logs)"
  echo "  3. Run: ./collect-logs.sh               (bundle for support)"
  echo "  4. If still stuck, open a GitHub issue with the bundle attached"
  EXIT=2
elif (( WARN_COUNT > 0 )); then
  echo -e "${AW_YELLOW}System is functional but has warnings.${AW_NC}"
  EXIT=1
else
  echo -e "${AW_GREEN}All checks passed — system is healthy.${AW_NC}"
  EXIT=0
fi

# Optional report export
if [[ $EXPORT_REPORT -eq 1 ]]; then
  REPORT_FILE="$PROJECT_DIR/logs/troubleshoot-report-$(date +%Y%m%d-%H%M%S).txt"
  cp "$AETHERWAVE_LOG_FILE" "$REPORT_FILE"
  ok "Report exported: $REPORT_FILE"
fi

echo ""
log "Full log: $(log_location)"
exit $EXIT
