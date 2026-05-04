#!/bin/bash
# Pull changes from beta branch (release candidate)
# Usage: ./scripts/pull-beta.sh
#
# This script safely switches to the beta branch and pulls the latest changes.
# Beta contains release candidates tested on alpha before going to production.

set -e

echo "📡 Pulling from beta branch (release candidate)..."
echo ""

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes. Stashing them..."
  git stash
  STASHED=true
else
  STASHED=false
fi

# Fetch and checkout beta
git fetch origin beta
git checkout beta
git pull origin beta

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
  echo "📦 Restoring your stashed changes..."
  git stash pop || echo "⚠️  Could not automatically apply stashed changes. Run: git stash pop"
fi

echo ""
echo "✅ Beta branch is up to date"
echo "📍 Current branch: beta (release candidate)"
echo "🔄 Next step: Verify stability, then pull main for production"
echo ""
