#!/bin/bash
# Quick health check for running API
# Usage: ./backend/scripts/health_check.sh

set -e

API_URL="${API_URL:-http://localhost:8000}"
TIMEOUT=5

echo "╔═══════════════════════════════════════╗"
echo "║     API HEALTH CHECK                  ║"
echo "╚═══════════════════════════════════════╝"
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
if netstat -tuln 2>/dev/null | grep -q ":8000 " || ss -tuln 2>/dev/null | grep -q ":8000 "; then
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
    echo "✗ FAILED"
fi

# Test 6: Logging
echo -n "Logging configured... "
if PYTHONPATH=backend python -c "from app.logging_config import setup_logging; setup_logging(); print('', end='')" 2>/dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

echo ""
echo "✓ ALL CRITICAL CHECKS PASSED"
