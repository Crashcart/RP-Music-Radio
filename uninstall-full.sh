#!/usr/bin/env bash
#
# AetherWave Complete Uninstaller (uninstall-full.sh)
# ----------------------------------------------------
# Performs a TOTAL removal of AetherWave from the system. Unlike uninstall.sh
# (which preserves data by default), this script removes EVERYTHING:
#   • Docker containers, images, volumes, networks
#   • All generated content (radio_vault, persona_db, market_ingest, data, backups)
#   • Configuration (.env, install logs)
#   • Optionally: cloned git repository
#
# Usage:
#   ./uninstall-full.sh [--keep-repo] [--non-interactive] [--backup-vault]
#
# Flags:
#   --keep-repo         Keep the git repository (default: keep)
#   --remove-repo       Also delete the cloned repository (DANGEROUS)
#   --backup-vault      Tar up radio_vault before deletion
#   --non-interactive   Skip all confirmation prompts (use with caution)
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"

source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "uninstall-full"
trap log_finalize EXIT

KEEP_REPO=1
REMOVE_REPO=0
NON_INTERACTIVE=0
BACKUP_VAULT=0

RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; PURPLE="$AW_PURPLE"; NC="$AW_NC"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-repo)       KEEP_REPO=1; REMOVE_REPO=0; shift ;;
    --remove-repo)     REMOVE_REPO=1; KEEP_REPO=0; shift ;;
    --backup-vault)    BACKUP_VAULT=1; shift ;;
    --non-interactive) NON_INTERACTIVE=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

cd "$PROJECT_DIR"

# ─── Big Loud Warning ──────────────────────────────────────────────────────
echo ""
echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║       ⚠   AETHERWAVE COMPLETE UNINSTALLER   ⚠         ║${NC}"
echo -e "${RED}║                                                       ║${NC}"
echo -e "${RED}║  This will remove EVERYTHING:                         ║${NC}"
echo -e "${RED}║    • All Docker containers, images, volumes           ║${NC}"
echo -e "${RED}║    • Generated MP3s in radio_vault/                   ║${NC}"
echo -e "${RED}║    • Voice DNA seeds in persona_db/                   ║${NC}"
echo -e "${RED}║    • All configuration (.env)                         ║${NC}"
if [[ $REMOVE_REPO -eq 1 ]]; then
echo -e "${RED}║    • The cloned git repository                        ║${NC}"
fi
echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ $NON_INTERACTIVE -eq 0 ]]; then
  read -rp "Type 'DELETE EVERYTHING' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "DELETE EVERYTHING" ]]; then
    log "Aborted by user (good call)"
    exit 0
  fi
fi

# ─── Phase 1: Optional Backup ──────────────────────────────────────────────
if [[ $BACKUP_VAULT -eq 1 ]] && [[ -d "$PROJECT_DIR/radio_vault" ]]; then
  header "Phase 1: Backup radio_vault/"
  BACKUP_FILE="$HOME/aetherwave-vault-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$BACKUP_FILE" -C "$PROJECT_DIR" radio_vault persona_db 2>/dev/null || warn "Backup partially failed"
  if [[ -f "$BACKUP_FILE" ]]; then
    ok "Backup created: $BACKUP_FILE"
    log "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
  fi
fi

# ─── Phase 2: Stop & Remove Containers ─────────────────────────────────────
header "Phase 2: Stop & Remove Containers"
log "Stopping all aetherwave containers…"
docker-compose down -v --remove-orphans --rmi all 2>/dev/null || warn "Some compose teardown steps failed"

for container in aetherwave_api aetherwave_worker aetherwave_redis; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
    docker rm -f "$container" 2>/dev/null && ok "Removed container: $container" || true
  fi
done

# ─── Phase 3: Remove Images ────────────────────────────────────────────────
header "Phase 3: Remove Docker Images"
log "Removing all aetherwave images…"
IMAGES=$(docker images --filter "reference=aetherwave/*" -q 2>/dev/null || true)
if [[ -n "$IMAGES" ]]; then
  echo "$IMAGES" | xargs -r docker rmi -f 2>/dev/null || true
  ok "Removed aetherwave/* images"
fi
IMAGES=$(docker images --filter "reference=*aetherwave*" -q 2>/dev/null || true)
if [[ -n "$IMAGES" ]]; then
  echo "$IMAGES" | xargs -r docker rmi -f 2>/dev/null || true
  ok "Removed *aetherwave* images"
fi

# Remove dangling images from build cache
docker image prune -f 2>/dev/null || true
ok "Pruned dangling images"

# ─── Phase 4: Remove Volumes ───────────────────────────────────────────────
header "Phase 4: Remove Docker Volumes"
VOLS=$(docker volume ls --filter "name=aetherwave" -q 2>/dev/null || true)
if [[ -n "$VOLS" ]]; then
  echo "$VOLS" | xargs -r docker volume rm -f 2>/dev/null || true
  ok "Removed Docker volumes"
fi

# ─── Phase 5: Remove Networks ──────────────────────────────────────────────
header "Phase 5: Remove Docker Networks"
NETS=$(docker network ls --filter "name=aetherwave" -q 2>/dev/null || true)
if [[ -n "$NETS" ]]; then
  echo "$NETS" | xargs -r docker network rm 2>/dev/null || true
  ok "Removed Docker networks"
fi

# ─── Phase 6: Purge Host Volumes ───────────────────────────────────────────
header "Phase 6: Purge Generated Content"
for dir in radio_vault persona_db market_ingest redis_data data backups; do
  if [[ -d "$PROJECT_DIR/$dir" ]]; then
    rm -rf "$PROJECT_DIR/$dir" 2>/dev/null || \
      sudo rm -rf "$PROJECT_DIR/$dir" 2>/dev/null || \
      docker run --rm -v "$PROJECT_DIR:/app" alpine rm -rf "/app/$dir" 2>/dev/null || \
      warn "Could not fully remove $dir/ (permission denied)"
    ok "Removed: $dir/"
  fi
done

# ─── Phase 7: Remove Configuration ─────────────────────────────────────────
header "Phase 7: Remove Configuration"
for f in .env .env.local install-full-*.log aetherwave-logs-*.tar.gz; do
  shopt -s nullglob
  for match in $PROJECT_DIR/$f; do
    if [[ -f "$match" ]]; then
      rm -f "$match"
      ok "Removed: $(basename "$match")"
    fi
  done
  shopt -u nullglob
done

# ─── Phase 8: Optional Repo Removal ────────────────────────────────────────
if [[ $REMOVE_REPO -eq 1 ]]; then
  header "Phase 8: Remove Git Repository"
  if [[ $NON_INTERACTIVE -eq 0 ]]; then
    read -rp "Really delete $PROJECT_DIR? [y/N]: " CONFIRM_REPO
    CONFIRM_REPO="${CONFIRM_REPO:-N}"
    if [[ ! "$CONFIRM_REPO" =~ ^[Yy]$ ]]; then
      warn "Repository deletion skipped"
      REMOVE_REPO=0
    fi
  fi

  if [[ $REMOVE_REPO -eq 1 ]]; then
    PARENT_DIR="$(dirname "$PROJECT_DIR")"
    cd "$PARENT_DIR"
    rm -rf "$PROJECT_DIR"
    ok "Repository deleted: $PROJECT_DIR"
    echo ""
    echo -e "${GREEN}═══ Total Annihilation Complete ═══${NC}"
    echo ""
    exit 0
  fi
fi

# ─── Final Summary ─────────────────────────────────────────────────────────
header "Uninstall Complete"

echo "Removed:"
echo "  ✓ Docker containers, images, volumes, networks"
echo "  ✓ radio_vault/ persona_db/ market_ingest/ redis_data/ data/ backups/"
echo "  ✓ .env and install logs"
echo ""
if [[ $KEEP_REPO -eq 1 ]]; then
  echo "Preserved:"
  echo "  • Git repository at: ${BLUE}$PROJECT_DIR${NC}"
  echo ""
  echo "To reinstall: ${YELLOW}./install.sh${NC}"
fi

if [[ $BACKUP_VAULT -eq 1 ]]; then
  echo ""
  echo "Backup saved to: ${GREEN}$BACKUP_FILE${NC}"
fi
echo ""
