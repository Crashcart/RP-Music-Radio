"""
AetherWave API — FastAPI application entry point.

Wires up:
  - Structured logging (JSON to stdout, or Google Cloud Logging if credentials present)
  - Database initialization (auto-creates tables at startup)
  - CORS middleware (allows frontend at port 8432 to call API at port 8000)
  - Request logging middleware with unique request IDs
  - API v1 router with all core endpoints
  - Health check endpoint
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.logging_config import setup_logging
from app.middleware import RequestLoggingMiddleware
from app.database import init_db
from app.api.v1.routes import router as v1_router

# Initialise logging before anything else
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AetherWave API starting up")
    init_db()
    yield
    logger.info("AetherWave API shut down")


app = FastAPI(
    title="AetherWave API",
    description="Headless Media Factory — Procedural Lore-Heavy Radio Content Generator",
    version="1.0.4",
    lifespan=lifespan,
)

# ── Middleware (order matters — outermost first) ───────────────────────
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8432",
        "http://localhost:5173",
        "http://127.0.0.1:8432",
        "http://127.0.0.1:5173",
        f"http://{os.getenv('API_HOST', 'boris.local')}:8432",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(v1_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AetherWave API", "version": "1.0.4"}


@app.get("/")
def read_root():
    return {
        "message": "Welcome to AetherWave",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
    }
