"""
Celery application configuration.

The broker URL defaults to the Docker-internal Redis address.
"""

import os

from celery import Celery

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
