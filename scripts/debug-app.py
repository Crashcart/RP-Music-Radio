#!/usr/bin/env python3
"""
Debug routine for AetherWave on boris.local

Checks:
- API health
- Recent errors (past 24h)
- Error frequency
- Slow endpoints
- System status

Usage:
    python scripts/debug-app.py
    python scripts/debug-app.py --hours 6
    python scripts/debug-app.py --errors-only
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: requests library not found. Install with: pip install requests")
    sys.exit(1)


class Debugger:
    def __init__(self, base_url: str = "http://localhost:8432"):
        self.base_url = base_url.rstrip("/")
        self.api_base = f"http://localhost:8433"  # API port internally

    def check_api_health(self) -> dict:
        """Check if API is responsive."""
        try:
            resp = requests.get(f"{self.api_base}/health", timeout=2)
            return {"ok": resp.status_code == 200, "status": resp.status_code}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def check_frontend_health(self) -> dict:
        """Check if frontend is accessible."""
        try:
            resp = requests.get(f"{self.base_url}/", timeout=2)
            return {"ok": resp.status_code == 200, "status": resp.status_code}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_error_summary(self, hours: int = 24) -> dict:
        """Fetch error summary from API."""
        try:
            resp = requests.get(
                f"{self.api_base}/api/v1/logs/summary?hours={hours}", timeout=5
            )
            return resp.json() if resp.status_code == 200 else {"error": "Failed"}
        except Exception as e:
            return {"error": str(e)}

    def get_recent_errors(self, hours: int = 24, limit: int = 10) -> list:
        """Fetch recent error logs."""
        try:
            resp = requests.get(
                f"{self.api_base}/api/v1/logs/errors?hours={hours}", timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("errors", [])[:limit]
            return []
        except Exception as e:
            return []

    def get_api_latency(self) -> dict:
        """Check API response time."""
        import time

        try:
            start = time.time()
            resp = requests.get(f"{self.api_base}/health", timeout=2)
            latency_ms = (time.time() - start) * 1000
            return {"ok": True, "latency_ms": round(latency_ms, 2)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def print_header(self, text: str):
        """Print a formatted header."""
        print(f"\n{'=' * 60}")
        print(f"  {text}")
        print(f"{'=' * 60}")

    def print_status(self, name: str, status: bool, details: str = ""):
        """Print a status line."""
        emoji = "✅" if status else "❌"
        print(f"{emoji} {name:30} {details}")

    def run(self, hours: int = 24, errors_only: bool = False):
        """Run full debug routine."""
        print(f"\n🔍 AetherWave Debug Routine")
        print(f"📍 Target: {self.base_url}")
        print(f"⏰ Time: {datetime.now().isoformat()}")

        # ── Health Checks ───────────────────────────────────────────
        if not errors_only:
            self.print_header("Health Checks")

            api_health = self.check_api_health()
            self.print_status("API (/health)", api_health["ok"])

            frontend_health = self.check_frontend_health()
            self.print_status("Frontend", frontend_health["ok"])

            latency = self.get_api_latency()
            if latency["ok"]:
                self.print_status(
                    "API Latency",
                    latency["latency_ms"] < 100,
                    f"({latency['latency_ms']}ms)",
                )
            else:
                self.print_status("API Latency", False, f"({latency['error']})")

        # ── Error Summary ───────────────────────────────────────────
        self.print_header(f"Error Summary (past {hours}h)")

        summary = self.get_error_summary(hours=hours)
        if "error" not in summary:
            total = summary.get("total_errors", 0)
            by_level = summary.get("by_level", {})
            by_component = summary.get("by_component", {})

            print(f"Total errors: {total}")
            if by_level:
                print(f"By level: {json.dumps(by_level, indent=2)}")
            if by_component:
                print(f"By component:")
                for comp, count in sorted(
                    by_component.items(), key=lambda x: x[1], reverse=True
                )[:5]:
                    print(f"  {comp:30} {count}")

            # Top error messages
            top_msgs = summary.get("top_messages", {})
            if top_msgs:
                print(f"\nTop error messages:")
                for msg, count in list(top_msgs.items())[:5]:
                    print(f"  [{count:2}x] {msg[:70]}")
        else:
            print(f"ERROR: Could not fetch summary ({summary['error']})")

        # ── Recent Errors ───────────────────────────────────────────
        if not errors_only:
            self.print_header(f"Recent Errors (past {hours}h)")

            errors = self.get_recent_errors(hours=hours, limit=10)
            if errors:
                for i, err in enumerate(errors, 1):
                    ts = err.get("timestamp", "?")
                    level = err.get("level", "?")
                    comp = err.get("component", "?").split(".")[-1]
                    msg = err.get("message", "")[:60]
                    print(f"{i:2}. [{ts[11:19]}] {level:8} {comp:15} {msg}")
            else:
                print("✅ No recent errors")

        # ── Recommendations ─────────────────────────────────────────
        self.print_header("Recommendations")

        if "error" not in summary:
            if summary.get("total_errors", 0) > 10:
                print("⚠️  High error rate (>10 in 24h). Check recent_errors above.")
            elif summary.get("total_errors", 0) > 0:
                print("⚠️  Some errors detected. Monitor and investigate.")
            else:
                print("✅ No errors detected. System healthy.")

            if summary.get("by_level", {}).get("CRITICAL", 0) > 0:
                print("🚨 CRITICAL errors detected. Immediate investigation needed.")

        print("\n" + "=" * 60)
        print(
            f"💡 For detailed logs: curl {self.api_base}/api/v1/logs/errors?hours={hours}"
        )
        print(
            f"💡 To search errors: curl '{self.api_base}/api/v1/logs/search?pattern=timeout'"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Debug routine for AetherWave on boris.local"
    )
    parser.add_argument(
        "--hours", type=int, default=24, help="Hours to analyze (default: 24)"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8432",
        help="Frontend URL (default: http://localhost:8432)",
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:8433",
        help="API URL (default: http://localhost:8433)",
    )
    parser.add_argument(
        "--errors-only",
        action="store_true",
        help="Show only errors (skip health checks)",
    )

    args = parser.parse_args()

    debugger = Debugger(base_url=args.url)
    debugger.api_base = args.api_url
    debugger.run(hours=args.hours, errors_only=args.errors_only)


if __name__ == "__main__":
    main()
