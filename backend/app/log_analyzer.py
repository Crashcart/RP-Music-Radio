"""
Simple log analyzer for AetherWave.

Query the app_logs SQLite table to find issues, patterns, and errors.
Used by Claude Code session to auto-analyze and suggest fixes.
"""

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


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
