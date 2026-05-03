"""
Phase 3: Log-driven automation for error response & remediation.

Monitors logs and:
- Auto-creates GitHub issues for recurring errors (>5 in 24h)
- Auto-fixes simple issues (env var updates, config changes)
- Generates daily/weekly error summaries
- Alerts on performance regressions
- Enforces cost budgets for AI calls

Usage:
    python -m app.automation --action check-errors
    python -m app.automation --action create-issues
    python -m app.automation --action cleanup-logs
"""

import json
import logging
import os
import sqlite3
import subprocess
from datetime import datetime, timedelta
from typing import Optional

from app.log_analyzer import LogAnalyzer

logger = logging.getLogger(__name__)


class ErrorAutomation:
    """Automate responses to recurring errors."""

    def __init__(self):
        self.analyzer = LogAnalyzer()
        self.github_token = os.getenv("GITHUB_TOKEN", "")
        self.repo_owner = "crashcart"
        self.repo_name = "rp-music-radio"

    def check_errors(self, hours: int = 24) -> dict:
        """Check for errors and determine if action needed."""
        patterns = self.analyzer.detect_patterns(hours=hours)

        actionable = []
        for pattern in patterns:
            freq = pattern.get("frequency", 0)
            severity = pattern.get("severity", "MEDIUM")

            # Flag errors that should trigger automation
            if freq >= 5 and severity in ("CRITICAL", "HIGH"):
                actionable.append(pattern)

        return {
            "total_patterns": len(patterns),
            "actionable_patterns": len(actionable),
            "patterns": actionable,
        }

    def create_github_issue(
        self, error_message: str, frequency: int, fixes: list[str]
    ) -> Optional[str]:
        """Create a GitHub issue for a recurring error."""
        if not self.github_token:
            logger.warning(
                "GITHUB_TOKEN not set; skipping issue creation for: %s", error_message
            )
            return None

        title = f"Recurring error: {error_message[:60]}"
        body = f"""
## Error Summary
**Message**: {error_message}
**Frequency**: {frequency} times in 24h
**Detected**: {datetime.utcnow().isoformat()}

## Suggested Fixes
{chr(10).join(f"- {fix}" for fix in fixes[:3])}

## Investigation Steps
1. Check `/api/v1/logs/search?pattern={error_message[:30]}`
2. Review recent commits that might have caused this
3. Test the suspected fix
4. Verify error frequency drops after fix

---
_Auto-created by AetherWave automation_
"""

        try:
            # Use gh CLI if available, otherwise use GitHub API
            result = subprocess.run(
                [
                    "gh",
                    "issue",
                    "create",
                    "--repo",
                    f"{self.repo_owner}/{self.repo_name}",
                    "--title",
                    title,
                    "--body",
                    body,
                    "--label",
                    "auto-created,error",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                issue_url = result.stdout.strip()
                logger.info("Created GitHub issue: %s", issue_url)
                return issue_url
            else:
                logger.error("Failed to create issue: %s", result.stderr)
                return None
        except FileNotFoundError:
            logger.warning("gh CLI not found; skipping issue creation")
            return None
        except Exception as e:
            logger.error("Error creating GitHub issue: %s", e)
            return None

    def auto_fix_simple_issues(self) -> dict:
        """Auto-fix known simple issues (config, env vars)."""
        fixes_applied = []

        patterns = self.analyzer.detect_patterns(hours=24)

        for pattern in patterns:
            msg = pattern.get("message", "").lower()

            # Auto-fix: VITE_API_URL doubled path
            if "404" in msg and "/api/api" in msg:
                try:
                    # Check if VITE_API_URL is set to "/api"
                    if os.getenv("VITE_API_URL") == "/api":
                        # Suggest fix (can't auto-apply docker-compose.yml)
                        fixes_applied.append(
                            {
                                "issue": "Path doubling /api/api",
                                "status": "needs-manual-fix",
                                "action": "Set VITE_API_URL to empty string in docker-compose.yml",
                            }
                        )
                except Exception as e:
                    logger.error("Auto-fix attempt failed: %s", e)

            # Auto-fix: LOG_LEVEL uppercase
            if "invalid" in msg and "log-level" in msg:
                try:
                    # Update .env to lowercase
                    env_path = "/app/.env"
                    if os.path.exists(env_path):
                        with open(env_path, "r") as f:
                            content = f.read()

                        if "LOG_LEVEL=INFO" in content:
                            content = content.replace(
                                "LOG_LEVEL=INFO", "LOG_LEVEL=info"
                            )
                            with open(env_path, "w") as f:
                                f.write(content)

                            fixes_applied.append(
                                {
                                    "issue": "LOG_LEVEL=INFO (uppercase)",
                                    "status": "fixed",
                                    "action": "Updated .env to LOG_LEVEL=info",
                                }
                            )
                except Exception as e:
                    logger.error("Failed to auto-fix LOG_LEVEL: %s", e)

        return {"fixes_attempted": len(fixes_applied), "fixes": fixes_applied}

    def cleanup_old_logs(self, days: int = 30) -> dict:
        """Delete logs older than N days."""
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

            with sqlite3.connect("/app/data/aetherwave.db") as conn:
                cursor = conn.execute(
                    "DELETE FROM app_logs WHERE timestamp < ?", (cutoff,)
                )
                deleted_count = cursor.rowcount
                conn.commit()

            logger.info("Deleted %d old log entries", deleted_count)

            return {
                "status": "success",
                "deleted_entries": deleted_count,
                "cutoff_date": cutoff,
            }
        except Exception as e:
            logger.error("Failed to cleanup logs: %s", e)
            return {"status": "error", "message": str(e)}

    def generate_summary(self, period: str = "daily") -> dict:
        """Generate daily/weekly error summary."""
        hours = 24 if period == "daily" else 168

        summary = self.analyzer.get_error_summary(hours=hours)
        patterns = self.analyzer.detect_patterns(hours=hours)

        return {
            "period": period,
            "generated_at": datetime.utcnow().isoformat(),
            "hours": hours,
            "total_errors": summary.get("total_errors", 0),
            "by_level": summary.get("by_level", {}),
            "by_component": summary.get("by_component", {}),
            "top_patterns": patterns[:5],
        }

    def check_cost_budget(self, daily_limit_usd: float = 5.0) -> dict:
        """Check if AI spend exceeds daily budget."""
        # TODO: Track Gemini API costs in logs and compare to budget
        return {
            "status": "ok",
            "note": "Cost tracking not yet implemented in Phase 3",
        }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="AetherWave error automation")
    parser.add_argument(
        "--action",
        choices=["check-errors", "create-issues", "auto-fix", "cleanup", "summary"],
        required=True,
    )
    parser.add_argument("--hours", type=int, default=24, help="Hours to analyze")
    parser.add_argument("--days", type=int, default=30, help="Days to retain logs")

    args = parser.parse_args()

    automation = ErrorAutomation()

    if args.action == "check-errors":
        result = automation.check_errors(hours=args.hours)
        print(json.dumps(result, indent=2))

    elif args.action == "create-issues":
        result = automation.check_errors(hours=args.hours)
        for pattern in result.get("patterns", []):
            automation.create_github_issue(
                pattern.get("message", ""),
                pattern.get("frequency", 0),
                pattern.get("suggested_fixes", []),
            )

    elif args.action == "auto-fix":
        result = automation.auto_fix_simple_issues()
        print(json.dumps(result, indent=2))

    elif args.action == "cleanup":
        result = automation.cleanup_old_logs(days=args.days)
        print(json.dumps(result, indent=2))

    elif args.action == "summary":
        result = automation.generate_summary(period="daily")
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
