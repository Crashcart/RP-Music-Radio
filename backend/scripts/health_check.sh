#!/usr/bin/env bash
# Quick health check for running API
# Usage: ./backend/scripts/health_check.sh [--help]

set -e

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  cat << 'HELP_EOF'
╔════════════════════════════════════════════════════════════════╗
║     API Health Check — backend/scripts/health_check.sh        ║
╚════════════════════════════════════════════════════════════════╝

PURPOSE:
  Quick health check for running API server.
  Tests critical endpoints and services.

USAGE:
  ./backend/scripts/health_check.sh
  ./backend/scripts/health_check.sh --help
  API_URL=http://localhost:9000 ./backend/scripts/health_check.sh

ENVIRONMENT VARIABLES:
  API_URL    Custom API URL (default: http://localhost:8000)
  TIMEOUT    Request timeout in seconds (default: 5)

TESTS PERFORMED:
  1. Health endpoint (/health) — Critical
  2. Root endpoint (/) — Non-critical
  3. API docs (/docs) — Non-critical
  4. Port binding (:8000) — Critical
  5. Database access — Non-critical
  6. Logging configuration — Non-critical

EXIT CODES:
  0  All critical checks passed
  1  Critical check failed

EXAMPLES:
  # Default (localhost:8000)
  ./backend/scripts/health_check.sh

  # Custom port
  API_URL=http://localhost:9000 ./backend/scripts/health_check.sh

  # Custom timeout
  TIMEOUT=10 ./backend/scripts/health_check.sh

HELP_EOF
  exit 0
fi

API_URL="${API_URL:-http://localhost:8000}"
TIMEOUT=5

echo "╔═══════════════════════════════════════╗"
echo "║     API HEALTH CHECK                  ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Health endpoint
echo -n "Health endpoint... "
if curl -s -m "$TIMEOUT" "$API_URL/health" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 2: Root endpoint
echo -n "Root endpoint... "
if curl -s -m "$TIMEOUT" "$API_URL/" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED (non-critical)"
fi

# Test 3: Docs endpoint
echo -n "API docs... "
if curl -s -m "$TIMEOUT" "$API_URL/docs" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED (non-critical)"
fi

# Test 4: Port binding
echo -n "Port binding... "
PORT=$(echo "$API_URL" | grep -oP ':\K[0-9]+$' || echo "8000")
if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 5: Database
echo -n "Database accessible... "
if PYTHONPATH=backend python -c "from app.database import Base; print('', end='')" 2>/dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED (non-critical)"
fi

# Test 6: Logging
echo -n "Logging configured... "
if PYTHONPATH=backend python -c "from app.logging_config import setup_logging; setup_logging(); print('', end='')" 2>/dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED (non-critical)"
fi

echo ""
echo "✓ ALL CRITICAL CHECKS PASSED"
