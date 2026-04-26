#!/usr/bin/env bash
#
# AetherWave Full Installer (install-full.sh)
# --------------------------------------------
# Production-grade install with hardware detection, security hardening,
# and full pre-flight validation. For homelab deployment on Synology
# DS918+ / Beelink S12 Pro / Linux servers.
#
# Usage:
#   sudo ./install-full.sh [--branch <branch>] [--device <type>] [--non-interactive]
#
# Supported branches: main, test, dev
# Supported devices:  INTEL_QUICKSYNC, NVIDIA_CUDA, CPU_ONLY
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"

# ─── Source shared logging library ─────────────────────────────────────────
source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "install-full"
trap log_finalize EXIT

# Capture ALL output (including child processes like docker, git) into the log
# in addition to the structured messages from log/ok/warn/err.
exec > >(tee -a "$AETHERWAVE_LOG_FILE")
exec 2>&1

# ─── Defaults ──────────────────────────────────────────────────────────────
BRANCH="main"
DEVICE_TYPE=""
NON_INTERACTIVE=0
LOG_FILE="$AETHERWAVE_LOG_FILE"

# Color refs for inline messages
RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; PURPLE="$AW_PURPLE"; NC="$AW_NC"

# ─── Argument Parsing ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)          BRANCH="$2"; shift 2 ;;
    --device)          DEVICE_TYPE="$2"; shift 2 ;;
    --non-interactive) NON_INTERACTIVE=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

header "AetherWave Full Installer"
log "Log file: $LOG_FILE"

# ─── Phase 1: Pre-flight Checks ────────────────────────────────────────────
header "Phase 1: Pre-flight Checks"

# Check root/sudo
if [[ $EUID -ne 0 ]]; then
  warn "Not running as root. Some checks (firewall, system limits) may be skipped."
fi

# Check OS
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  log "OS: $PRETTY_NAME"
else
  warn "Unknown OS — proceeding with caution"
fi

# Check disk space (need ≥ 50 GB free)
FREE_GB=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {gsub("G",""); print $4}')
if (( FREE_GB < 50 )); then
  warn "Only ${FREE_GB}GB free; recommend ≥ 50 GB for radio_vault output"
else
  ok "Disk space: ${FREE_GB}GB available"
fi

# Check RAM (need ≥ 4 GB)
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}' || echo 0)
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
if (( TOTAL_RAM_GB < 4 )); then
  err "Insufficient RAM: ${TOTAL_RAM_GB}GB (need ≥ 4 GB)"
  exit 1
else
  ok "RAM: ${TOTAL_RAM_GB}GB available"
fi

# Check Docker
command -v docker >/dev/null 2>&1 || { err "Docker not installed"; exit 1; }
docker info >/dev/null 2>&1 || { err "Docker daemon not running. Run: sudo systemctl start docker"; exit 1; }
ok "Docker is installed and running"

# Check docker-compose
command -v docker-compose >/dev/null 2>&1 || command -v "docker compose" >/dev/null 2>&1 || {
  err "docker-compose not found"
  exit 1
}
ok "docker-compose available"

# Validate branch
case "$BRANCH" in
  main|test|dev) ok "Selected branch: $BRANCH" ;;
  *) err "Invalid branch '$BRANCH'. Supported: main, test, dev"; exit 1 ;;
esac

# ─── Phase 2: Hardware Detection ───────────────────────────────────────────
header "Phase 2: Hardware Detection"

if [[ -z "$DEVICE_TYPE" ]]; then
  log "Auto-detecting hardware acceleration…"

  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    DEVICE_TYPE="NVIDIA_CUDA"
    ok "Detected NVIDIA GPU"
  elif [[ -e /dev/dri/renderD128 ]]; then
    DEVICE_TYPE="INTEL_QUICKSYNC"
    ok "Detected Intel QuickSync"
  else
    DEVICE_TYPE="CPU_ONLY"
    warn "No GPU detected; falling back to CPU_ONLY (synthesis will be slower)"
  fi
fi

log "Device type: $DEVICE_TYPE"

# ─── Phase 3: Branch Sync ──────────────────────────────────────────────────
header "Phase 3: Branch Sync"

log "Switching to branch: $BRANCH"
git fetch origin "$BRANCH" || warn "Fetch failed (offline?)"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  git pull origin "$BRANCH" || warn "Pull failed"
else
  git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || \
    warn "Branch $BRANCH does not exist remotely; staying on current"
fi

ok "On branch: $(git rev-parse --abbrev-ref HEAD)"

# ─── Phase 4: Volume Setup ─────────────────────────────────────────────────
header "Phase 4: Volume Setup"

for vol in radio_vault persona_db market_ingest redis_data data; do
  mkdir -p "$PROJECT_DIR/$vol"
  chmod 755 "$PROJECT_DIR/$vol"
  ok "Created: $vol/"
done

# ─── Phase 5: Environment Configuration ────────────────────────────────────
header "Phase 5: Environment Configuration"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  ok "Created .env from template"
fi

# Update DEVICE_TYPE in .env
if grep -q "^DEVICE_TYPE=" "$PROJECT_DIR/.env"; then
  sed -i.bak "s|^DEVICE_TYPE=.*|DEVICE_TYPE=$DEVICE_TYPE|" "$PROJECT_DIR/.env"
  rm -f "$PROJECT_DIR/.env.bak"
  ok "Set DEVICE_TYPE=$DEVICE_TYPE"
fi

# Prompt for API key if interactive
if [[ $NON_INTERACTIVE -eq 0 ]] && grep -q "your-api-key-here" "$PROJECT_DIR/.env"; then
  echo ""
  read -rp "Enter your Google Cloud API key (or press Enter to skip): " API_KEY
  if [[ -n "$API_KEY" ]]; then
    sed -i.bak "s|^GOOGLE_API_KEY=.*|GOOGLE_API_KEY=$API_KEY|" "$PROJECT_DIR/.env"
    rm -f "$PROJECT_DIR/.env.bak"
    chmod 600 "$PROJECT_DIR/.env"
    ok "Stored API key in .env (mode 0600)"
  else
    warn "API key not set — edit .env before launching"
  fi
else
  warn "Edit .env manually to set GOOGLE_API_KEY"
fi

# ─── Phase 6: Image Build / Pull ───────────────────────────────────────────
header "Phase 6: Docker Image Setup"

case "$BRANCH" in
  main)
    log "Pulling pre-built production images…"
    docker-compose pull 2>/dev/null || {
      warn "Pull failed; falling back to build"
      docker-compose build
    }
    ;;
  test)
    log "Pulling test/staging images…"
    docker-compose pull 2>/dev/null || docker-compose build
    ;;
  dev)
    log "Building from source (dev mode)…"
    docker-compose build --no-cache
    ;;
esac
ok "Docker images ready"

# ─── Phase 7: Security Hardening ───────────────────────────────────────────
header "Phase 7: Security Hardening"

# Ensure .env is not world-readable
chmod 600 "$PROJECT_DIR/.env" 2>/dev/null && ok ".env permissions: 0600"

# Ensure persona_db is not world-readable (contains voice seeds)
chmod 700 "$PROJECT_DIR/persona_db" && ok "persona_db permissions: 0700"

# Validate compose file
if docker-compose config >/dev/null 2>&1; then
  ok "docker-compose.yml is valid"
else
  err "docker-compose.yml has syntax errors"
  exit 1
fi

# ─── Phase 8: Launch Services ──────────────────────────────────────────────
header "Phase 8: Launching Services"

if [[ $NON_INTERACTIVE -eq 0 ]]; then
  read -rp "Launch AetherWave now? [Y/n]: " LAUNCH_NOW
  LAUNCH_NOW="${LAUNCH_NOW:-Y}"
else
  LAUNCH_NOW="Y"
fi

if [[ "$LAUNCH_NOW" =~ ^[Yy]$ ]]; then
  log "Starting services…"
  docker-compose up -d
  sleep 5
  docker-compose ps
  ok "Services launched"

  log "Waiting for API to become healthy…"
  for i in {1..30}; do
    if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
      ok "API is healthy"
      break
    fi
    sleep 2
  done
else
  log "Skipping launch — run 'docker-compose up -d' when ready"
fi

# ─── Phase 9: Final Summary ────────────────────────────────────────────────
header "Installation Complete"

echo "Branch:        ${GREEN}$BRANCH${NC}"
echo "Device:        ${GREEN}$DEVICE_TYPE${NC}"
echo "Project dir:   ${BLUE}$PROJECT_DIR${NC}"
echo "Log file:      ${BLUE}$LOG_FILE${NC}"
echo ""
echo "Endpoints:"
echo "  • Web UI:     ${YELLOW}http://localhost:8080${NC}"
echo "  • Health:     ${YELLOW}http://localhost:8080/health${NC}"
echo "  • API docs:   ${YELLOW}http://localhost:8080/docs${NC}"
echo ""
echo "Generated content will appear in: ${BLUE}$PROJECT_DIR/radio_vault/${NC}"
echo ""
echo "Useful commands:"
echo "  • View logs:  ${YELLOW}docker-compose logs -f${NC}"
echo "  • Restart:    ${YELLOW}docker-compose restart${NC}"
echo "  • Stop:       ${YELLOW}docker-compose down${NC}"
echo "  • Uninstall:  ${YELLOW}./uninstall.sh${NC}"
echo "  • Diagnostics: ${YELLOW}./collect-logs.sh${NC}"
echo ""
