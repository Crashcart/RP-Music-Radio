#!/bin/bash
# Show branch status, workflow, and commands
# Usage: ./scripts/branch-status.sh
#
# Displays current branch, remote status, and available branch operations

set -e

CURRENT_BRANCH=$(git branch --show-current)

echo "🌳 AetherWave Branch Workflow"
echo "======================================================================"
echo ""
echo "📍 Current Branch: $CURRENT_BRANCH"
echo ""

echo "Branch Structure:"
echo "  🏢 main  → Stable production releases (latest stable)"
echo "  🧪 beta  → Release candidates (tested on alpha)"
echo "  🚀 alpha → Pre-release testing (new features)"
echo ""

echo "Branch Comparison with Remote:"
git fetch origin --quiet
echo "  Local branches:"
git branch -v | sed 's/^/    /'
echo ""

echo "Available Branch Operations:"
echo "  📥 Pull/Switch Commands:"
echo "    ./scripts/pull-main.sh   → Switch to main (stable)"
echo "    ./scripts/pull-beta.sh   → Switch to beta (RC)"
echo "    ./scripts/pull-alpha.sh  → Switch to alpha (pre-release)"
echo "    ./scripts/switch-branch.sh [branch] → Interactive branch switcher"
echo ""

echo "Promotion Flow:"
echo "  alpha (test) → beta (RC) → main (stable)"
echo ""

echo "Quick Reference:"
echo "  Check status:     git status"
echo "  View commits:     git log --oneline -10"
echo "  See branches:     git branch -a"
echo "  Create feature:   git checkout -b feat/issue-N-slug"
echo ""

