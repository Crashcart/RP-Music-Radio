#!/bin/bash
# Pull changes from beta branch (release candidate)
# Usage: ./scripts/pull-beta.sh

set -e

echo "📡 Pulling from beta branch..."
git fetch origin beta
git checkout beta
git pull origin beta

echo "✅ Beta branch is up to date"
echo "📍 You are now on the beta branch (release candidate)"
