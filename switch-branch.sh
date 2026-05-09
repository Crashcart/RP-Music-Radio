#!/usr/bin/env bash
#
# AetherWave Branch Switcher (switch-branch.sh)
# ──────────────────────────────────────────────
# Cleanly switches between branches with proper environment reload.
# Stops services, switches, rebuilds if needed, and relaunches.
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

source "$PROJECT_DIR/scripts/lib/log.sh" 2>/dev/null || {
  # Fallback if log.sh not available
  log() { echo "ℹ️  $*"; }
  ok() { echo "✅ $*"; }
  err() { echo "❌ $*" >&2; }
  warn() { echo "⚠️  $*"; }
}

log_init "switch-branch" 2>/dev/null || true
trap 'log_finalize 2>/dev/null || true' EXIT

# ─── Help Command ──────────────────────────────────────────────────────────
show_help() {
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║        AetherWave Branch Switcher — switch-branch.sh          ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Cleanly switches between Git branches with service management,
  environment reload, and optional container rebuild.

USAGE:
  ./switch-branch.sh <branch> [OPTIONS]
  ./switch-branch.sh --help

BRANCHES SUPPORTED:
  main              Production (stable releases)
  alpha             Pre-release testing & features
  beta              Release candidates (RC)
  test              Staging (use alpha instead)
  dev               Development (use feature branches)
  Any remote branch Feature branches (claude/*, feat/*, etc.)

OPTIONS:
  --rebuild         Force rebuild Docker images
  --no-launch       Don't launch services after switch
  --help, -h        Show this help message

EXAMPLES:
  # Switch to alpha and rebuild
  ./switch-branch.sh alpha --rebuild

  # Switch to feature branch without launching
  ./switch-branch.sh claude/copy-github-rules --no-launch

  # Switch to main and launch
  ./switch-branch.sh main

WORKFLOW:
  1. Validates clean working tree (no uncommitted changes)
  2. Stops running Docker services
  3. Fetches and checks out branch
  4. Updates .env LOG_LEVEL based on branch
  5. Rebuilds or pulls Docker images
  6. Launches services (unless --no-launch)

NOTES:
  • Uncommitted changes must be committed/stashed first
  • Services stop during switch (downtime ~10-30 seconds)
  • With --rebuild, first build may take 5+ minutes
  • Feature branches auto-rebuild

HELP_EOF
}

# ─── Argument Parsing ──────────────────────────────────────────────────────
if [[ $# -lt 1 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  show_help
  exit 0
fi

BRANCH="$1"
shift || true
REBUILD=0
NO_LAUNCH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild)    REBUILD=1; shift ;;
    --no-launch)  NO_LAUNCH=1; shift ;;
    --help|-h)    show_help; exit 0 ;;
    *) err "Unknown argument: $1 (use --help for usage)"; exit 1 ;;
  esac
done

# ─── Validate Branch Exists ────────────────────────────────────────────────
log "Validating branch: $BRANCH"

BRANCH_EXISTS=0
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
  BRANCH_EXISTS=1
elif git ls-remote --heads origin "$BRANCH" 2>/dev/null | grep -q "$BRANCH"; then
  BRANCH_EXISTS=1
fi

if [[ $BRANCH_EXISTS -eq 0 ]]; then
  err "Branch '$BRANCH' not found on remote origin"
  err ""
  err "Available branches:"
  git branch -r 2>/dev/null | grep origin/ | sed 's|origin/||' | grep -v HEAD | sort | sed 's/^/  /' || echo "  (Could not list branches)"
  exit 1
fi

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
docker-compose down 2>/dev/null || warn "Services already stopped (or docker-compose not available)"

# ─── Step 3: Fetch & switch ───────────────────────────────────────────────
log "Fetching origin/$BRANCH"
git fetch origin "$BRANCH" 2>/dev/null || warn "Fetch failed (offline?)"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  git pull origin "$BRANCH" 2>/dev/null || warn "Pull failed (offline?)"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
ok "On branch: $CURRENT_BRANCH"

# ─── Step 4: Update .env LOG_LEVEL ────────────────────────────────────────
if [[ -f .env ]]; then
  case "$BRANCH" in
    main)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=INFO/' .env
      log "Set LOG_LEVEL=INFO for production"
      ;;
    alpha)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      log "Set LOG_LEVEL=DEBUG for pre-release testing"
      ;;
    beta)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      log "Set LOG_LEVEL=DEBUG for release candidate"
      ;;
    test|dev)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      log "Set LOG_LEVEL=DEBUG for $BRANCH"
      ;;
    *)
      sed -i.bak 's/^LOG_LEVEL=.*/LOG_LEVEL=DEBUG/' .env
      log "Set LOG_LEVEL=DEBUG for feature branch"
      ;;
  esac
  rm -f .env.bak
fi

# ─── Step 5: Rebuild or pull ──────────────────────────────────────────────
if [[ $REBUILD -eq 1 ]] || [[ "$BRANCH" == "dev" ]] || [[ "$BRANCH" == "test" ]] || [[ "$BRANCH" == *"/"* ]]; then
  log "Rebuilding containers from source…"
  docker-compose build --no-cache 2>/dev/null || warn "Docker build failed or not available"
else
  log "Pulling pre-built images…"
  docker-compose pull 2>/dev/null || {
    warn "Pull failed; building instead"
    docker-compose build 2>/dev/null || warn "Docker not available"
  }
fi
ok "Images ready"

# ─── Step 6: Launch ───────────────────────────────────────────────────────
if [[ $NO_LAUNCH -eq 0 ]]; then
  log "Launching services on branch: $BRANCH"
  docker-compose up -d 2>/dev/null || warn "Could not launch services (docker-compose not available)"
  sleep 3
  docker-compose ps 2>/dev/null || warn "Could not list services"
else
  log "Services not launched (--no-launch flag)"
fi

echo ""
echo "═══ Branch Switch Complete ═══"
echo "✅ Active branch:  $CURRENT_BRANCH"
if [[ -d .git ]]; then
  COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "   Latest commit: $COMMIT"
fi
echo "🌐 Web UI:         http://localhost:8080 (if services running)"
echo ""
echo "Use --help for more options"
