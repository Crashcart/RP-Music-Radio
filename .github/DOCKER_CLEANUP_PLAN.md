# Docker & Dependencies Cleanup Plan

**Status**: PENDING  
**Date**: 2026-05-09  
**Audience**: DevOps, Backend  
**Priority**: MEDIUM (after Feature 2 backend + API fix)

---

## Problem Statement

Current Docker builds and Python requirements include unnecessary dependencies that bloat the image and slow builds:

1. **google-cloud-logging** (~30MB) — Only used if GOOGLE_CLOUD_PROJECT env var is set; gracefully degrades to JSON logging
2. **grpcio** (as transitive dependency of google-cloud-logging) — Not directly used
3. **google-genai** (~50MB) — Heavy; consider moving to optional
4. **Pillow** (~15MB) — Only needed for image processing (brand logos, station art)
5. **Multiple versions of packages** — Dependency tree may have redundant versions

**Impact**:
- Docker image size: Current ~550MB → Target ~350MB (36% reduction)
- Build time: Slower due to large dep downloads
- Runtime overhead: Unnecessary libraries in production memory

---

## Phase 1: Requirements Audit & Cleanup (1-2 days)

### 1.1 Analyze Current Dependencies

```bash
# Generate dependency tree
pip install pipdeptree
pipdeptree -p fastapi,google-cloud-logging,google-genai,Pillow > /tmp/deps.txt

# Check for duplicates/conflicts
pip check

# Check image sizes
pip show google-cloud-logging google-genai Pillow grpcio | grep Size
```

**Expected Output**: 
- google-cloud-logging: ~30MB
- google-genai: ~50MB  
- Pillow: ~15MB
- grpcio: ~10MB (transitive)

**Tasks**:
- [ ] Generate `pipdeptree` output for all packages
- [ ] Identify packages that appear in multiple versions
- [ ] Document which endpoints/features require which packages

### 1.2 Split Requirements Files

Create three requirement tiers:

**`backend/requirements-base.txt`** (Essential for core API):
```
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.2
SQLAlchemy==2.0.23
alembic==1.13.0
celery==5.3.6
redis==5.0.1
mutagen==1.47.0
python-json-logger>=2.0.7
httpx==0.25.2
```

**`backend/requirements-ai.txt`** (Optional: AI features):
```
google-genai>=1.0.0
```

**`backend/requirements-image.txt`** (Optional: Image processing):
```
Pillow>=10.0.0
piexif>=1.1.3
```

**`backend/requirements-cloud.txt`** (Optional: GCP integration):
```
google-cloud-logging>=3.8.0
```

**`backend/requirements-dev.txt`** (Dev/test only):
```
pytest==7.4.3
pytest-timeout==2.1.0
pytest-mock==3.12.0
black==23.11.0
flake8==6.1.0
```

### 1.3 Update requirements.txt

Keep for backward compatibility, but make it conditional:

```
# backend/requirements.txt
# Base API requirements (always installed)
-r requirements-base.txt

# Optional: uncomment to enable features
# -r requirements-ai.txt          # For Gemini/AI endpoints
# -r requirements-image.txt       # For art generation
# -r requirements-cloud.txt       # For Google Cloud Logging
# -r requirements-dev.txt         # For local development
```

**Tasks**:
- [ ] Split requirements into tiers
- [ ] Test base requirements install without errors
- [ ] Document which features require which optional packages
- [ ] Update docker-compose.yml to conditionally install tiers

### 1.4 Remove google-cloud-logging Conditional Code

Current code has graceful fallback (code in logging_config.py). This is good, but we should:

```python
# Current (lines 114-142 in logging_config.py)
# Already has try/except around Google Cloud Logging import
# No changes needed — code already handles missing library

# Verify: Check that JSON fallback works when google-cloud-logging is absent
# Test: Run API without google-cloud-logging installed
```

**Tasks**:
- [ ] Verify logging gracefully degrades without google-cloud-logging
- [ ] Run integration tests without GCP libraries
- [ ] Document logging behavior in README (uses JSON by default, GCP optional)

---

## Phase 2: Docker Multi-Stage Build Optimization (2-3 days)

### 2.1 Create Optimized Dockerfile

**Current approach**: Single stage, installs everything

**Proposed approach**: Multi-stage build
- Stage 1 (builder): Install deps, compile C extensions
- Stage 2 (runtime): Copy only runtime files, minimal deps

**Target Dockerfile** (`Dockerfile.optimized`):

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /tmp
COPY backend/requirements-base.txt .

# Install build dependencies temporarily
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && pip install --no-cache-dir -r requirements-base.txt \
    && apt-get purge -y build-essential libffi-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Copy only runtime Python packages (not build tools)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY backend/ /app/

# Metadata
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=2)" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Expected savings**:
- Multi-stage: ~550MB → ~320MB (42% reduction)
- Alpine base: ~550MB → ~180MB (67% reduction, requires C-extension tuning)

**Tasks**:
- [ ] Create `Dockerfile.optimized`
- [ ] Test multi-stage build
- [ ] Measure image sizes (original vs optimized)
- [ ] Verify app starts and health endpoint works
- [ ] Consider Alpine base as stretch goal

### 2.2 Docker Compose Conditional Install

Update `docker-compose.yml` to conditionally install optional packages:

```yaml
aetherwave-api:
  build:
    context: .
    dockerfile: Dockerfile.optimized
    args:
      INSTALL_AI: ${INSTALL_AI:-0}       # Optional Gemini
      INSTALL_IMAGE: ${INSTALL_IMAGE:-0} # Optional Pillow
      INSTALL_CLOUD: ${INSTALL_CLOUD:-0} # Optional GCP logging
  environment:
    - INSTALL_AI=${INSTALL_AI}
    - INSTALL_IMAGE=${INSTALL_IMAGE}
    - INSTALL_CLOUD=${INSTALL_CLOUD}
```

Then in Dockerfile:

```dockerfile
ARG INSTALL_AI=0
ARG INSTALL_IMAGE=0
ARG INSTALL_CLOUD=0

RUN if [ "$INSTALL_AI" = "1" ]; then pip install --no-cache-dir google-genai; fi
RUN if [ "$INSTALL_IMAGE" = "1" ]; then pip install --no-cache-dir Pillow piexif; fi
RUN if [ "$INSTALL_CLOUD" = "1" ]; then pip install --no-cache-dir google-cloud-logging; fi
```

**Usage**:
```bash
# Minimal API (no optional features)
docker-compose up

# Full-featured (all optional packages)
INSTALL_AI=1 INSTALL_IMAGE=1 INSTALL_CLOUD=1 docker-compose up

# AI + image generation only
INSTALL_AI=1 INSTALL_IMAGE=1 docker-compose up
```

**Tasks**:
- [ ] Update Dockerfile with conditional args
- [ ] Update docker-compose.yml with environment variables
- [ ] Document feature matrix (which packages for which features)
- [ ] Test all combinations (minimal, full, selective)

### 2.3 APT Cleanup

Ensure Docker uses minimal APT packages:

```dockerfile
# Good: Already uses --no-install-recommends
RUN apt-get install -y --no-install-recommends \
    python3-pip \
    curl

# Add this to all apt-get calls
RUN apt-get update \
    && apt-get install -y --no-install-recommends <packages> \
    && apt-get purge -y build-essential <temp-deps> \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

**Tasks**:
- [ ] Audit all RUN apt-get commands for cleanup
- [ ] Add `--no-install-recommends` to all installs
- [ ] Clean apt cache after each layer
- [ ] Remove build tools from final stage

---

## Phase 3: Testing & Validation (1-2 days)

### 3.1 Test Matrix

| Config | Packages | Image Size | Features |
|--------|----------|-----------|----------|
| Base | fastapi, sqlalchemy, redis | ~300MB | Core API only |
| +AI | + google-genai | ~350MB | + /chat, /generate |
| +Image | + Pillow, piexif | ~330MB | + /art, /logo |
| +Cloud | + google-cloud-logging | ~330MB | + GCP Logging |
| Full | All optional | ~400MB | All features |

**Test Plan**:
- [ ] Build each configuration
- [ ] Start app and verify /health endpoint
- [ ] Test core endpoints (stations, artists, brands)
- [ ] Test optional features (if enabled):
  - [ ] Chat endpoint (requires INSTALL_AI=1)
  - [ ] Art generation (requires INSTALL_IMAGE=1)
  - [ ] Cloud logging (requires INSTALL_CLOUD=1, GOOGLE_CLOUD_PROJECT set)
- [ ] Measure build time for each

### 3.2 Performance Benchmarks

```bash
# Startup time
time docker run --rm aetherwave-api:base python -m uvicorn app.main:app --port 8000

# Memory usage
docker run --rm -it aetherwave-api:base /bin/bash
# inside: ps aux, top, free -h

# Image sizes
docker image ls | grep aetherwave
```

**Tasks**:
- [ ] Benchmark base configuration
- [ ] Benchmark full configuration
- [ ] Document in DOCKER_PERFORMANCE.md

### 3.3 CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Build multi-stage Docker image
  run: docker build -f Dockerfile.optimized -t aetherwave-api:latest .

- name: Test image size
  run: |
    SIZE=$(docker image ls --format "{{.Size}}" aetherwave-api:latest)
    echo "Image size: $SIZE"
    [ "$SIZE" -lt 400MB ] || exit 1  # Fail if >400MB

- name: Health check
  run: |
    docker run -d -p 8000:8000 aetherwave-api:latest
    sleep 5
    curl http://localhost:8000/health || exit 1
```

**Tasks**:
- [ ] Add Docker build to CI
- [ ] Add image size check
- [ ] Add health check test

---

## Phase 4: Documentation & Rollout (1 day)

### 4.1 Update Docs

Create `backend/DEPLOYMENT.md`:

```markdown
# Deployment Guide

## Docker Configurations

### Minimal (Base API)
Best for production APIs that don't need AI or image features.

\`\`\`bash
docker build -t aetherwave-api:base -f Dockerfile.optimized .
\`\`\`

**Image size**: ~300MB  
**Features**: CRUD endpoints, drafts, queues  
**Excludes**: Gemini, Pillow

### Full-Featured
Includes all optional features.

\`\`\`bash
INSTALL_AI=1 INSTALL_IMAGE=1 INSTALL_CLOUD=1 docker-compose up
\`\`\`

**Image size**: ~400MB  
**Features**: All endpoints + AI + image generation + GCP logging  

### Selective
Mix and match features.

\`\`\`bash
# AI + images, but not GCP logging
INSTALL_AI=1 INSTALL_IMAGE=1 docker-compose up
\`\`\`
```

### 4.2 Update README

Add section:

```markdown
## Features & Dependencies

- **Base**: Core API (fastapi, sqlalchemy, redis)
- **AI**: Gemini integration (google-genai) — install with `INSTALL_AI=1`
- **Images**: Art generation (Pillow, piexif) — install with `INSTALL_IMAGE=1`
- **Cloud Logging**: GCP integration (google-cloud-logging) — install with `INSTALL_CLOUD=1`

By default, only base is installed. Features gracefully degrade if dependencies are missing.
```

**Tasks**:
- [ ] Write DEPLOYMENT.md
- [ ] Update README with feature matrix
- [ ] Document environment variable configuration
- [ ] Add troubleshooting guide

### 4.3 Migration Plan

For existing deployments:

```bash
# Step 1: Test new image locally
docker build -f Dockerfile.optimized -t aetherwave-api:optimized .

# Step 2: Verify feature parity
docker run -e INSTALL_AI=1 -e INSTALL_IMAGE=1 aetherwave-api:optimized /health

# Step 3: Update docker-compose.yml to use new Dockerfile
# Step 4: Roll out incrementally (canary deploy)
docker-compose up -d  # Old stack
docker-compose -f docker-compose.new.yml up -d  # New stack, parallel
# Monitor both for 24h
docker-compose down  # Kill old stack

# Step 5: Cleanup old images
docker image prune -a
```

**Tasks**:
- [ ] Write migration guide
- [ ] Create rollback plan (keep old Dockerfile as backup)
- [ ] Test in staging environment
- [ ] Plan rollout timing

---

## Task Breakdown (For TODO.md)

### High Priority
- [ ] **Audit requirements** — Analyze dependency tree, identify duplicates
- [ ] **Fix API startup hang** — Blocking all testing (CRITICAL BLOCKER)
- [ ] **Test base requirements** — Ensure core API works without optional packages

### Medium Priority
- [ ] **Split requirements files** — Create base/ai/image/cloud tiers
- [ ] **Create Dockerfile.optimized** — Multi-stage build
- [ ] **Test Docker builds** — All configurations
- [ ] **Update documentation** — Deployment guide

### Low Priority (Polish)
- [ ] **Consider Alpine base** — Potential 67% size reduction (requires C-ext testing)
- [ ] **Benchmark performance** — Measure startup/memory with all configs
- [ ] **Add CI/CD checks** — Image size, health checks in GitHub Actions

---

## File Structure (Target)

```
backend/
├── requirements-base.txt       (core API)
├── requirements-ai.txt         (optional: Gemini)
├── requirements-image.txt      (optional: Pillow)
├── requirements-cloud.txt      (optional: GCP)
├── requirements-dev.txt        (dev/test only)
├── requirements.txt            (backward compat, includes all)
└── Dockerfile.optimized        (new multi-stage)

root/
├── docker-compose.yml          (updated with feature flags)
└── .github/
    ├── DOCKER_CLEANUP_PLAN.md  (this file)
    ├── DEPLOYMENT.md           (new deployment guide)
    └── DOCKER_PERFORMANCE.md   (new benchmark results)
```

---

## Success Criteria

✅ Docker image size: Current ~550MB → Target <400MB  
✅ Build time: Reduced by ≥30%  
✅ Feature matrix: All optional packages can be disabled  
✅ Health check: API starts and serves /health in <10s  
✅ Tests pass: All configurations (base, +AI, +image, +cloud, full)  
✅ Documentation: Deployment guide + feature matrix + migration plan  
✅ CI/CD: Automated image size check + health test  

---

## Notes

- **Backward compatibility**: Existing docker-compose.yml continues to work (installs all packages)
- **Graceful degradation**: Code already handles missing optional packages (JSON logging fallback, etc.)
- **Testing**: Each configuration should pass full test suite (health endpoint, core endpoints)
- **Monitoring**: Track image sizes and build times in CI/CD

---

**Owner**: DevOps / Backend Team  
**Timeline**: 1 week (after Feature 2 backend + API fix)  
**Effort Estimate**: 5-6 days full-time equivalent

