#!/bin/bash
# Pull changes from alpha branch (pre-release testing)
# Usage: ./scripts/pull-alpha.sh
#
# This script safely switches to the alpha branch and pulls the latest changes.
# Alpha is for testing new features before they move to beta.

set -e

echo "📡 Pulling from alpha branch (pre-release testing)..."
echo ""

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes. Stashing them..."
  git stash
  STASHED=true
else
  STASHED=false
fi

# Fetch and checkout alpha
git fetch origin alpha
git checkout alpha
git pull origin alpha

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
  echo "📦 Restoring your stashed changes..."
  git stash pop || echo "⚠️  Could not automatically apply stashed changes. Run: git stash pop"
fi

echo ""
echo "✅ Alpha branch is up to date"
echo "📍 Current branch: alpha (pre-release testing)"
echo "🔄 Next step: Test new features, then pull beta or main when ready"
echo ""
