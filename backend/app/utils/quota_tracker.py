"""
Quota tracking service for Gemini API usage.

Tracks monthly token consumption and provides quota status information.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import extract, func

from app.database import SessionLocal
from app.models.database import TokenUsageLog

logger = logging.getLogger(__name__)


def get_monthly_usage() -> int:
    """Get total tokens used in current month (input + output)."""
    try:
        db = SessionLocal()
        now = datetime.now(timezone.utc)

        result = (
            db.query(
                func.sum(TokenUsageLog.prompt_tokens + TokenUsageLog.completion_tokens)
            )
            .filter(
                extract("month", TokenUsageLog.created_at) == now.month,
                extract("year", TokenUsageLog.created_at) == now.year,
            )
            .scalar()
        )

        return result or 0
    except Exception as exc:
        logger.error("Failed to get monthly usage: %s", exc)
        return 0
    finally:
        db.close()


def get_quota_limit() -> int:
    """Get monthly quota limit from environment (default 1M tokens)."""
    try:
        limit = int(os.getenv("GOOGLE_API_QUOTA_MONTHLY", "1000000"))
        return limit
    except ValueError:
        logger.warning("Invalid GOOGLE_API_QUOTA_MONTHLY value, using default")
        return 1000000


def get_usage_percentage() -> float:
    """Get percentage of quota used (0-100)."""
    used = get_monthly_usage()
    limit = get_quota_limit()
    if limit <= 0:
        return 0.0
    return round((used / limit) * 100, 2)


def is_quota_exceeded() -> bool:
    """Check if quota is exhausted (>= 100%)."""
    return get_usage_percentage() >= 100.0


def get_warning_level() -> str:
    """Get warning level based on usage percentage."""
    percentage = get_usage_percentage()
    if percentage >= 95:
        return "critical"
    elif percentage >= 80:
        return "warning"
    return "normal"


def get_days_until_reset() -> int:
    """Estimate days until monthly quota resets (next 1st of month)."""
    now = datetime.now(timezone.utc)
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        reset_date = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)

    days = (reset_date - now).days
    return max(0, days)


def get_usage_stats() -> dict:
    """Get complete usage statistics for display."""
    used = get_monthly_usage()
    limit = get_quota_limit()
    percentage = get_usage_percentage()
    days_until_reset = get_days_until_reset()
    warning_level = get_warning_level()

    return {
        "tokens_used": used,
        "quota_limit": limit,
        "usage_percentage": percentage,
        "reset_date": f"{datetime.now(timezone.utc).year}-{datetime.now(timezone.utc).month + 1 if datetime.now(timezone.utc).month < 12 else 1:02d}-01",
        "days_until_reset": days_until_reset,
        "is_quota_exceeded": is_quota_exceeded(),
        "warning_level": warning_level,
    }
