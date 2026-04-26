#!/usr/bin/env bash
#
# AetherWave Quick Installer (install.sh)
# ----------------------------------------
# Installs AetherWave on the current branch with minimal configuration.
# For production-ready deployment, use install-full.sh instead.
#
# Usage:
#   ./install.sh [--branch <branch>] [--no-pull] [--skip-deps]
#
# Supported branches: main, test, dev
# Default branch: main (production)
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"

# ─── Source shared logging library ─────────────────────────────────────────
source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "install"
trap log_finalize EXIT

# ─── Defaults ──────────────────────────────────────────────────────────────
BRANCH="main"
NO_PULL=0
SKIP_DEPS=0

# Color refs for inline messages (e.g., final tips)
RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; NC="$AW_NC"

# ─── Argument Parsing ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --no-pull)
      NO_PULL=1
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=1
      shift
      ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# ─── Validate Branch ───────────────────────────────────────────────────────
case "$BRANCH" in
  main|test|dev) ;;
  *)
    err "Invalid branch '$BRANCH'. Supported: main, test, dev"
    exit 1
    ;;
esac

header "AetherWave Quick Installer (branch: $BRANCH)"

# ─── Step 1: Check Prerequisites ───────────────────────────────────────────
log "Checking prerequisites…"

command -v docker >/dev/null 2>&1 || { err "Docker not installed. Install: https://docs.docker.com/get-docker/"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v "docker compose" >/dev/null 2>&1 || {
  err "docker-compose not found. Install: https://docs.docker.com/compose/install/"
  exit 1
}
command -v git >/dev/null 2>&1 || { err "git not installed."; exit 1; }
ok "All prerequisites present"

# ─── Step 2: Sync to Selected Branch ───────────────────────────────────────
if [[ $NO_PULL -eq 0 ]]; then
  log "Switching to branch: $BRANCH"
  git fetch origin "$BRANCH" 2>/dev/null || warn "Could not fetch $BRANCH (offline?)"
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git checkout "$BRANCH"
    git pull origin "$BRANCH" || warn "Pull failed (offline?)"
  else
    git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || \
      warn "Branch $BRANCH does not exist on remote; staying on current branch"
  fi
  ok "On branch: $(git rev-parse --abbrev-ref HEAD)"
else
  log "Skipping git pull (--no-pull)"
fi

# ─── Step 3: Create Volume Directories ─────────────────────────────────────
log "Creating host volume directories…"
mkdir -p "$PROJECT_DIR/radio_vault" "$PROJECT_DIR/persona_db" "$PROJECT_DIR/market_ingest" "$PROJECT_DIR/data" "$PROJECT_DIR/redis_data"
ok "Volumes ready: radio_vault/, persona_db/, market_ingest/, data/, redis_data/"

# ─── Step 4: Configure .env ────────────────────────────────────────────────
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  log "No .env file found — copying from .env.example"
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  warn "Edit .env and add your GOOGLE_API_KEY before launching"
else
  ok ".env file already present"
fi

# ─── Step 5: Pull Docker Images / Build ────────────────────────────────────
if [[ $SKIP_DEPS -eq 0 ]]; then
  log "Pulling/building Docker images…"
  if [[ "$BRANCH" == "dev" ]]; then
    log "Building from source (dev mode)"
    docker-compose build
  else
    docker-compose pull 2>/dev/null || docker-compose build
  fi
  ok "Docker images ready"
else
  log "Skipping image pull (--skip-deps)"
fi

# ─── Step 6: Final Instructions ────────────────────────────────────────────
header "Installation Complete"

echo "Next steps:"
echo ""
echo "  1. Edit .env and add your GOOGLE_API_KEY:"
echo "     ${YELLOW}nano $PROJECT_DIR/.env${NC}"
echo ""
echo "  2. Launch AetherWave:"
echo "     ${YELLOW}docker-compose up -d${NC}"
echo ""
echo "  3. Verify health:"
echo "     ${YELLOW}curl http://localhost:8080/health${NC}"
echo ""
echo "  4. Open the Drafting Table UI:"
echo "     ${YELLOW}http://localhost:8080${NC}"
echo ""
echo "Branch: ${GREEN}$BRANCH${NC}"
echo "Logs:   ${YELLOW}docker-compose logs -f${NC}"
echo "Stop:   ${YELLOW}docker-compose down${NC}"
echo ""
