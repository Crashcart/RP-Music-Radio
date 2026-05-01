"""
Celery application configuration.

The broker URL defaults to the Docker-internal Redis address.
"""

import os

from celery import Celery
from celery.signals import worker_process_init

from app.logging_config import setup_logging


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
)
