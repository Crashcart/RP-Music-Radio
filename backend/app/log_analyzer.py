"""
Simple log analyzer for AetherWave.

Query the app_logs SQLite table to find issues, patterns, and errors.
Used by Claude Code session to auto-analyze and suggest fixes.

Phase 2: Pattern detection + fix suggestions for recurring errors.
"""

import json
import re
import sqlite3
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

# ── Fix Suggestion Catalog ──────────────────────────────────────────
# Maps error patterns to common causes and suggested fixes

FIX_CATALOG = {
    "404": {
        "causes": [
            "Endpoint does not exist",
            "Path prefix doubled (e.g., /api/api/v1)",
            "VITE_API_URL set incorrectly",
        ],
        "fixes": [
            "Verify endpoint path in routes.py",
            "Check VITE_API_URL environment variable (should be empty or /api)",
            "Inspect browser network tab for actual URL being called",
        ],
    },
    "timeout": {
        "causes": [
            "Slow database query",
            "API response too slow",
            "Network latency",
            "Resource exhaustion",
        ],
        "fixes": [
            "Add database indexes for slow queries",
            "Increase request timeout",
            "Check system CPU/memory usage",
            "Paginate large result sets",
        ],
    },
    "CSRF": {
        "causes": [
            "CSRF token missing or expired",
            "Cookie not being read by frontend",
            "Request doesn't include X-CSRF-Token header",
        ],
        "fixes": [
            "Reload page to get fresh CSRF token",
            "Verify api/client.ts is reading csrf_token cookie",
            "Check browser developer tools > Network tab for headers",
        ],
    },
    "Gemini": {
        "causes": [
            "Invalid model name (e.g., gemini-2.0-flash deprecated)",
            "API key invalid or expired",
            "Rate limit exceeded",
        ],
        "fixes": [
            "Update model to gemini-2.5-flash",
            "Verify GOOGLE_API_KEY in Settings",
            "Wait before retrying (rate limit)",
        ],
    },
    "validation": {
        "causes": [
            "Required field missing or invalid type",
            "String too long or too short",
            "Invalid enum value",
        ],
        "fixes": [
            "Check Pydantic schema for field requirements",
            "Inspect error message for field name",
            "Adjust request data to match schema",
        ],
    },
}


@dataclass
class LogEntry:
    timestamp: str
    component: str
    level: str
    message: str
    context: Optional[dict] = None
    exception: Optional[str] = None

    def __repr__(self):
        ctx_str = f" | {json.dumps(self.context)}" if self.context else ""
        return f"[{self.timestamp}] {self.level:8} {self.component:20} {self.message}{ctx_str}"


class LogAnalyzer:
    def __init__(self, db_path: str = "/app/data/aetherwave.db"):
        self.db_path = db_path

    def query_logs(
        self,
        hours: int = 24,
        level: Optional[str] = None,
        component: Optional[str] = None,
        limit: int = 100,
    ) -> list[LogEntry]:
        """
        Query logs from the past N hours.

        Args:
            hours: How many hours back to search
            level: Filter by level (ERROR, WARN, INFO, etc.)
            component: Filter by component (app.api, app.middleware, etc.)
            limit: Max results to return

        Returns:
            List of LogEntry objects
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                query = "SELECT timestamp, component, level, message, context, exception FROM app_logs WHERE 1=1"
                params = []

                # Time filter
                cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
                query += " AND timestamp > ?"
                params.append(cutoff)

                # Level filter
                if level:
                    query += " AND level = ?"
                    params.append(level.upper())

                # Component filter
                if component:
                    query += " AND component LIKE ?"
                    params.append(f"%{component}%")

                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)

                cursor = conn.execute(query, params)
                rows = cursor.fetchall()

                entries = []
                for row in rows:
                    timestamp, comp, lvl, msg, ctx_str, exc = row
                    ctx = None
                    if ctx_str:
                        try:
                            ctx = json.loads(ctx_str)
                        except json.JSONDecodeError:
                            ctx = {"raw": ctx_str}

                    entries.append(
                        LogEntry(
                            timestamp=timestamp,
                            component=comp,
                            level=lvl,
                            message=msg,
                            context=ctx,
                            exception=exc,
                        )
                    )

                return entries
        except sqlite3.OperationalError as e:
            print(f"Log table not found or DB error: {e}")
            return []

    def find_errors(self, hours: int = 24, limit: int = 50) -> list[LogEntry]:
        """Find all ERROR and CRITICAL logs in the past N hours."""
        errors = self.query_logs(hours=hours, level="ERROR", limit=limit)
        errors.extend(self.query_logs(hours=hours, level="CRITICAL", limit=limit))
        return sorted(errors, key=lambda x: x.timestamp, reverse=True)

    def find_pattern(
        self, pattern: str, hours: int = 24, limit: int = 50
    ) -> list[LogEntry]:
        """Find logs matching a pattern (case-insensitive substring)."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                query = """
                    SELECT timestamp, component, level, message, context, exception
                    FROM app_logs
                    WHERE timestamp > ? AND message LIKE ?
                    ORDER BY timestamp DESC LIMIT ?
                """
                cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
                cursor = conn.execute(query, (cutoff, f"%{pattern}%", limit))
                rows = cursor.fetchall()

                entries = []
                for row in rows:
                    timestamp, comp, lvl, msg, ctx_str, exc = row
                    ctx = None
                    if ctx_str:
                        try:
                            ctx = json.loads(ctx_str)
                        except json.JSONDecodeError:
                            ctx = {"raw": ctx_str}
                    entries.append(
                        LogEntry(
                            timestamp=timestamp,
                            component=comp,
                            level=lvl,
                            message=msg,
                            context=ctx,
                            exception=exc,
                        )
                    )

                return entries
        except sqlite3.OperationalError:
            return []

    def get_error_summary(self, hours: int = 24) -> dict:
        """Get a summary of errors in the past N hours."""
        errors = self.find_errors(hours=hours, limit=1000)

        summary = {
            "total_errors": len(errors),
            "time_range_hours": hours,
            "by_level": {"ERROR": 0, "CRITICAL": 0, "WARNING": 0},
            "by_component": {},
            "top_messages": {},
        }

        for entry in errors:
            # Count by level
            summary["by_level"][entry.level] = (
                summary["by_level"].get(entry.level, 0) + 1
            )

            # Count by component
            summary["by_component"][entry.component] = (
                summary["by_component"].get(entry.component, 0) + 1
            )

            # Count by message (to find patterns)
            summary["top_messages"][entry.message] = (
                summary["top_messages"].get(entry.message, 0) + 1
            )

        # Sort top messages
        summary["top_messages"] = dict(
            sorted(summary["top_messages"].items(), key=lambda x: x[1], reverse=True)[
                :10
            ]
        )

        return summary

    def detect_patterns(self, hours: int = 24) -> list[dict]:
        """
        Detect recurring error patterns.

        Returns patterns with:
        - Error message
        - Frequency (how many times)
        - Severity (ERROR, CRITICAL)
        - Suggested fixes from catalog
        """
        errors = self.find_errors(hours=hours, limit=1000)

        # Group by message
        message_counts = Counter(e.message for e in errors)

        patterns = []
        for message, count in message_counts.most_common(20):
            if count < 3:  # Only patterns with 3+ occurrences
                break

            # Find matching fixes from catalog
            suggested_fixes = self._suggest_fixes(message)

            patterns.append(
                {
                    "message": message,
                    "frequency": count,
                    "hours": hours,
                    "severity": self._infer_severity(message),
                    "suggested_fixes": suggested_fixes,
                    "next_steps": self._generate_next_steps(message),
                }
            )

        return patterns

    def _suggest_fixes(self, error_message: str) -> list[str]:
        """Look up suggested fixes from catalog based on error message."""
        fixes = []

        for keyword, catalog_entry in FIX_CATALOG.items():
            if keyword.lower() in error_message.lower():
                fixes.extend(catalog_entry.get("fixes", []))
                break

        # Generic fallback fixes
        if not fixes:
            fixes = [
                "Check the error message for specifics",
                "Search logs for more context: grep for similar errors",
                "Review recent code changes that might have caused this",
            ]

        return fixes[:3]  # Return top 3

    def _infer_severity(self, error_message: str) -> str:
        """Infer severity from error message."""
        if "critical" in error_message.lower() or "fatal" in error_message.lower():
            return "CRITICAL"
        elif "timeout" in error_message.lower() or "exhausted" in error_message.lower():
            return "HIGH"
        else:
            return "MEDIUM"

    def _generate_next_steps(self, error_message: str) -> list[str]:
        """Generate next steps based on error type."""
        steps = []

        if "404" in error_message:
            steps = [
                "1. Verify the endpoint exists in routes.py",
                "2. Check browser network tab for actual URL",
                "3. Look for /api/api prefix (path doubling)",
            ]
        elif "timeout" in error_message.lower():
            steps = [
                "1. Check system CPU/memory usage",
                "2. Look for slow queries in logs",
                "3. Increase timeout if legitimate",
            ]
        elif "csrf" in error_message.lower():
            steps = [
                "1. Reload the page",
                "2. Check api/client.ts token handling",
                "3. Clear browser cookies and retry",
            ]
        else:
            steps = [
                "1. Review the full error message in logs",
                "2. Check recent git commits for causes",
                "3. Search codebase for similar errors",
            ]

        return steps


# CLI for quick access
if __name__ == "__main__":
    import sys

    analyzer = LogAnalyzer()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m app.log_analyzer errors [hours]")
        print("  python -m app.log_analyzer search <pattern> [hours]")
        print("  python -m app.log_analyzer summary [hours]")
        sys.exit(1)

    cmd = sys.argv[1]
    hours = int(sys.argv[3]) if len(sys.argv) > 3 else 24

    if cmd == "errors":
        errors = analyzer.find_errors(hours=hours)
        for entry in errors[:20]:
            print(entry)
            if entry.exception:
                print(f"  Exception: {entry.exception[:200]}")

    elif cmd == "search":
        pattern = sys.argv[2]
        results = analyzer.find_pattern(pattern, hours=hours)
        print(f"Found {len(results)} matches for '{pattern}':")
        for entry in results[:20]:
            print(entry)

    elif cmd == "summary":
        summary = analyzer.get_error_summary(hours=hours)
        print(f"Error Summary (past {hours} hours):")
        print(f"  Total errors: {summary['total_errors']}")
        print(f"  By level: {summary['by_level']}")
        print(f"  By component: {summary['by_component']}")
        print(f"  Top error messages:")
        for msg, count in list(summary["top_messages"].items())[:10]:
            print(f"    [{count}x] {msg[:80]}")
