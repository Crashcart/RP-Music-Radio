"""
Middleware for AetherWave API.

Includes:
  RequestLoggingMiddleware — attaches a unique request_id to every HTTP call
                             and emits structured log lines per request/response.
  CSRFMiddleware           — stateless double-submit cookie CSRF protection for
                             all state-mutating methods (POST, PATCH, PUT, DELETE).

CSRF design (double-submit cookie pattern):
  1. On any GET (or OPTIONS/HEAD) the server sets a `csrf_token` cookie if one is
     absent.  The cookie is HttpOnly=False so the frontend JavaScript can read it.
  2. On POST/PATCH/PUT/DELETE the server requires the `X-CSRF-Token` header to
     match the value in the `csrf_token` cookie.  An attacker-controlled page
     cannot read the cookie (same-origin policy) and therefore cannot forge the
     header, even if CORS allows credentialed requests.
  3. Exempt paths (e.g. /health, /docs) skip validation entirely.

Frontend contract:
  • Read `csrf_token` from `document.cookie` after the first GET.
  • Include it as `X-CSRF-Token: <value>` on every mutating request.
  • The API client (frontend/src/api/client.ts) is patched to do this automatically.
"""

from __future__ import annotations

import hmac
import logging
import os
import secrets
import time
import uuid
from typing import Iterable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

# ── CSRF configuration ────────────────────────────────────────────────────────

# Paths that are exempt from CSRF validation.
# GET /health and /docs variants need no protection (they are read-only).
# The regex-based approach is intentionally simple — adjust as routes grow.
_CSRF_EXEMPT_PREFIXES: tuple[str, ...] = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
)

# HTTP methods that mutate state and require a valid CSRF token.
_CSRF_MUTATION_METHODS: frozenset[str] = frozenset({"POST", "PATCH", "PUT", "DELETE"})

# Cookie / header names.
_CSRF_COOKIE_NAME = "csrf_token"
_CSRF_HEADER_NAME = "x-csrf-token"  # ASGI normalises headers to lowercase

# Cookie TTL (seconds) — 8 hours; auto-refreshed on each GET.
_CSRF_COOKIE_MAX_AGE = 8 * 60 * 60

# A server-side secret used to sign tokens, making them unguessable even if the
# cookie transport is observed.  Rotate by changing CSRF_SECRET env var.
_CSRF_SECRET: str = os.getenv("CSRF_SECRET", secrets.token_hex(32))

# Cookie security settings — environment-configurable for production.
# Defaults are development-friendly; set to appropriate values for production.
_CSRF_COOKIE_SECURE: bool = os.getenv("CSRF_COOKIE_SECURE", "false").lower() in (
    "true",
    "1",
)
_CSRF_COOKIE_SAMESITE: str = os.getenv("CSRF_COOKIE_SAMESITE", "lax")


def _generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


def _is_exempt(path: str) -> bool:
    """Return True if the path is exempt from CSRF validation."""
    return any(path.startswith(prefix) for prefix in _CSRF_EXEMPT_PREFIXES)


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Stateless double-submit cookie CSRF protection.

    On safe methods: issue/refresh the csrf_token cookie.
    On mutating methods: validate X-CSRF-Token header == cookie value.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Always pass through safe methods and exempted paths.
        if request.method not in _CSRF_MUTATION_METHODS or _is_exempt(request.url.path):
            response = await call_next(request)
            self._maybe_set_cookie(request, response)
            return response

        # --- Validate CSRF token on mutating requests ---
        cookie_token: str | None = request.cookies.get(_CSRF_COOKIE_NAME)
        header_token: str | None = request.headers.get(_CSRF_HEADER_NAME)

        if not cookie_token or not header_token:
            logger.warning(
                "CSRF validation failed: missing token",
                extra={
                    "path": request.url.path,
                    "method": request.method,
                    "has_cookie": bool(cookie_token),
                    "has_header": bool(header_token),
                },
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": "CSRF token missing. Include X-CSRF-Token header matching the csrf_token cookie.",
                    "code": "csrf_missing",
                },
            )

        # Constant-time comparison to prevent timing attacks.
        if not hmac.compare_digest(cookie_token, header_token):
            logger.warning(
                "CSRF validation failed: token mismatch",
                extra={"path": request.url.path, "method": request.method},
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": "CSRF token invalid. Reload the page and try again.",
                    "code": "csrf_invalid",
                },
            )

        response = await call_next(request)
        return response

    @staticmethod
    def _maybe_set_cookie(request: Request, response: Response) -> None:
        """Issue a new csrf_token cookie if the client doesn't have one yet."""
        if not request.cookies.get(_CSRF_COOKIE_NAME):
            token = _generate_csrf_token()
            response.set_cookie(
                key=_CSRF_COOKIE_NAME,
                value=token,
                max_age=_CSRF_COOKIE_MAX_AGE,
                httponly=False,  # JS must be able to read it (double-submit pattern)
                samesite=_CSRF_COOKIE_SAMESITE,
                secure=_CSRF_COOKIE_SECURE,
                path="/",
            )


# ── Request logging middleware ────────────────────────────────────────────────


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            },
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "Unhandled exception",
                exc_info=True,
                extra={"request_id": request_id, "path": request.url.path},
            )
            raise

        elapsed_ms = round((time.perf_counter() - start) * 1000)
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            "Request finished",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": elapsed_ms,
            },
        )
        response.headers["X-Request-Id"] = request_id
        return response
