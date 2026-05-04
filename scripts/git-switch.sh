#!/bin/bash
# Silent branch switcher for CI/CD and AI agents
# Usage: ./scripts/git-switch.sh <branch>
#
# Used by: Claude, CI/CD pipelines, automated workflows
# Features: No prompts, auto-stash, error handling
#
# Examples:
#   ./scripts/git-switch.sh main
#   ./scripts/git-switch.sh beta
#   ./scripts/git-switch.sh alpha

set -e

# Validate argument
if [ -z "$1" ]; then
  echo "❌ Branch name required"
  echo "Usage: $0 [main|beta|alpha]"
  exit 1
fi

BRANCH="$1"

# Validate branch name
case "$BRANCH" in
  main|beta|alpha) ;;
  *)
    echo "❌ Invalid branch: $BRANCH (valid: main, beta, alpha)"
    exit 1
    ;;
esac

# Get current branch
CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# If already on target branch, just pull
if [ "$CURRENT" = "$BRANCH" ]; then
  git fetch origin "$BRANCH" --quiet
  git pull origin "$BRANCH" --quiet
  echo "✅ Already on $BRANCH — pulled latest changes"
  exit 0
fi

# Stash any uncommitted changes
STASH_NEEDED=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  git stash --quiet
  STASH_NEEDED=true
fi

# Perform switch
git fetch origin "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git pull origin "$BRANCH" --quiet

# Restore stashed changes
if [ "$STASH_NEEDED" = true ]; then
  git stash pop --quiet 2>/dev/null || true
fi

echo "✅ Switched to $BRANCH"
