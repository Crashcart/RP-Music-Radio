#!/usr/bin/env bash
# Pull changes from beta branch (release candidate)
# Usage: ./scripts/pull-beta.sh [--help]

set -e

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║    Pull from Beta Branch — scripts/pull-beta.sh               ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Fetch and switch to the beta branch (release candidate).

USAGE:
  ./scripts/pull-beta.sh
  ./scripts/pull-beta.sh --help

WHAT IT DOES:
  1. Fetches latest changes from origin/beta
  2. Checks out the beta branch
  3. Pulls latest commits
  4. Shows confirmation

BRANCH INFO:
  beta — Release candidate branch
  Use for: Stable pre-release testing, RC validation

HELP_EOF
  exit 0
fi

echo "📡 Pulling from beta branch..."
git fetch origin beta
git checkout beta
git pull origin beta

echo "✅ Beta branch is up to date"
echo "📍 You are now on the beta branch (release candidate)"
echo ""
echo "Next steps:"
echo "  • Check latest changes: git log --oneline -5"
echo "  • Run tests: npm test (if available)"
echo "  • Build: docker-compose build (if using Docker)"
