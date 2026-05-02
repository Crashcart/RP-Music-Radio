#!/bin/bash
# Pull changes from main branch (stable production)
# Usage: ./scripts/pull-main.sh

set -e

echo "📡 Pulling from main branch..."
git fetch origin main
git checkout main
git pull origin main

echo "✅ Main branch is up to date"
echo "📍 You are now on the main branch (stable production)"
