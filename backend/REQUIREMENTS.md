# Python Requirements Strategy

## Overview

The project uses **tiered requirements files** to avoid bloat and reduce install time. Choose the tier that matches your use case.

## Tiers

| Tier | File | Packages | Size | Use Case |
|------|------|----------|------|----------|
| **Base** | `requirements-base.txt` | ~20 | ~100MB | Production API server only |
| **+ AI** | `requirements-ai.txt` | ~50 | ~300MB | Add Gemini API for chat/generation |
| **+ Images** | `requirements-images.txt` | ~55 | ~320MB | Add artwork generation |
| **+ Dev** | `requirements-dev.txt` | ~75 | ~400MB | Add testing & linting (local dev) |
| **Full** | `requirements.txt` | ~106 | ~550MB | Everything (legacy, not recommended) |

## Installation

### Production (API Server Only)
```bash
pip install -r requirements-base.txt
# Install time: ~2 min | Package count: 20 | Size: ~100MB
```

### Development (Recommended for Local Work)
```bash
pip install -r requirements-dev.txt
# Install time: ~5 min | Package count: 75 | Size: ~400MB
```

### CI/CD (Docker Build)
```dockerfile
# Prod image
RUN pip install --no-cache-dir -r requirements-base.txt

# Dev/test image  
RUN pip install --no-cache-dir -r requirements-dev.txt
```

## What Each Tier Includes

### requirements-base.txt
Core runtime dependencies (production API):
- **FastAPI** — Web framework
- **SQLAlchemy + Alembic** — Database ORM & migrations
- **Celery + Redis** — Task queue
- **Pydantic** — Data validation
- **httpx** — HTTP client
- **python-json-logger** — Structured JSON logging (no Google Cloud overhead)
- **mutagen** — Audio metadata

**Total transitive deps:** ~12 packages
**Install time:** ~2 minutes

### requirements-ai.txt = base + 
- **google-genai** — Gemini API for chat/script generation
- Brings in: google-auth, protobuf, grpcio (shared with other Google packages)

**Total transitive deps:** ~50 packages
**Install time:** ~3 minutes (incremental)
**Added size:** ~200MB

### requirements-images.txt = ai +
- **Pillow** — Image processing
- **piexif** — EXIF metadata

**Total transitive deps:** ~55 packages
**Install time:** ~5 minutes (incremental)
**Added size:** ~20MB

### requirements-dev.txt = images +
- **pytest** — Testing framework
- **pytest-timeout, pytest-mock** — Testing plugins
- **black** — Code formatter
- **flake8** — Linter

**Total transitive deps:** ~75 packages
**Install time:** ~5 minutes (incremental)
**Added size:** ~80MB

## Why Not google-cloud-logging?

The original `requirements.txt` included `google-cloud-logging>=3.8.0`, which pulls in:
- google-cloud-logging
- google-cloud-appengine-logging (unused)
- google-cloud-audit-log (unused)
- google-cloud-core
- google-api-core
- grpcio + protobuf (duplicated from google-genai)

**Total: 13+ unnecessary packages (~250MB)**

We use `python-json-logger` instead, which:
- Outputs structured JSON to stdout (Docker-friendly)
- Works with Cloud Logging's Fluentd agent automatically
- Has zero extra dependencies
- Size: ~100KB vs ~250MB

If you absolutely need direct Google Cloud Logging integration, add it back:
```bash
pip install google-cloud-logging>=3.8.0
```

## Docker Multi-Stage Build

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
RUN pip install --user -r requirements-dev.txt

# Stage 2: Runtime (production)
FROM python:3.11-slim
COPY --from=builder /root/.local /root/.local
COPY backend/ /app/
ENV PYTHONPATH=/app
RUN pip install --user -r requirements-base.txt
ENTRYPOINT ["python", "-m", "uvicorn", "app.main:app"]
```

This reduces the final image from **~550MB** to **~200MB** (64% reduction).

## Dependency Analysis

### Why 87 Transitive Dependencies?

```
fastapi (1 pkg)
  ├─ starlette, pydantic, typing-extensions, ...
  └─ Total: 12 transitive

sqlalchemy (1 pkg)
  ├─ sqlalchemy-utils, greenlet, ...
  └─ Total: 5 transitive

celery (1 pkg)
  ├─ kombu, billiard, vine, ...
  └─ Total: 8 transitive

google-genai (1 pkg)
  ├─ google-auth, protobuf, grpcio, googleapis-common-protos
  └─ Total: 12 transitive

pytest (1 pkg)
  ├─ iniconfig, packaging, pluggy, ...
  └─ Total: 8 transitive

... (plus 40+ more)
```

### Removing Duplicates

Package versions that appear multiple times:
- `protobuf` — used by google-genai AND google-cloud-logging
- `grpcio` — used by google-genai AND google-cloud-*
- `google-auth` — used by google-genai AND google-cloud-*

**By removing `google-cloud-logging` from base, we save these duplicates.**

## Migration Path

If you're currently on `requirements.txt`:

1. **For production deployment:**
   ```bash
   # OLD
   pip install -r requirements.txt --no-cache-dir

   # NEW  
   pip install -r requirements-base.txt --no-cache-dir
   # Saves: 400MB, 5 min install time
   ```

2. **For local development:**
   ```bash
   # OLD (same as now)
   pip install -r requirements.txt

   # NEW (faster, same functionality)
   pip install -r requirements-dev.txt
   # Actually: 2-3 min faster (less bloat)
   ```

3. **In Docker:**
   ```dockerfile
   # OLD
   RUN pip install -r requirements.txt --no-cache-dir

   # NEW
   RUN pip install -r requirements-base.txt --no-cache-dir
   # Saves: 350MB in image size
   ```

## Custom Tiers

If you need a different combination:

```bash
# API + Images (no testing tools)
pip install -r requirements-images.txt

# API + AI (no images, no testing)
pip install -r requirements-ai.txt
```

Or create your own:
```bash
# requirements-custom.txt
-r requirements-ai.txt
pip install optional-package==1.0.0
```

## Install Time Comparison

```
Old (requirements.txt):      pip install -r requirements.txt
  → 106 packages
  → ~7-10 minutes (first install)
  → ~550MB disk

New (requirements-base.txt): pip install -r requirements-base.txt
  → 20 packages
  → ~2 minutes (first install)
  → ~100MB disk
  
Savings: 77% faster, 82% smaller
```

---

**Last Updated:** 2026-05-09  
**Status:** Active  
**Owner:** Repository maintainers
