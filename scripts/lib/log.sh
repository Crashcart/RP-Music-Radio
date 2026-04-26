#!/usr/bin/env bash
#
# AetherWave Centralized Logging Library (scripts/lib/log.sh)
# ------------------------------------------------------------
# Shared logging functions sourced by all install/update/uninstall scripts.
# Provides:
#   • Color-coded console output (INFO/OK/WARN/FAIL/DEBUG)
#   • Tee'd log files in logs/<script-name>-<timestamp>.log
#   • Log levels (DEBUG, INFO, WARN, ERROR)
#   • Structured timestamp format (ISO 8601)
#   • Automatic log rotation (keep last 30 logs per script)
#
# Usage (in any script):
#   source "$(dirname "${BASH_SOURCE[0]}")/scripts/lib/log.sh"
#   log_init "my-script"        # Sets LOG_FILE
#   log "Something happened"
#   ok "Done"
#   warn "Be careful"
#   err "Failed"
#   debug "Internal detail"
#

# ─── Don't source twice ────────────────────────────────────────────────────
if [[ "${AETHERWAVE_LOG_SH_LOADED:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi
AETHERWAVE_LOG_SH_LOADED=1

# ─── Colors ────────────────────────────────────────────────────────────────
if [[ -t 1 ]] && [[ "${NO_COLOR:-}" != "1" ]]; then
  AW_RED='\033[0;31m'
  AW_GREEN='\033[0;32m'
  AW_YELLOW='\033[1;33m'
  AW_BLUE='\033[0;34m'
  AW_PURPLE='\033[0;35m'
  AW_CYAN='\033[0;36m'
  AW_GREY='\033[0;90m'
  AW_BOLD='\033[1m'
  AW_NC='\033[0m'
else
  AW_RED=''; AW_GREEN=''; AW_YELLOW=''; AW_BLUE=''
  AW_PURPLE=''; AW_CYAN=''; AW_GREY=''; AW_BOLD=''; AW_NC=''
fi

# ─── Globals ───────────────────────────────────────────────────────────────
AETHERWAVE_LOG_DIR="${AETHERWAVE_LOG_DIR:-}"
AETHERWAVE_LOG_FILE="${AETHERWAVE_LOG_FILE:-}"
AETHERWAVE_LOG_LEVEL="${AETHERWAVE_LOG_LEVEL:-INFO}"   # DEBUG | INFO | WARN | ERROR
AETHERWAVE_LOG_RETENTION="${AETHERWAVE_LOG_RETENTION:-30}"

# ─── Helpers ───────────────────────────────────────────────────────────────
_aw_timestamp() {
  date +"%Y-%m-%dT%H:%M:%S%z"
}

_aw_level_int() {
  case "$1" in
    DEBUG) echo 0 ;;
    INFO)  echo 1 ;;
    WARN)  echo 2 ;;
    ERROR) echo 3 ;;
    *)     echo 1 ;;
  esac
}

_aw_log_enabled() {
  local level="$1"
  local current
  current=$(_aw_level_int "$AETHERWAVE_LOG_LEVEL")
  local requested
  requested=$(_aw_level_int "$level")
  [[ $requested -ge $current ]]
}

_aw_write() {
  local level="$1"
  local color="$2"
  local prefix="$3"
  local msg="$4"
  local ts
  ts=$(_aw_timestamp)

  # Console output (colored)
  if _aw_log_enabled "$level"; then
    echo -e "${color}${prefix}${AW_NC} ${msg}"
  fi

  # File output (plain text with timestamp)
  if [[ -n "$AETHERWAVE_LOG_FILE" ]] && [[ -w "$(dirname "$AETHERWAVE_LOG_FILE")" ]]; then
    echo "[${ts}] [${level}] ${msg}" >> "$AETHERWAVE_LOG_FILE"
  fi
}

# ─── Public API ────────────────────────────────────────────────────────────

# Initialize logging for a script. Creates logs/ directory and log file.
# Usage: log_init "install-full"
log_init() {
  local script_name="${1:-script}"
  local project_dir="${PROJECT_DIR:-$(pwd)}"

  # Set log directory
  AETHERWAVE_LOG_DIR="${AETHERWAVE_LOG_DIR:-$project_dir/logs}"
  mkdir -p "$AETHERWAVE_LOG_DIR"

  # Create timestamped log file
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  AETHERWAVE_LOG_FILE="$AETHERWAVE_LOG_DIR/${script_name}-${timestamp}.log"

  # Create symlink to "latest" for each script
  ln -sf "${script_name}-${timestamp}.log" "$AETHERWAVE_LOG_DIR/${script_name}-latest.log" 2>/dev/null || true

  # Write header
  {
    echo "═══════════════════════════════════════════════════════"
    echo "AetherWave Log: $script_name"
    echo "Started: $(_aw_timestamp)"
    echo "Host:    $(hostname 2>/dev/null || echo unknown)"
    echo "User:    $(whoami)"
    echo "PID:     $$"
    echo "Pwd:     $(pwd)"
    echo "Args:    ${ORIGINAL_ARGS:-${BASH_ARGV[*]:-}}"
    if command -v git >/dev/null 2>&1; then
      echo "Branch:  $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
      echo "Commit:  $(git rev-parse --short HEAD 2>/dev/null || echo n/a)"
    fi
    echo "═══════════════════════════════════════════════════════"
    echo ""
  } > "$AETHERWAVE_LOG_FILE" 2>/dev/null || true

  # Rotate old logs for this script
  _aw_rotate_logs "$script_name"

  # Export so subshells can use it
  export AETHERWAVE_LOG_FILE AETHERWAVE_LOG_DIR

  log "Logging initialized → $AETHERWAVE_LOG_FILE"
}

# Rotate logs: keep only the last N for each script name
_aw_rotate_logs() {
  local script_name="$1"
  if [[ -z "$AETHERWAVE_LOG_DIR" ]] || [[ ! -d "$AETHERWAVE_LOG_DIR" ]]; then
    return 0
  fi

  local count
  count=$(ls -1 "$AETHERWAVE_LOG_DIR"/${script_name}-2*.log 2>/dev/null | wc -l | tr -d ' ')
  if (( count > AETHERWAVE_LOG_RETENTION )); then
    ls -1t "$AETHERWAVE_LOG_DIR"/${script_name}-2*.log 2>/dev/null | \
      tail -n +$((AETHERWAVE_LOG_RETENTION + 1)) | \
      xargs -r rm -f 2>/dev/null || true
  fi
}

# Standard log levels
debug() { _aw_write DEBUG "$AW_GREY"   "[DEBUG]" "$*"; }
log()   { _aw_write INFO  "$AW_BLUE"   "[INFO ]" "$*"; }
info()  { _aw_write INFO  "$AW_BLUE"   "[INFO ]" "$*"; }
ok()    { _aw_write INFO  "$AW_GREEN"  "[ OK  ]" "$*"; }
warn()  { _aw_write WARN  "$AW_YELLOW" "[WARN ]" "$*"; }
err()   { _aw_write ERROR "$AW_RED"    "[FAIL ]" "$*"; }

# Section headers (visual separators)
header() {
  local msg="$*"
  local line="═══════════════════════════════════════════════════════"
  echo ""
  echo -e "${AW_PURPLE}${line}${AW_NC}"
  echo -e "${AW_PURPLE}  ${msg}${AW_NC}"
  echo -e "${AW_PURPLE}${line}${AW_NC}"
  echo ""

  if [[ -n "${AETHERWAVE_LOG_FILE:-}" ]]; then
    {
      echo ""
      echo "$line"
      echo "  $msg"
      echo "$line"
      echo ""
    } >> "$AETHERWAVE_LOG_FILE" 2>/dev/null || true
  fi
}

# Run a command and log its output
log_cmd() {
  local cmd="$*"
  log "Running: $cmd"

  if [[ -n "${AETHERWAVE_LOG_FILE:-}" ]]; then
    local tmp
    tmp=$(mktemp)
    if eval "$cmd" 2>&1 | tee "$tmp"; then
      {
        echo "─── stdout ───"
        cat "$tmp"
        echo "─── exit: 0 ───"
      } >> "$AETHERWAVE_LOG_FILE"
      rm -f "$tmp"
      return 0
    else
      local rc=$?
      {
        echo "─── stdout ───"
        cat "$tmp"
        echo "─── exit: $rc ───"
      } >> "$AETHERWAVE_LOG_FILE"
      rm -f "$tmp"
      return $rc
    fi
  else
    eval "$cmd"
  fi
}

# Log final exit handler — call from trap
log_finalize() {
  local exit_code=$?
  if [[ -n "${AETHERWAVE_LOG_FILE:-}" ]]; then
    {
      echo ""
      echo "═══════════════════════════════════════════════════════"
      echo "Finished: $(_aw_timestamp)"
      echo "Exit code: $exit_code"
      echo "═══════════════════════════════════════════════════════"
    } >> "$AETHERWAVE_LOG_FILE" 2>/dev/null || true

    if [[ $exit_code -ne 0 ]]; then
      echo ""
      echo -e "${AW_RED}Log saved to:${AW_NC} $AETHERWAVE_LOG_FILE"
    fi
  fi
  return $exit_code
}

# Print log file location (useful for debugging)
log_location() {
  if [[ -n "${AETHERWAVE_LOG_FILE:-}" ]]; then
    echo "$AETHERWAVE_LOG_FILE"
  else
    echo "(not initialized)"
  fi
}
