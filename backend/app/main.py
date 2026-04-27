"""
AetherWave API — FastAPI application entry point.

Wires up:
  - Database initialization (auto-creates tables at startup)
  - CORS middleware (allows frontend at port 8432 to call API at port 8000)
  - API v1 router with all 5 core endpoints
  - Health check endpoint
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api.v1.routes import router as v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="AetherWave API",
    description="Headless Media Factory — Procedural Lore-Heavy Radio Content Generator",
    version="1.0.4",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8432",
        "http://localhost:5173",
        "http://127.0.0.1:8432",
        "http://127.0.0.1:5173",
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
