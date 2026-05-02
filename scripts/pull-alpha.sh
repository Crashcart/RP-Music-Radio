#!/bin/bash
# Pull changes from alpha branch (pre-release testing)
# Usage: ./scripts/pull-alpha.sh

set -e

echo "📡 Pulling from alpha branch..."
git fetch origin alpha
git checkout alpha
git pull origin alpha

echo "✅ Alpha branch is up to date"
echo "📍 You are now on the alpha branch (pre-release testing)"
