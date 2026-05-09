#!/usr/bin/env python3
"""
API Diagnostic Tool — Rapid problem identification and health check.

Usage:
  PYTHONPATH=backend python scripts/diagnose_api.py

Checks:
  1. Python environment and imports
  2. Database connectivity
  3. API initialization
  4. Logging configuration
  5. Required services (Redis, etc.)
  6. Route registration
  7. Health endpoint availability

Output: Pass/fail for each check with debugging info
"""

import sys
import os
import time
import importlib
from pathlib import Path


# Colors for terminal output
class Color:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def check(name: str, func, expected_success: bool = True) -> bool:
    """Run a check and report result."""
    try:
        result = func()
        success = bool(result) if expected_success else True
        status = (
            f"{Color.GREEN}✓{Color.RESET}" if success else f"{Color.RED}✗{Color.RESET}"
        )
        print(f"{status} {name}")
        if result and isinstance(result, str):
            print(f"  → {result}")
        return success
    except Exception as e:
        print(f"{Color.RED}✗{Color.RESET} {name}")
        print(f"  ERROR: {type(e).__name__}: {e}")
        return False


def diagnose():
    """Run full diagnostic suite."""
    print(f"\n{Color.BLUE}═══ AETHERWAVE API DIAGNOSTIC ═══{Color.RESET}\n")

    results = {}

    # 1. ENVIRONMENT
    print(f"{Color.BLUE}1. ENVIRONMENT{Color.RESET}")
    results["python"] = check(
        "Python version", lambda: f"{sys.version.split()[0]} (OK if >= 3.9)"
    )
    results["pythonpath"] = check(
        "PYTHONPATH set correctly", lambda: os.path.exists("backend/app/main.py")
    )

    # 2. IMPORTS - CRITICAL
    print(f"\n{Color.BLUE}2. CRITICAL IMPORTS{Color.RESET}")

    def test_logging_import():
        sys.path.insert(0, "backend")
        from app.logging_config import setup_logging

        return "logging_config OK"

    results["logging"] = check("app.logging_config imports", test_logging_import)

    def test_main_import():
        # Reset sys.modules to force fresh import
        for key in list(sys.modules.keys()):
            if "app" in key:
                del sys.modules[key]
        sys.path.insert(0, "backend")
        try:
            from app.main import app

            return f"FastAPI app imported, {len(app.routes)} routes"
        except Exception as e:
            raise RuntimeError(f"Failed to import app.main: {e}")

    results["main"] = check("app.main imports (CRITICAL)", test_main_import)

    # 3. DATABASE
    print(f"\n{Color.BLUE}3. DATABASE{Color.RESET}")

    def test_db_init():
        sys.path.insert(0, "backend")
        from app.database import init_db

        init_db()
        return "Database initialized"

    results["database"] = check("Database initialization", test_db_init)

    # 4. LOGGING CONFIG
    print(f"\n{Color.BLUE}4. LOGGING CONFIGURATION{Color.RESET}")

    def test_logging_setup():
        sys.path.insert(0, "backend")
        from app.logging_config import setup_logging
        import logging

        setup_logging()
        logger = logging.getLogger(__name__)
        logger.info("Logging test message")
        return "Logging configured"

    results["logging_setup"] = check("Logging setup", test_logging_setup)

    # 5. ROUTES
    print(f"\n{Color.BLUE}5. ROUTE REGISTRATION{Color.RESET}")

    def count_routes():
        sys.path.insert(0, "backend")
        for key in list(sys.modules.keys()):
            if "app" in key:
                del sys.modules[key]
        from app.main import app

        return f"{len(app.routes)} routes registered"

    results["routes"] = check("Routes registered", count_routes)

    # 6. HEALTH ENDPOINT
    print(f"\n{Color.BLUE}6. HEALTH ENDPOINT{Color.RESET}")

    def test_health():
        sys.path.insert(0, "backend")
        for key in list(sys.modules.keys()):
            if "app" in key:
                del sys.modules[key]
        from app.main import app

        # Find health route
        health_route = None
        for route in app.routes:
            if "/health" in route.path:
                health_route = route
                break

        if not health_route:
            raise RuntimeError("Health endpoint not found")

        return "Health endpoint defined"

    results["health"] = check("Health endpoint defined", test_health)

    # 7. REDIS (Optional)
    print(f"\n{Color.BLUE}7. OPTIONAL SERVICES{Color.RESET}")

    def test_redis():
        try:
            import redis

            r = redis.Redis(
                host="localhost", port=6379, decode_responses=True, socket_timeout=1
            )
            r.ping()
            return "Redis available"
        except:
            return None

    results["redis"] = check("Redis (optional)", test_redis, expected_success=False)

    # 8. SUMMARY
    print(f"\n{Color.BLUE}═══ SUMMARY ═══{Color.RESET}\n")

    critical = ["logging", "main", "database"]
    critical_pass = all(results.get(key, False) for key in critical)

    if critical_pass:
        print(f"{Color.GREEN}✓ API READY{Color.RESET}")
        print("  All critical checks passed. API should start successfully.")
        return 0
    else:
        print(f"{Color.RED}✗ API NOT READY{Color.RESET}")
        print("  Critical checks failed. See errors above.")
        return 1


if __name__ == "__main__":
    exit(diagnose())
