#!/usr/bin/env bash
#
# AetherWave Diagnostic Log Collector (collect-logs.sh)
# ------------------------------------------------------
# Bundles container logs, system info, and configuration (with secrets redacted)
# into a single tarball for support troubleshooting.
#
# Usage:
#   ./collect-logs.sh [--output <file>] [--no-redact]
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"

source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "collect-logs"
trap log_finalize EXIT

OUTPUT="aetherwave-logs-$(date +%Y%m%d-%H%M%S).tar.gz"
NO_REDACT=0

RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; NC="$AW_NC"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)    OUTPUT="$2"; shift 2 ;;
    --no-redact) NO_REDACT=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) shift ;;
  esac
done

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

log "Collecting diagnostics into: $TMPDIR"

# ─── System Info ───────────────────────────────────────────────────────────
{
  echo "=== System Info ==="
  date
  uname -a
  echo ""
  echo "=== OS Release ==="
  cat /etc/os-release 2>/dev/null || echo "Unknown OS"
  echo ""
  echo "=== Memory ==="
  free -h 2>/dev/null || vm_stat 2>/dev/null || echo "N/A"
  echo ""
  echo "=== Disk ==="
  df -h "$PROJECT_DIR" 2>/dev/null || echo "N/A"
  echo ""
  echo "=== Docker Version ==="
  docker version 2>/dev/null || echo "Docker not available"
  echo ""
  echo "=== Docker Compose Version ==="
  docker-compose version 2>/dev/null || echo "docker-compose not available"
  echo ""
  echo "=== Git Status ==="
  git -C "$PROJECT_DIR" status 2>/dev/null || echo "Not a git repo"
  echo ""
  echo "=== Git Branch ==="
  git -C "$PROJECT_DIR" branch -a 2>/dev/null || echo "Not a git repo"
  echo ""
  echo "=== Git Log (last 10) ==="
  git -C "$PROJECT_DIR" log --oneline -10 2>/dev/null || echo "Not a git repo"
} > "$TMPDIR/system-info.txt"
ok "System info collected"

# ─── Container Status ──────────────────────────────────────────────────────
{
  echo "=== docker-compose ps ==="
  docker-compose -f "$PROJECT_DIR/docker-compose.yml" ps 2>&1 || echo "Not running"
  echo ""
  echo "=== Container Stats ==="
  docker stats --no-stream 2>&1 || true
} > "$TMPDIR/container-status.txt"
ok "Container status collected"

# ─── Container Logs ────────────────────────────────────────────────────────
mkdir -p "$TMPDIR/logs"
for service in aetherwave_api aetherwave_worker aetherwave_redis; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${service}$"; then
    docker logs "$service" > "$TMPDIR/logs/${service}.log" 2>&1 || true
    ok "Logs collected: $service"
  fi
done

# ─── Configuration (Redacted) ──────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/.env" ]]; then
  if [[ $NO_REDACT -eq 1 ]]; then
    cp "$PROJECT_DIR/.env" "$TMPDIR/env.txt"
    warn "API keys NOT redacted (--no-redact)"
  else
    sed -E 's/(API_KEY|SECRET|TOKEN|PASSWORD)=.*/\1=***REDACTED***/gi' \
      "$PROJECT_DIR/.env" > "$TMPDIR/env.txt"
    ok "Configuration collected (secrets redacted)"
  fi
fi

# ─── Compose Config ────────────────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
  cp "$PROJECT_DIR/docker-compose.yml" "$TMPDIR/docker-compose.yml"
  docker-compose -f "$PROJECT_DIR/docker-compose.yml" config \
    > "$TMPDIR/docker-compose-resolved.yml" 2>&1 || true
  ok "Compose config collected"
fi

# ─── Volume Listing (no contents) ──────────────────────────────────────────
{
  echo "=== radio_vault/ contents ==="
  ls -lh "$PROJECT_DIR/radio_vault/" 2>/dev/null | head -50 || echo "Empty/missing"
  echo ""
  echo "=== persona_db/ contents (filenames only) ==="
  ls -lh "$PROJECT_DIR/persona_db/" 2>/dev/null | head -50 || echo "Empty/missing"
  echo ""
  echo "=== market_ingest/ contents ==="
  ls -lh "$PROJECT_DIR/market_ingest/" 2>/dev/null | head -50 || echo "Empty/missing"
} > "$TMPDIR/volume-listing.txt"
ok "Volume listings collected"

# ─── Recent Install Log (legacy location) ──────────────────────────────────
LATEST_INSTALL_LOG=$(ls -t "$PROJECT_DIR"/install-full-*.log 2>/dev/null | head -1 || true)
if [[ -n "$LATEST_INSTALL_LOG" ]]; then
  cp "$LATEST_INSTALL_LOG" "$TMPDIR/install-log.txt"
  ok "Install log included (legacy): $(basename "$LATEST_INSTALL_LOG")"
fi

# ─── Centralized Logs (logs/ directory) ────────────────────────────────────
if [[ -d "$PROJECT_DIR/logs" ]]; then
  mkdir -p "$TMPDIR/aetherwave-logs"
  # Grab the latest log per script (last 30 days only to keep bundle small)
  while IFS= read -r f; do
    cp "$f" "$TMPDIR/aetherwave-logs/" 2>/dev/null || true
  done < <(find "$PROJECT_DIR/logs" -name "*.log" -mtime -30 -type f 2>/dev/null)
  COUNT=$(ls -1 "$TMPDIR/aetherwave-logs/" 2>/dev/null | wc -l | tr -d ' ')
  ok "Centralized logs included: $COUNT file(s)"

  # Also extract a summary of errors across all logs
  {
    echo "=== Error Summary (last 30 days) ==="
    find "$PROJECT_DIR/logs" -name "*.log" -mtime -30 -type f 2>/dev/null -exec \
      grep -HnE '\[(FAIL|ERROR)\]|exception|traceback' {} \; 2>/dev/null | head -100
  } > "$TMPDIR/error-summary.txt"
  ok "Error summary generated"
fi

# ─── Run Troubleshoot Snapshot ─────────────────────────────────────────────
if [[ -x "$PROJECT_DIR/scripts/troubleshoot.sh" ]]; then
  log "Running troubleshoot snapshot…"
  "$PROJECT_DIR/scripts/troubleshoot.sh" --quick --no-docker > "$TMPDIR/troubleshoot-snapshot.txt" 2>&1 || true
  ok "Troubleshoot snapshot collected"
fi

# ─── Bundle Tarball ────────────────────────────────────────────────────────
log "Creating tarball…"
tar -czf "$PROJECT_DIR/$OUTPUT" -C "$TMPDIR" .
ok "Tarball created: $PROJECT_DIR/$OUTPUT"

echo ""
echo -e "${GREEN}═══ Collection Complete ═══${NC}"
echo ""
echo "Bundle:  ${BLUE}$PROJECT_DIR/$OUTPUT${NC}"
echo "Size:    $(du -h "$PROJECT_DIR/$OUTPUT" | cut -f1)"
echo ""
echo "Attach this file when reporting issues."
echo ""
