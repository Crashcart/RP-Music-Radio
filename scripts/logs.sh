#!/usr/bin/env bash
#
# AetherWave Log Manager (scripts/logs.sh)
# -----------------------------------------
# View, tail, search, and manage logs created by AetherWave scripts and
# Docker containers. Single entry point for all log-related operations.
#
# Usage:
#   ./scripts/logs.sh <command> [options]
#
# Commands:
#   list                    List all log files (sorted by date)
#   tail <script>           Tail the latest log for <script>
#   show <script>           Show full content of latest log for <script>
#   docker [service]        Show docker logs (all or specific service)
#   search <pattern>        Search all logs for a pattern
#   errors                  Show recent errors across all logs
#   clean [--all]           Delete old logs (default: older than 30 days)
#   summary                 Print summary stats for all log files
#
# Examples:
#   ./scripts/logs.sh tail install-full
#   ./scripts/logs.sh search "API_KEY"
#   ./scripts/logs.sh docker aetherwave_api
#   ./scripts/logs.sh errors
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

# Source shared logging
source "$PROJECT_DIR/scripts/lib/log.sh"

CMD="${1:-help}"
shift || true

# ─── Helpers ───────────────────────────────────────────────────────────────
_ensure_log_dir() {
  if [[ ! -d "$LOG_DIR" ]]; then
    warn "No logs directory found at $LOG_DIR"
    log "Run an install/update script first to generate logs"
    exit 0
  fi
}

_latest_log_for() {
  local script_name="$1"
  ls -1t "$LOG_DIR"/${script_name}-2*.log 2>/dev/null | head -1 || true
}

# ─── Commands ──────────────────────────────────────────────────────────────

cmd_list() {
  _ensure_log_dir
  header "All Log Files"
  if [[ -z "$(ls -A "$LOG_DIR" 2>/dev/null)" ]]; then
    log "No logs found"
    return
  fi

  printf "%-40s %12s %s\n" "FILE" "SIZE" "MODIFIED"
  printf "%-40s %12s %s\n" "----" "----" "--------"
  while IFS= read -r f; do
    local name size mtime
    name=$(basename "$f")
    size=$(du -h "$f" 2>/dev/null | cut -f1)
    mtime=$(date -r "$f" '+%Y-%m-%d %H:%M' 2>/dev/null || stat -c '%y' "$f" 2>/dev/null | cut -d. -f1)
    printf "%-40s %12s %s\n" "$name" "$size" "$mtime"
  done < <(ls -1t "$LOG_DIR"/*.log 2>/dev/null)
}

cmd_tail() {
  _ensure_log_dir
  local script="${1:-}"
  if [[ -z "$script" ]]; then
    err "Usage: logs.sh tail <script-name>"
    log "Available scripts: install, install-full, uninstall, uninstall-full, update, switch-branch, collect-logs, troubleshoot"
    exit 1
  fi

  local logfile
  logfile=$(_latest_log_for "$script")
  if [[ -z "$logfile" ]]; then
    err "No logs found for: $script"
    exit 1
  fi

  log "Tailing: $logfile"
  echo ""
  tail -f "$logfile"
}

cmd_show() {
  _ensure_log_dir
  local script="${1:-}"
  if [[ -z "$script" ]]; then
    err "Usage: logs.sh show <script-name>"
    exit 1
  fi

  local logfile
  logfile=$(_latest_log_for "$script")
  if [[ -z "$logfile" ]]; then
    err "No logs found for: $script"
    exit 1
  fi

  header "Log: $(basename "$logfile")"
  cat "$logfile"
}

cmd_docker() {
  local service="${1:-}"
  if [[ -z "$service" ]]; then
    header "All Container Logs"
    docker-compose -f "$PROJECT_DIR/docker-compose.yml" logs --tail=100
  else
    header "Container: $service"
    docker logs --tail=200 "$service" 2>&1 || {
      err "Container $service not found or not running"
      log "Available containers:"
      docker ps -a --format '  • {{.Names}} ({{.Status}})' | grep -i aetherwave || true
      exit 1
    }
  fi
}

cmd_search() {
  _ensure_log_dir
  local pattern="${1:-}"
  if [[ -z "$pattern" ]]; then
    err "Usage: logs.sh search <pattern>"
    exit 1
  fi

  header "Searching for: $pattern"
  if grep -rIn --color=auto "$pattern" "$LOG_DIR" 2>/dev/null; then
    return 0
  else
    log "No matches found"
  fi
}

cmd_errors() {
  _ensure_log_dir
  header "Recent Errors Across All Logs"

  local count=0
  while IFS= read -r f; do
    local matches
    matches=$(grep -nE '\[(FAIL|ERROR)\]|exception|traceback|fatal' "$f" 2>/dev/null || true)
    if [[ -n "$matches" ]]; then
      echo -e "${AW_YELLOW}── $(basename "$f") ──${AW_NC}"
      echo "$matches" | head -20
      echo ""
      count=$((count + 1))
    fi
  done < <(ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -20)

  if [[ $count -eq 0 ]]; then
    ok "No errors found in recent logs"
  else
    log "Found errors in $count log file(s)"
  fi
}

cmd_clean() {
  _ensure_log_dir
  local all_flag="${1:-}"

  if [[ "$all_flag" == "--all" ]]; then
    warn "Removing ALL log files…"
    rm -f "$LOG_DIR"/*.log
    ok "All logs removed"
  else
    log "Removing logs older than 30 days…"
    local deleted
    deleted=$(find "$LOG_DIR" -name "*.log" -type f -mtime +30 -print -delete 2>/dev/null | wc -l | tr -d ' ')
    ok "Removed $deleted old log file(s)"
  fi

  # Also clean broken symlinks
  find "$LOG_DIR" -type l ! -exec test -e {} \; -delete 2>/dev/null || true
}

cmd_summary() {
  _ensure_log_dir
  header "Log Summary"

  local total_count total_size
  total_count=$(ls -1 "$LOG_DIR"/*.log 2>/dev/null | wc -l | tr -d ' ')
  total_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)

  echo "Total logs:    $total_count"
  echo "Total size:    $total_size"
  echo "Location:      $LOG_DIR"
  echo ""

  log "Logs per script:"
  for script in install install-full uninstall uninstall-full update switch-branch collect-logs troubleshoot; do
    local count
    count=$(ls -1 "$LOG_DIR"/${script}-2*.log 2>/dev/null | wc -l | tr -d ' ')
    if [[ $count -gt 0 ]]; then
      printf "  %-20s %3d logs\n" "$script" "$count"
    fi
  done

  echo ""
  log "Most recent log:"
  local latest
  latest=$(ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -1)
  if [[ -n "$latest" ]]; then
    echo "  $(basename "$latest") ($(date -r "$latest" 2>/dev/null || stat -c '%y' "$latest" 2>/dev/null | cut -d. -f1))"
  fi

  echo ""
  log "Error counts in recent logs:"
  local err_total=0
  while IFS= read -r f; do
    local errs
    errs=$(grep -cE '\[(FAIL|ERROR)\]' "$f" 2>/dev/null || echo 0)
    if [[ ${errs:-0} -gt 0 ]]; then
      printf "  %-50s %3d errors\n" "$(basename "$f")" "$errs"
      err_total=$((err_total + errs))
    fi
  done < <(ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -10)

  if [[ $err_total -eq 0 ]]; then
    ok "No errors detected in recent logs"
  else
    warn "Total errors: $err_total"
  fi
}

cmd_help() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//'
}

# ─── Dispatch ──────────────────────────────────────────────────────────────
case "$CMD" in
  list)     cmd_list "$@" ;;
  tail)     cmd_tail "$@" ;;
  show)     cmd_show "$@" ;;
  docker)   cmd_docker "$@" ;;
  search)   cmd_search "$@" ;;
  errors)   cmd_errors "$@" ;;
  clean)    cmd_clean "$@" ;;
  summary)  cmd_summary "$@" ;;
  help|-h|--help) cmd_help ;;
  *)
    err "Unknown command: $CMD"
    cmd_help
    exit 1
    ;;
esac
