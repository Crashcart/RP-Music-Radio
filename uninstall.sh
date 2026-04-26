#!/usr/bin/env bash
#
# AetherWave Uninstaller (uninstall.sh)
# --------------------------------------
# Cleanly removes containers, volumes, and optionally generated content.
# By default, preserves radio_vault/ and persona_db/ to protect generated work.
#
# Usage:
#   ./uninstall.sh [--purge] [--keep-images] [--non-interactive]
#
#   --purge            Also remove radio_vault/, persona_db/, market_ingest/
#   --keep-images      Don't remove pulled Docker images
#   --non-interactive  Skip confirmation prompts
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_ARGS="$*"

source "$PROJECT_DIR/scripts/lib/log.sh"
log_init "uninstall"
trap log_finalize EXIT

PURGE=0
KEEP_IMAGES=0
NON_INTERACTIVE=0

RED="$AW_RED"; GREEN="$AW_GREEN"; YELLOW="$AW_YELLOW"; BLUE="$AW_BLUE"; NC="$AW_NC"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge)           PURGE=1; shift ;;
    --keep-images)     KEEP_IMAGES=1; shift ;;
    --non-interactive) NON_INTERACTIVE=1; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

cd "$PROJECT_DIR"

echo ""
echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo -e "${RED}  AetherWave Uninstaller${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo ""

if [[ $PURGE -eq 1 ]]; then
  warn "PURGE MODE — radio_vault/, persona_db/, market_ingest/ will be DELETED"
fi
if [[ $KEEP_IMAGES -eq 0 ]]; then
  warn "Docker images will be removed"
fi

if [[ $NON_INTERACTIVE -eq 0 ]]; then
  read -rp "Proceed with uninstall? [y/N]: " CONFIRM
  CONFIRM="${CONFIRM:-N}"
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    log "Aborted by user"
    exit 0
  fi
fi

# ─── Step 1: Stop & Remove Containers ──────────────────────────────────────
log "Stopping containers…"
if [[ $PURGE -eq 1 ]]; then
  docker-compose down -v --remove-orphans 2>/dev/null || warn "docker-compose down failed (already down?)"
else
  docker-compose down --remove-orphans 2>/dev/null || warn "docker-compose down failed (already down?)"
fi
ok "Containers stopped"

# ─── Step 2: Remove Images ─────────────────────────────────────────────────
if [[ $KEEP_IMAGES -eq 0 ]]; then
  log "Removing Docker images…"
  docker images --filter "reference=aetherwave/*" -q | xargs -r docker rmi -f 2>/dev/null || true
  docker images --filter "reference=*aetherwave*" -q | xargs -r docker rmi -f 2>/dev/null || true
  ok "Images removed"
fi

# ─── Step 3: Purge Generated Content ───────────────────────────────────────
if [[ $PURGE -eq 1 ]]; then
  log "Purging generated content…"
  for dir in radio_vault persona_db market_ingest redis_data; do
    if [[ -d "$PROJECT_DIR/$dir" ]]; then
      rm -rf "$PROJECT_DIR/$dir"
      ok "Removed: $dir/"
    fi
  done

  if [[ -f "$PROJECT_DIR/.env" ]]; then
    rm -f "$PROJECT_DIR/.env"
    ok "Removed: .env"
  fi
else
  log "Preserving generated content (use --purge to remove)"
  log "  • radio_vault/   (generated MP3s)"
  log "  • persona_db/    (Voice DNA seeds)"
  log "  • market_ingest/ (uploaded CSVs)"
  log "  • .env           (configuration)"
fi

# ─── Step 4: Cleanup Networks ──────────────────────────────────────────────
log "Cleaning up Docker networks…"
docker network ls --filter "name=aetherwave" -q | xargs -r docker network rm 2>/dev/null || true
ok "Networks cleaned"

echo ""
echo -e "${GREEN}═══ Uninstall Complete ═══${NC}"
echo ""
if [[ $PURGE -eq 0 ]]; then
  echo "Generated content preserved. To remove everything:"
  echo "  ${YELLOW}./uninstall.sh --purge${NC}"
fi
echo ""
