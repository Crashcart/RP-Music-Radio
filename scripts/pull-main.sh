#!/bin/bash
# Pull changes from main branch (stable production)
# Usage: ./scripts/pull-main.sh
#
# This script safely switches to the main branch and pulls the latest changes.
# Main contains stable, production-ready code.

set -e

echo "📡 Pulling from main branch (stable production)..."
echo ""

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes. Stashing them..."
  git stash
  STASHED=true
else
  STASHED=false
fi

# Fetch and checkout main
git fetch origin main
git checkout main
git pull origin main

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
  echo "📦 Restoring your stashed changes..."
  git stash pop || echo "⚠️  Could not automatically apply stashed changes. Run: git stash pop"
fi

echo ""
echo "✅ Main branch is up to date"
echo "📍 Current branch: main (stable production)"
echo "✨ You are running the latest stable release"
echo ""
