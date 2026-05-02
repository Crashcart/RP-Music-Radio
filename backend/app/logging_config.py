"""
Centralised logging configuration for AetherWave.

Priority order:
  1. Google Cloud Logging — activated when GOOGLE_CLOUD_PROJECT is set and
     Application Default Credentials (or a service account key via
     GOOGLE_APPLICATION_CREDENTIALS) are available.
  2. Structured JSON to stdout — the default for Docker deployments. Cloud
     Logging's Fluentd agent picks this up automatically when the container
     runs on GCP; locally it stays readable in Docker logs.

All loggers created with logging.getLogger(__name__) inherit this config.
"""

from __future__ import annotations

import logging
import os
import sys


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

    # Quieten noisy third-party loggers
    for noisy in ("httpx", "httpcore", "urllib3", "uvicorn.access"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
