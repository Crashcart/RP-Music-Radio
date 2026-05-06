"""
Database session configuration.

Uses SQLAlchemy async-compatible session factory.
The DATABASE_URL is read from environment, defaulting to the Docker-mapped
SQLite path at /app/data/aetherwave.db.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# In Docker: sqlite:////app/data/aetherwave.db
# Locally:  sqlite:///./data/aetherwave.db
_default_db = "sqlite:////app/data/aetherwave.db"
if not os.path.exists("/app/data"):
    os.makedirs("data", exist_ok=True)
    _default_db = "sqlite:///./data/aetherwave.db"

DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

# SQLite needs check_same_thread=False for FastAPI's threaded request model
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""

    pass


def get_db():
    """FastAPI dependency that yields a DB session and auto-closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Migrate the database to the latest schema at startup.

    Runs `alembic upgrade head` so that any missing columns (e.g. added to
    ORM models but not yet present in an existing SQLite file) are applied
    automatically.  Falls back to create_all() if Alembic is unavailable or
    the alembic.ini cannot be located (e.g. during unit tests).
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        from alembic import command
        from alembic.config import Config

        # Locate alembic.ini relative to this file: backend/alembic.ini
        ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        ini_path = os.path.abspath(ini_path)

        if os.path.exists(ini_path):
            alembic_cfg = Config(ini_path)
            # Override the DB URL so Alembic uses the same connection as the app
            alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied (alembic upgrade head)")
            return
    except Exception as exc:
        logger.warning("Alembic migration failed, falling back to create_all: %s", exc)

    # Fallback: create tables from ORM definitions (won't add missing columns)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created via create_all fallback")
