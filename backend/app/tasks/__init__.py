"""
Celery application configuration.

The broker URL defaults to the Docker-internal Redis address.

Beat schedule (periodic tasks):
  cleanup_expired_drafts     — runs daily; deletes Artist rows where
                               status='draft' and expires_at < now().
  autopublish_pending_artists — runs every 10 seconds; finalises Artist
                               rows where status='pending_publish' and
                               undo_expires_at < now() by flipping them
                               to status='published'.
"""

import logging
import os
from datetime import datetime, timezone

from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init

from app.logging_config import setup_logging

logger = logging.getLogger(__name__)


@worker_process_init.connect
def init_worker_logging(**_kwargs):
    """Set up structured logging in each Celery worker process."""
    setup_logging()

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "aetherwave",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.synthesis"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # one task at a time (AI calls are slow)
    beat_schedule={
        # Daily cleanup: remove expired AI-drafted DJs.
        "cleanup-expired-drafts": {
            "task": "app.tasks.cleanup.cleanup_expired_drafts",
            "schedule": crontab(hour=3, minute=0),  # 03:00 UTC daily
        },
        # Frequent auto-publish: finalise DJs past their undo window.
        "autopublish-pending-artists": {
            "task": "app.tasks.cleanup.autopublish_pending_artists",
            "schedule": 10.0,  # every 10 seconds
        },
    },
)


# ── Periodic task implementations ────────────────────────────────────

@celery_app.task(name="app.tasks.cleanup.cleanup_expired_drafts", bind=True)
def cleanup_expired_drafts(self):
    """
    Delete Artist rows with status='draft' whose expires_at is in the past.

    Runs daily via Celery beat at 03:00 UTC.
    Logs the count of deleted rows for auditing.
    """
    from app.database import SessionLocal
    from app.models.database import Artist

    now = datetime.now(timezone.utc)
    correlation_id = self.request.id or "no-task-id"
    db = SessionLocal()
    try:
        expired = (
            db.query(Artist)
            .filter(Artist.status == "draft", Artist.expires_at < now)
            .all()
        )
        count = len(expired)
        for artist in expired:
            db.delete(artist)
        db.commit()
        logger.info(
            "cleanup_expired_drafts: deleted=%d correlation=%s", count, correlation_id
        )
    except Exception as exc:
        logger.error(
            "cleanup_expired_drafts: error=%s correlation=%s", exc, correlation_id, exc_info=True
        )
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.cleanup.autopublish_pending_artists", bind=True)
def autopublish_pending_artists(self):
    """
    Finalise pending_publish Artist rows whose undo window has expired.

    Runs every 10 seconds via Celery beat.  Promotes status
    pending_publish → published for all rows where undo_expires_at < now().
    Logs the count of promoted records.
    """
    from app.database import SessionLocal
    from app.models.database import Artist

    now = datetime.now(timezone.utc)
    correlation_id = self.request.id or "no-task-id"
    db = SessionLocal()
    try:
        pending = (
            db.query(Artist)
            .filter(
                Artist.status == "pending_publish",
                Artist.undo_expires_at < now,
            )
            .all()
        )
        count = len(pending)
        for artist in pending:
            artist.status = "published"
            artist.undo_expires_at = None
            artist.updated_at = now
        db.commit()
        if count:
            logger.info(
                "autopublish_pending_artists: promoted=%d correlation=%s",
                count, correlation_id,
            )
    except Exception as exc:
        logger.error(
            "autopublish_pending_artists: error=%s correlation=%s",
            exc, correlation_id, exc_info=True,
        )
        db.rollback()
        raise
    finally:
        db.close()
