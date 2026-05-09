"""
Centralised logging configuration for AetherWave.

Priority order:
  1. Google Cloud Logging — activated when GOOGLE_CLOUD_PROJECT is set and
     Application Default Credentials (or a service account key via
     GOOGLE_APPLICATION_CREDENTIALS) are available.
  2. Structured JSON to stdout — the default for Docker deployments. Cloud
     Logging's Fluentd agent picks this up automatically when the container
     runs on GCP; locally it stays readable in Docker logs.
  3. SQLite table (app_logs) — for queryable analysis and pattern detection.

All loggers created with logging.getLogger(__name__) inherit this config.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import sys
from datetime import datetime
from threading import Lock


class SQLiteHandler(logging.Handler):
    """Log handler that persists records to SQLite for analysis."""

    def __init__(self, db_path: str | None = None):
        super().__init__()
        # Use provided path, or detect environment-appropriate default
        if db_path is None:
            if os.path.exists("/app/data"):
                db_path = "/app/data/aetherwave.db"
            else:
                db_path = "./data/aetherwave.db"
                os.makedirs("./data", exist_ok=True)
        self.db_path = db_path
        self.lock = Lock()
        self._init_table()

    def _init_table(self):
        """Create logs table if it doesn't exist."""
        try:
            with sqlite3.connect(self.db_path, timeout=2.0) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS app_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        component TEXT NOT NULL,
                        level TEXT NOT NULL,
                        message TEXT NOT NULL,
                        context TEXT,
                        exception TEXT
                    )
                """)
                # Create index for efficient queries
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON app_logs(timestamp)"
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_logs_level ON app_logs(level)"
                )
                conn.commit()
        except Exception as e:
            print(f"[logging] Failed to init logs table: {e}", file=sys.stderr)

    def emit(self, record: logging.LogRecord):
        """Write log record to SQLite."""
        try:
            with self.lock:
                msg = self.format(record)
                context = None
                exception = None

                # Try to parse JSON if formatted with JsonFormatter
                try:
                    data = json.loads(msg)
                    context = json.dumps(data)
                except (json.JSONDecodeError, TypeError):
                    # If not JSON, store as plain text
                    context = msg

                if record.exc_info:
                    exception = self.formatException(record.exc_info)

                # Use timeout to prevent blocking on database locks
                with sqlite3.connect(self.db_path, timeout=2.0) as conn:
                    conn.execute(
                        """
                        INSERT INTO app_logs
                        (timestamp, component, level, message, context, exception)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            datetime.utcnow().isoformat(),
                            record.name,
                            record.levelname,
                            record.getMessage(),
                            context,
                            exception,
                        ),
                    )
                    conn.commit()
        except Exception:
            self.handleError(record)


def setup_logging() -> None:
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    # ── Option 1: Google Cloud Logging ────────────────────────────────
    gcp_project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT")
    if gcp_project:
        try:
            import google.cloud.logging as cloud_logging  # type: ignore
            from google.cloud.logging.handlers import CloudLoggingHandler  # type: ignore

            client = cloud_logging.Client(project=gcp_project)
            handler = CloudLoggingHandler(client)
            handler.setLevel(log_level)

            root = logging.getLogger()
            root.setLevel(log_level)
            root.handlers.clear()
            root.addHandler(handler)

            # Also keep stderr for local visibility
            stderr_handler = logging.StreamHandler(sys.stderr)
            stderr_handler.setLevel(log_level)
            root.addHandler(stderr_handler)

            logging.getLogger(__name__).info(
                "Google Cloud Logging active",
                extra={"project": gcp_project},
            )
            return
        except Exception as exc:
            # Fall through to JSON logging — don't crash on missing creds
            print(f"[logging_config] Cloud Logging unavailable: {exc}", file=sys.stderr)

    # ── Option 2: Structured JSON to stdout ───────────────────────────
    try:
        from pythonjsonlogger import jsonlogger  # type: ignore

        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
            rename_fields={"levelname": "severity", "asctime": "timestamp"},
        )
    except ImportError:
        # Graceful fallback if python-json-logger not installed yet
        formatter = logging.Formatter(  # type: ignore[assignment]
            "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers.clear()
    root.addHandler(handler)

    # Add SQLite handler for queryable logs (always active, errors suppressed)
    # NOTE: Temporarily disabled due to database blocking issue on first logger.info() call
    # TODO: Investigate root cause - likely database lock timeout even with timeout parameter
    # try:
    #     sqlite_handler = SQLiteHandler()
    #     sqlite_handler.setLevel(logging.INFO)  # Only store INFO and above
    #     root.addHandler(sqlite_handler)
    # except Exception as e:
    #     print(f"[logging] SQLite handler unavailable: {e}", file=sys.stderr)

    # Quieten noisy third-party loggers
    for noisy in ("httpx", "httpcore", "urllib3", "uvicorn.access"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
