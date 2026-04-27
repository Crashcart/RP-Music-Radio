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
    """Create all tables (used at startup if no Alembic migrations yet)."""
    Base.metadata.create_all(bind=engine)
