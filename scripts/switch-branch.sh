#!/bin/bash
# Switch between git branches: main, beta, or alpha
# Usage: ./scripts/switch-branch.sh [branch]
#
# Examples:
#   ./scripts/switch-branch.sh main      # Switch to stable production
#   ./scripts/switch-branch.sh beta      # Switch to release candidate
#   ./scripts/switch-branch.sh alpha     # Switch to pre-release testing
#   ./scripts/switch-branch.sh           # Interactive menu

set -e

# Branch definitions
MAIN_BRANCH="main"
BETA_BRANCH="beta"
ALPHA_BRANCH="alpha"

# Get branch from argument or prompt
if [ -z "$1" ]; then
  echo "🌿 AetherWave Branch Manager"
  echo ""
  echo "Choose a branch to switch to:"
  echo "  1) main  — Stable production (latest stable release)"
  echo "  2) beta  — Release candidate (tested on alpha)"
  echo "  3) alpha — Pre-release testing (new features)"
  echo ""
  read -p "Enter choice (1-3): " choice

  case "$choice" in
    1) BRANCH="$MAIN_BRANCH" ;;
    2) BRANCH="$BETA_BRANCH" ;;
    3) BRANCH="$ALPHA_BRANCH" ;;
    *)
      echo "❌ Invalid choice. Exiting."
      exit 1
      ;;
  esac
else
  BRANCH="$1"
fi

# Validate branch
case "$BRANCH" in
  main|beta|alpha) ;;
  *)
    echo "❌ Invalid branch: $BRANCH"
    echo "Valid branches: main, beta, alpha"
    exit 1
    ;;
esac

# Show branch info
case "$BRANCH" in
  main)
    DESCRIPTION="Stable Production"
    EMOJI="🏢"
    NEXT_STEP="You are running the latest stable release"
    ;;
  beta)
    DESCRIPTION="Release Candidate"
    EMOJI="🧪"
    NEXT_STEP="Test stability before promoting to main"
    ;;
  alpha)
    DESCRIPTION="Pre-Release Testing"
    EMOJI="🚀"
    NEXT_STEP="Test new features before promoting to beta"
    ;;
esac

echo ""
echo "$EMOJI Switching to $BRANCH ($DESCRIPTION)..."
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes."
  read -p "Stash them? (y/n): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git stash
    STASHED=true
  else
    echo "❌ Cannot switch branches with uncommitted changes. Exiting."
    exit 1
  fi
else
  STASHED=false
fi

# Perform the switch
echo "📡 Fetching from origin..."
git fetch origin "$BRANCH"

echo "📍 Checking out $BRANCH..."
git checkout "$BRANCH"

echo "⬇️  Pulling latest changes..."
git pull origin "$BRANCH"

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
  echo "📦 Restoring stashed changes..."
  git stash pop || echo "⚠️  Could not automatically apply stashed changes. Run: git stash pop"
fi

echo ""
echo "✅ Successfully switched to $BRANCH"
echo "📍 Current branch: $BRANCH ($DESCRIPTION)"
echo "💡 $NEXT_STEP"
echo ""
