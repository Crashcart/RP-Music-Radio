"""Pytest fixtures for AetherWave API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db

# Import all ORM models so they're registered with Base.metadata before create_all()
from app.models.database import (
    Artist,
    Brand,
    Draft,
    GenerationHistory,
    Jingle,
    Station,
    Universe,
)

# NOTE: app.main import moved to client() fixture to avoid pytest discovery hang
# See .github/ROOT_CAUSE_API_HANG.md


@pytest.fixture(scope="session")
def db_engine():
    """Create an in-memory SQLite engine for testing.

    FastAPI's TestClient runs the app in a separate worker thread, so the
    default per-thread SQLite connection check must be disabled and a
    StaticPool used to share the single in-memory connection across
    threads (otherwise: "SQLite objects created in a thread can only be
    used in that same thread").
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(db_engine):
    """Create a new database session for each test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Create a test client with dependency injection."""
    # Lazy import: only import app when fixture is used (fixes pytest discovery hang)
    from app.main import app

    def override_get_db():
        return db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        # Prime the CSRF double-submit cookie: any safe (GET) request causes
        # CSRFMiddleware to issue a `csrf_token` cookie. We then mirror it into
        # the default X-CSRF-Token header so mutating requests (POST/PATCH/
        # DELETE) pass CSRF validation without each test handling it.
        test_client.get("/")
        csrf_token = test_client.cookies.get("csrf_token")
        if csrf_token:
            test_client.headers.update({"X-CSRF-Token": csrf_token})
        yield test_client

    app.dependency_overrides.clear()
