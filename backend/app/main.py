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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.logging_config import setup_logging
from app.middleware import CSRFMiddleware, RequestLoggingMiddleware
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
# RequestLoggingMiddleware wraps everything so all requests are logged.
app.add_middleware(RequestLoggingMiddleware)

# CSRFMiddleware validates X-CSRF-Token on all mutating requests (POST/PATCH/PUT/DELETE).
# Must sit inside the CORS middleware so that preflight OPTIONS requests (from CORS)
# are NOT blocked by CSRF validation.
app.add_middleware(CSRFMiddleware)

# CORS: restrict to known frontend origins only.
# allow_credentials=False — this is an API-only backend; no cookie-based auth.
# X-CSRF-Token is a custom header and is explicitly allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8432",
        "http://localhost:5173",
        "http://127.0.0.1:8432",
        "http://127.0.0.1:5173",
        f"http://{os.getenv('API_HOST', 'boris.local')}:8432",
    ],
    allow_credentials=True,  # Required so the csrf_token cookie is sent cross-origin
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-Id"],
)


# ── Validation Error Handler ──────────────────────────────────────────
# Convert Pydantic 422 ValidationErrors into user-readable messages so the
# frontend (ChatAssistant staging flow) can surface them without exposing raw
# Python type names.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    # Build a human-readable summary of the first error
    first = errors[0] if errors else {}
    loc = first.get("loc", [])
    field = str(loc[-1]) if loc else "field"
    raw_msg = first.get("msg", "invalid value")

    # Map common Pydantic messages to friendlier versions
    friendly_map = {
        "field required": f"{field} is required",
        "value is not a valid string": f"{field} must be text",
        "ensure this value has at least 1 characters": f"{field} cannot be blank",
    }
    friendly_msg = friendly_map.get(raw_msg, f"{field}: {raw_msg}")

    logger.warning(
        "Validation error on %s %s: %s",
        request.method,
        request.url.path,
        errors,
    )
    return JSONResponse(
        status_code=422,
        content={"error": friendly_msg, "code": "validation_error", "details": errors},
    )


# ── Routes ────────────────────────────────────────────────────────────
app.include_router(v1_router)

# ── Static Files (for generated art) ───────────────────────────────────
# Serve generated images (station art, DJ portraits, brand logos) from /output
output_dir = Path("/app/output")
output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")
logger.info("Static files mounted at /output")


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
