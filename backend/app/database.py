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
    """Initialise or migrate the database at startup.

    Strategy:
      - Fresh database (no tables yet): create all tables from ORM models via
        create_all(), then stamp Alembic to 'head' so future runs know all
        migrations have already been applied.
      - Existing database: run 'alembic upgrade head' to apply any missing
        column additions without touching existing rows.

    This avoids the "no such table: artists" error that occurs when Alembic
    tries to ALTER TABLE on a table that hasn't been created yet.
    """
    import logging

    import sqlalchemy as sa

    logger = logging.getLogger(__name__)

    # Detect fresh database by checking for a core table.
    with engine.connect() as conn:
        result = conn.execute(
            sa.text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='stations'"
            )
        )
        is_fresh = result.fetchone() is None

    try:
        from alembic import command
        from alembic.config import Config

        ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        ini_path = os.path.abspath(ini_path)

        if not os.path.exists(ini_path):
            raise FileNotFoundError(f"alembic.ini not found at {ini_path}")

        alembic_cfg = Config(ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)

        if is_fresh:
            # Create all tables from ORM, then stamp so migrations don't re-run
            Base.metadata.create_all(bind=engine)
            command.stamp(alembic_cfg, "head")
            logger.info("Fresh database: tables created and stamped at head")
        else:
            # Existing database: apply any missing column migrations
            command.upgrade(alembic_cfg, "head")
            logger.info("Existing database: alembic upgrade head complete")

    except Exception as exc:
        logger.warning("Alembic unavailable, using create_all fallback: %s", exc)
        Base.metadata.create_all(bind=engine)
