#!/usr/bin/env bash
#
# AetherWave Branch Switcher (switch-branch.sh)
# ----------------------------------------------
# Cleanly switches between main, test, and dev branches with proper
# environment reload. Stops services, switches, rebuilds if needed,
# and relaunches.
#
# Usage:
#   ./switch-branch.sh <branch> [--rebuild] [--no-launch]
#
# Branches: main (production), test (staging), dev (development)
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"
cd "$PROJECT_DIR"

source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "switch-branch"
trap log_finalize EXIT

RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; NC="$AW_NC"

if [[ $# -lt 1 ]]; then
  err "Usage: ./switch-branch.sh <branch> [--rebuild] [--no-launch]"
  exit 1
fi

BRANCH="$1"
shift
REBUILD=0
NO_LAUNCH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild)    REBUILD=1; shift ;;
    --no-launch)  NO_LAUNCH=1; shift ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

case "$BRANCH" in
  main|test|dev) ;;
  *) err "Invalid branch '$BRANCH'. Use: main, test, dev"; exit 1 ;;
esac

log "Switching to branch: $BRANCH"

# ─── Step 1: Ensure clean working tree ─────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  err "Uncommitted changes detected. Commit or stash before switching."
  git status --short
  exit 1
fi
ok "Working tree clean"

# ─── Step 2: Stop running services ─────────────────────────────────────────
log "Stopping current services…"
docker-compose down 2>/dev/null || warn "Services already stopped"

# ─── Step 3: Fetch & switch ────────────────────────────────────────────────
log "Fetching origin/$BRANCH"
git fetch origin "$BRANCH" || warn "Fetch failed (offline?)"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  git pull origin "$BRANCH" || warn "Pull failed (offline?)"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi
ok "On branch: $(git rev-parse --abbrev-ref HEAD)"

# ─── Step 4: Update DEVICE_TYPE / branch-aware config ──────────────────────
if [[ -f .env ]]; then
  case "$BRANCH" in
    main)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=INFO/' .env
      ;;
    test)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      ;;
    dev)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      ;;
  esac
  rm -f .env.bak
  ok "Updated .env LOG_LEVEL for $BRANCH"
fi

# ─── Step 5: Rebuild or pull ───────────────────────────────────────────────
if [[ $REBUILD -eq 1 ]] || [[ "$BRANCH" == "dev" ]]; then
  log "Rebuilding containers from source…"
  docker-compose build --no-cache
else
  log "Pulling pre-built images…"
  docker-compose pull 2>/dev/null || {
    warn "Pull failed; building instead"
    docker-compose build
  }
fi
ok "Images ready"

# ─── Step 6: Launch ────────────────────────────────────────────────────────
if [[ $NO_LAUNCH -eq 0 ]]; then
  log "Launching services on branch: $BRANCH"
  docker-compose up -d
  sleep 3
  docker-compose ps
fi

echo ""
echo -e "${GREEN}═══ Branch Switch Complete ═══${NC}"
echo "Active branch:  ${GREEN}$BRANCH${NC}"
echo "Web UI:         ${YELLOW}http://localhost:8080${NC}"
echo ""
