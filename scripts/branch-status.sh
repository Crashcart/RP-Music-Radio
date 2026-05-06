#!/bin/bash
# Show branch status and workflow
# Usage: ./scripts/branch-status.sh

set -e

echo "🌳 AetherWave Branch Workflow"
echo "================================"
echo ""
echo "Branch Structure:"
echo "  main  → Stable production releases"
echo "  beta  → Release candidates (RC)"
echo "  alpha → Pre-release testing & features"
echo ""
echo "Current Status:"
git branch -v

echo ""
echo "Available Commands:"
echo "  ./scripts/pull-main.sh   → Switch to main (stable)"
echo "  ./scripts/pull-beta.sh   → Switch to beta (RC)"
echo "  ./scripts/pull-alpha.sh  → Switch to alpha (pre-release)"
echo ""
echo "Merge Flow:"
echo "  alpha → beta → main"
echo ""
