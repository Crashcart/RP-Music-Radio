#!/usr/bin/env bash
# Pull changes from main branch (stable production)
# Usage: ./scripts/pull-main.sh [--help]

set -e

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║    Pull from Main Branch — scripts/pull-main.sh               ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Fetch and switch to the main branch (stable production).

USAGE:
  ./scripts/pull-main.sh
  ./scripts/pull-main.sh --help

WHAT IT DOES:
  1. Fetches latest changes from origin/main
  2. Checks out the main branch
  3. Pulls latest commits
  4. Shows confirmation

BRANCH INFO:
  main — Stable production branch
  Use for: Production deployments, stable releases

HELP_EOF
  exit 0
fi

echo "📡 Pulling from main branch..."
git fetch origin main
git checkout main
git pull origin main

echo "✅ Main branch is up to date"
echo "📍 You are now on the main branch (stable production)"
echo ""
echo "Next steps:"
echo "  • Check latest changes: git log --oneline -5"
echo "  • Deploy: Follow deployment guide"
echo "  • Verify: Check health endpoints after deployment"
