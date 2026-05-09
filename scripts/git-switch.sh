#!/usr/bin/env bash
# Silent branch switcher for CI/CD and AI agents
# Usage: ./scripts/git-switch.sh <branch> [--help]
#
# Used by: Claude, CI/CD pipelines, automated workflows
# Features: No prompts, auto-stash, error handling, minimal output
#
# Branches: main, alpha, beta, or any remote branch

set -e

# ─── Help ──────────────────────────────────────────────────────────────────
show_help() {
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║     Silent Git Branch Switcher — scripts/git-switch.sh        ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Silent (non-interactive) branch switcher for CI/CD and AI agents.
  Auto-stashes changes, switches branches, restores state.

USAGE:
  ./scripts/git-switch.sh <branch>
  ./scripts/git-switch.sh --help

BRANCHES SUPPORTED:
  main, alpha, beta, or any remote branch name

FEATURES:
  ✓ No interactive prompts
  ✓ Auto-stash uncommitted changes
  ✓ Auto-fetch from origin
  ✓ Minimal output (one line on success)
  ✓ Error handling with clear messages

EXAMPLES:
  ./scripts/git-switch.sh main
  ./scripts/git-switch.sh alpha
  ./scripts/git-switch.sh claude/feature-name

OUTPUT:
  Success: ✅ Switched to <branch>
  Already on branch: ✅ Already on <branch> — pulled latest changes
  Error: ❌ <error message>

HELP_EOF
}

if [[ $# -lt 1 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  show_help
  exit 0
fi

BRANCH="$1"

# Get current branch
CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# If already on target branch, just pull
if [ "$CURRENT" = "$BRANCH" ]; then
  git fetch origin "$BRANCH" --quiet 2>/dev/null || true
  git pull origin "$BRANCH" --quiet 2>/dev/null || true
  echo "✅ Already on $BRANCH — pulled latest changes"
  exit 0
fi

# Stash any uncommitted changes
STASH_NEEDED=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  git stash --quiet 2>/dev/null || true
  STASH_NEEDED=true
fi

# Perform switch
if ! git fetch origin "$BRANCH" --quiet 2>/dev/null; then
  echo "❌ Branch '$BRANCH' not found on remote origin"
  exit 1
fi

git checkout "$BRANCH" --quiet 2>/dev/null || {
  echo "❌ Failed to checkout branch '$BRANCH'"
  if [ "$STASH_NEEDED" = true ]; then
    git stash pop --quiet 2>/dev/null || true
  fi
  exit 1
}

git pull origin "$BRANCH" --quiet 2>/dev/null || true

# Restore stashed changes
if [ "$STASH_NEEDED" = true ]; then
  git stash pop --quiet 2>/dev/null || true
fi

echo "✅ Switched to $BRANCH"
