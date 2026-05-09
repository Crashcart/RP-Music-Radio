#!/usr/bin/env bash
# Pull changes from alpha branch (pre-release testing)
# Usage: ./scripts/pull-alpha.sh [--help]

set -e

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║   Pull from Alpha Branch — scripts/pull-alpha.sh              ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Fetch and switch to the alpha branch (pre-release testing).

USAGE:
  ./scripts/pull-alpha.sh
  ./scripts/pull-alpha.sh --help

WHAT IT DOES:
  1. Fetches latest changes from origin/alpha
  2. Checks out the alpha branch
  3. Pulls latest commits
  4. Shows confirmation

BRANCH INFO:
  alpha — Pre-release features and testing branch
  Use for: Early access to new features, bug testing

HELP_EOF
  exit 0
fi

echo "📡 Pulling from alpha branch..."
git fetch origin alpha
git checkout alpha
git pull origin alpha

echo "✅ Alpha branch is up to date"
echo "📍 You are now on the alpha branch (pre-release testing)"
echo ""
echo "Next steps:"
echo "  • Check latest changes: git log --oneline -5"
echo "  • Run tests: npm test (if available)"
echo "  • Build: docker-compose build (if using Docker)"
