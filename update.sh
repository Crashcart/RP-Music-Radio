#!/usr/bin/env bash
#
# AetherWave Updater (update.sh)
# -------------------------------
# Safely updates AetherWave to the latest version on the current branch.
# Handles git pull, image refresh, container recreation, and health checks.
# Preserves all generated content (radio_vault/, persona_db/).
#
# Usage:
#   ./update.sh [--branch <branch>] [--rebuild] [--skip-backup]
#               [--non-interactive] [--rollback-on-fail]
#
# Flags:
#   --branch <branch>     Switch to and update a specific branch (main/test/dev)
#   --rebuild             Force rebuild of Docker images (no cache)
#   --skip-backup         Skip pre-update SQLite backup
#   --non-interactive     No prompts (CI/cron mode)
#   --rollback-on-fail    Auto-rollback to previous commit if health check fails
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"
cd "$PROJECT_DIR"

source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "update"
trap log_finalize EXIT

RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; PURPLE="$AW_PURPLE"; NC="$AW_NC"

# ─── Defaults ──────────────────────────────────────────────────────────────
TARGET_BRANCH=""
REBUILD=0
SKIP_BACKUP=0
NON_INTERACTIVE=0
ROLLBACK_ON_FAIL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)            TARGET_BRANCH="$2"; shift 2 ;;
    --rebuild)           REBUILD=1; shift ;;
    --skip-backup)       SKIP_BACKUP=1; shift ;;
    --non-interactive)   NON_INTERACTIVE=1; shift ;;
    --rollback-on-fail)  ROLLBACK_ON_FAIL=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET_BRANCH="${TARGET_BRANCH:-$CURRENT_BRANCH}"

case "$TARGET_BRANCH" in
  main|test|dev|claude/*) ;;
  *)
    warn "Unusual target branch '$TARGET_BRANCH' — proceeding with caution"
    ;;
esac

header "AetherWave Updater"
log "Current branch: $CURRENT_BRANCH"
log "Target branch:  $TARGET_BRANCH"
log "Project dir:    $PROJECT_DIR"

# ─── Step 1: Check Working Tree ────────────────────────────────────────────
header "Step 1: Pre-flight Checks"

if ! git diff --quiet || ! git diff --cached --quiet; then
  err "Uncommitted changes detected. Commit or stash before updating:"
  git status --short
  exit 1
fi
ok "Working tree clean"

# Capture current commit (for rollback)
PREVIOUS_COMMIT=$(git rev-parse HEAD)
log "Current commit: $(git rev-parse --short HEAD)"

# ─── Step 2: Backup ────────────────────────────────────────────────────────
if [[ $SKIP_BACKUP -eq 0 ]]; then
  header "Step 2: Backup"
  BACKUP_DIR="$PROJECT_DIR/backups"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  # Backup SQLite database (if exists)
  for sqlite_file in backend/database.sqlite backend/data/aetherwave.db data/aetherwave.db; do
    if [[ -f "$PROJECT_DIR/$sqlite_file" ]]; then
      cp "$PROJECT_DIR/$sqlite_file" "$BACKUP_DIR/database-$TIMESTAMP.sqlite"
      ok "Database backup: backups/database-$TIMESTAMP.sqlite"
      break
    fi
  done

  # Backup persona_db (Voice DNA — irreplaceable)
  if [[ -d "$PROJECT_DIR/persona_db" ]] && [[ -n "$(ls -A "$PROJECT_DIR/persona_db" 2>/dev/null)" ]]; then
    tar -czf "$BACKUP_DIR/persona_db-$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" persona_db 2>/dev/null
    ok "Persona DB backup: backups/persona_db-$TIMESTAMP.tar.gz"
  fi

  # Backup .env
  if [[ -f "$PROJECT_DIR/.env" ]]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env.$TIMESTAMP"
    ok ".env backup: backups/.env.$TIMESTAMP"
  fi
fi

# ─── Step 3: Fetch & Switch ────────────────────────────────────────────────
header "Step 3: Fetch & Switch Branch"

log "Fetching origin…"
git fetch origin --prune

if [[ "$TARGET_BRANCH" != "$CURRENT_BRANCH" ]]; then
  log "Switching from $CURRENT_BRANCH → $TARGET_BRANCH"
  if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    git checkout "$TARGET_BRANCH"
  else
    git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
  fi
fi

# ─── Step 4: Pull Latest Changes ───────────────────────────────────────────
header "Step 4: Pull Latest Changes"

BEFORE_PULL=$(git rev-parse HEAD)
log "Pulling latest from origin/$TARGET_BRANCH…"
git pull origin "$TARGET_BRANCH"
AFTER_PULL=$(git rev-parse HEAD)

if [[ "$BEFORE_PULL" == "$AFTER_PULL" ]]; then
  ok "Already up to date — no new commits"
else
  COMMITS=$(git log --oneline "$BEFORE_PULL..$AFTER_PULL" | wc -l | tr -d ' ')
  ok "Pulled $COMMITS new commit(s)"
  echo ""
  echo "Recent changes:"
  git log --oneline "$BEFORE_PULL..$AFTER_PULL" | head -10 | sed 's/^/  • /'
  echo ""
fi

# ─── Step 5: Stop Services ─────────────────────────────────────────────────
header "Step 5: Stop Services"

log "Stopping running containers…"
docker-compose down 2>/dev/null || warn "Containers were not running"

# ─── Step 6: Update Images ─────────────────────────────────────────────────
header "Step 6: Update Docker Images"

if [[ $REBUILD -eq 1 ]] || [[ "$TARGET_BRANCH" == "dev" ]] || [[ "$BEFORE_PULL" != "$AFTER_PULL" ]]; then
  log "Rebuilding from source to apply new code…"
  docker-compose build
else
  log "Pulling latest images…"
  docker-compose pull 2>/dev/null || {
    warn "Pull failed; falling back to build"
    docker-compose build
  }
fi
ok "Images updated"

# ─── Step 7: Database Migrations ───────────────────────────────────────────
header "Step 7: Database Migrations"

if [[ -f "$PROJECT_DIR/backend/alembic.ini" ]]; then
  log "Running database migrations…"
  docker-compose run --rm aetherwave-api alembic upgrade head 2>/dev/null || \
    warn "Migrations failed or not yet configured (safe to ignore on first install)"
else
  log "No alembic.ini found — skipping migrations"
fi

# ─── Step 8: Launch & Health Check ─────────────────────────────────────────
header "Step 8: Launch & Health Check"

log "Starting services…"
docker-compose up -d
sleep 3

log "Waiting for API to become healthy…"
HEALTHY=0
for i in {1..30}; do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
  echo -n "."
done
echo ""

if [[ $HEALTHY -eq 1 ]]; then
  ok "API is healthy"
else
  err "API did not become healthy within 60 seconds"

  if [[ $ROLLBACK_ON_FAIL -eq 1 ]]; then
    warn "Rolling back to previous commit: $(git rev-parse --short "$PREVIOUS_COMMIT")"
    docker-compose down
    git reset --hard "$PREVIOUS_COMMIT"
    docker-compose pull 2>/dev/null || docker-compose build
    docker-compose up -d
    sleep 5
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
      ok "Rollback successful — service restored"
    else
      err "Rollback also failed — manual intervention required"
      log "Run: ./collect-logs.sh and report this issue"
    fi
    exit 1
  fi

  echo ""
  echo "Recent logs:"
  docker-compose logs --tail=30
  exit 1
fi

# ─── Step 9: Cleanup ───────────────────────────────────────────────────────
header "Step 9: Cleanup"

log "Pruning unused Docker images…"
docker image prune -f >/dev/null 2>&1 || true
ok "Cleaned up dangling images"

# Trim backups (keep last 10)
if [[ -d "$PROJECT_DIR/backups" ]]; then
  ls -t "$PROJECT_DIR/backups/" 2>/dev/null | tail -n +11 | \
    xargs -I{} rm -f "$PROJECT_DIR/backups/{}" 2>/dev/null || true
  ok "Trimmed backup retention to 10 most recent"
fi

# ─── Step 10: Final Summary ────────────────────────────────────────────────
header "Update Complete"

NEW_COMMIT=$(git rev-parse --short HEAD)

echo -e "Branch:         ${GREEN}$TARGET_BRANCH${NC}"
echo -e "Previous:       ${BLUE}$(git rev-parse --short "$PREVIOUS_COMMIT")${NC}"
echo -e "Now at:         ${GREEN}$NEW_COMMIT${NC}"
echo -e "Web UI:         ${YELLOW}http://localhost:8432${NC}"
echo -e "Health:         ${GREEN}OK${NC}"
echo ""

if [[ $SKIP_BACKUP -eq 0 ]]; then
  echo -e "Backups stored: ${BLUE}$PROJECT_DIR/backups/${NC}"
fi
echo ""
echo -e "View changes:   ${YELLOW}git log --oneline $PREVIOUS_COMMIT..HEAD${NC}"
echo -e "View logs:      ${YELLOW}docker-compose logs -f${NC}"
echo -e "Rollback:       ${YELLOW}git reset --hard $PREVIOUS_COMMIT && docker-compose up -d${NC}"
echo ""
