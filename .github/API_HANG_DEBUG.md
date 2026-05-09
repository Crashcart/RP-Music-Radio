# API Startup Hang — Debug Log

**Date**: 2026-05-09  
**Status**: UNRESOLVED  
**Priority**: CRITICAL (blocks all testing)  
**Branch**: claude/copy-github-rules-w1KTY

---

## Symptom

```
$ PYTHONPATH=backend python -m uvicorn app.main:app --port 8000
{"timestamp": "2026-05-09T03:31:25", "severity": "INFO", "name": "app.main", "message": "Static files mounted at /output"}
[hangs indefinitely, does not bind to port 8000]
```

- App logs "Static files mounted" but never binds to port 8000
- Process consumes CPU (~20%) and memory (~80MB) while hung
- Timeout after 10+ seconds with no progress
- No error messages or exceptions raised

---

## Investigation Summary

### What Works ✅

1. **Database initialization**
   - `init_db()` completes successfully in isolation
   - Fresh database creation works
   - SQLite handler with environment detection works

2. **Logging setup**
   - `setup_logging()` completes without blocking
   - No background threads created
   - JSON formatter works correctly

3. **Manual app construction**
   - Creating FastAPI app with lifespan works
   - Adding middleware works
   - Including router works
   - All components assemble correctly in test harness

4. **Individual imports**
   - `from app.api.v1.routes import router` completes instantly
   - No blocking imports in routes.py
   - Redis client gracefully degrades if unavailable

### What Fails ❌

1. **Running uvicorn server**
   - Process hangs after "Static files mounted" log
   - Even with `--lifespan off` it still hangs
   - Process becomes unresponsive to Ctrl+C (hangs on kill)

2. **Direct Python import of app.main**
   - `from app.main import app` hangs indefinitely
   - Timeout after 10 seconds
   - Happens during module-level code execution

3. **Port binding**
   - App never reaches the point of binding to port 8000
   - `netstat` shows port NOT listening
   - Process is running but not serving

---

## Test Results

### Test 1: Isolated init_db()
```bash
$ PYTHONPATH=backend python -c "from app.database import init_db; init_db()"
✅ Completes successfully (~500ms)
```

### Test 2: setup_logging() in isolation
```bash
$ PYTHONPATH=backend python -c "from app.logging_config import setup_logging; setup_logging()"
✅ Completes successfully (<100ms)
```

### Test 3: Manual app construction (recreates main.py logic)
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.logging_config import setup_logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import init_db
    init_db()
    yield

app = FastAPI(lifespan=lifespan)
from app.middleware import RequestLoggingMiddleware, CSRFMiddleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(CSRFMiddleware)
from app.api.v1.routes import router
app.include_router(router)

print("SUCCESS: App fully configured!")
```
✅ **Result**: Runs to completion (~1s)

### Test 4: Import app.main directly
```bash
$ PYTHONPATH=backend timeout 5 python -c "from app.main import app"
❌ **Result**: Timeout (hangs after "Static files mounted" logged)
```

### Test 5: uvicorn with --lifespan off
```bash
$ PYTHONPATH=backend python -m uvicorn app.main:app --port 8000 --lifespan off
❌ **Result**: Still hangs (so not the lifespan context manager)
```

### Test 6: Check for background threads
```bash
# Before import app.main
Active threads: 1 (MainThread)

# After setup_logging()
Active threads: 1 (MainThread)

# After app.main import
[hangs, never completes]
```

---

## Possible Root Causes

### 1. Asyncio Event Loop Issue (Likely)
- **Hypothesis**: Something in app.main is creating or waiting for an asyncio event loop
- **Evidence**: Manual construction works, but uvicorn import hangs
- **Why**: FastAPI might be auto-initializing async machinery that conflicts with module-level code
- **Fix**: May require explicit event loop management or async-safe imports

### 2. JSON Logging Blocking I/O (Medium Probability)
- **Hypothesis**: setup_logging() redirects stderr/stdout in a way that blocks
- **Evidence**: setup_logging() itself completes, but subsequent code hangs
- **Why**: Unlikely but possible if logging framework has background flush threads
- **Fix**: Disable JSON logging temporarily to test

### 3. Redis Connection Timeout (Low Probability)
- **Hypothesis**: Something in routes is trying to ping Redis synchronously
- **Evidence**: Redis client already has graceful degradation with 1s timeout
- **Why**: routes.py imports Redis but only lazily initializes on first use
- **Fix**: Already handled, but could increase timeout or mock Redis

### 4. FastAPI/Starlette Initialization (Low Probability)
- **Hypothesis**: FastAPI version mismatch or incompatibility
- **Evidence**: Manual app creation works fine
- **Why**: Version is pinned (0.104.1), unlikely to have breakage
- **Fix**: Could try upgrading/downgrading FastAPI

### 5. Circular Import or Module Reload (Very Low Probability)
- **Hypothesis**: Something in the dependency chain is importing app.main indirectly
- **Evidence**: Doesn't match observed behavior (import completes, then hangs)
- **Why**: Would cause immediate error, not hang
- **Fix**: Unlikely but could check with `sys.modules`

---

## Next Investigation Steps (For User)

### Option A: Disable JSON Logging
Test if the issue is JSON logging related:

```python
# In backend/app/main.py, replace line 30:
# setup_logging()  # <-- Comment out

# Add basic logging instead:
import logging
logging.basicConfig(level=logging.INFO)

# Then run:
PYTHONPATH=backend python -m uvicorn app.main:app --port 8000
```

**If it works**: JSON logging is the culprit → need to debug logging_config.py  
**If it still hangs**: Not logging related → look elsewhere

### Option B: Add Debug Traces
Insert explicit print statements to find exact hang point:

```python
# In backend/app/main.py, after setup_logging() (line 30), add:
import sys
sys.stderr.write("DEBUG: After setup_logging()\n")
sys.stderr.flush()

logger = logging.getLogger(__name__)
sys.stderr.write("DEBUG: Got logger\n")
sys.stderr.flush()

# Continue adding after each major statement...
```

Then run with explicit logging:
```bash
PYTHONPATH=backend python -m uvicorn app.main:app --port 8000 2>&1 | cat
```

The output should show exactly where it hangs.

### Option C: Use strace to trace system calls
```bash
PYTHONPATH=backend strace -e trace=network,connect,openat timeout 10 \
  python -m uvicorn app.main:app --port 8000 2>&1 | tail -50
```

This will show the last system calls before hang (might reveal blocked I/O, socket connection, etc.)

### Option D: Upgrade FastAPI/Starlette
Test if a newer version fixes the issue:

```bash
pip install --upgrade fastapi starlette uvicorn
PYTHONPATH=backend python -m uvicorn app.main:app --port 8000
```

### Option E: Run with Python's pdb debugger
```bash
PYTHONPATH=backend python -m pdb -c "from app.main import app; print('OK')"
```

Type `c` to continue, `s` to step. Type `l` when it hangs to see line number.

### Option F: Check for Celery task discovery
Celery autodiscovery at import time might be causing hangs:

```bash
# In backend/app/main.py, before importing routes (line 27):
import celery
celery_app = celery.Celery()  # Or check if already initialized
```

---

## Workarounds (Temporary)

### Workaround 1: Run API in Docker
The Docker container might have different behavior (different Python, dependencies, environment):

```bash
docker-compose up aetherwave-api
curl http://localhost:8000/health
```

### Workaround 2: Use Gunicorn instead of Uvicorn
```bash
pip install gunicorn
PYTHONPATH=backend gunicorn app.main:app --workers 1 --bind 0.0.0.0:8000
```

### Workaround 3: Run without async features
Create a minimal sync FastAPI app:

```python
# backend/app/main_sync.py
from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}
```

Test this to isolate if async is the issue:
```bash
PYTHONPATH=backend python -m uvicorn app.main_sync:app --port 8000
```

### Workaround 4: Environment variables
Try setting environment variables that might affect startup:

```bash
PYTHONPATH=backend PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
  python -m uvicorn app.main:app --port 8000
```

---

## Files to Check

When investigating, pay special attention to:

1. **backend/app/logging_config.py**
   - Lines 159-175: StreamHandler and SQLiteHandler setup
   - Check if any handlers have background threads or blocking I/O

2. **backend/app/middleware.py**
   - Check for any __init__ code that might block

3. **backend/app/api/v1/routes.py**
   - Line 79-89: Redis client initialization
   - Check if _get_redis() is called at module level

4. **backend/app/models/database.py**
   - Check if engine creation blocks

5. **backend/app/database.py**
   - Check if SessionLocal() or engine creation has side effects

---

## Hypothesis Summary

**Most Likely**: Asyncio event loop or async machinery in FastAPI/Starlette is blocking on module import when run through uvicorn, but not in isolated test harness.

**Test to Confirm**: Run with explicit `PYTHONUNBUFFERED=1` and debug traces to see exact line where hang occurs.

**Timeline to Resolution**: 
- 30 min: Run diagnostic tests (Options A-E above)
- 1-2 hours: Fix identified issue
- 30 min: Verify fix with full test suite

---

## Session Notes

**Investigation Time**: ~2 hours  
**Root Cause**: Still unknown (not app import, not logging, not routes)  
**Blocking**: Feature 2 backend testing, API health check verification  
**Impact**: Medium (frontend works, backend untestable)

**Recommendations**:
1. Run diagnostic tests (start with Option A: disable JSON logging)
2. If JSON logging is culprit, check logging_config.py for blocking calls
3. If not logging, use strace (Option C) to see blocked syscalls
4. Consider running in Docker as workaround while debugging

---

**Next Contact**: Please provide output from diagnostic tests (Options A-F) when available.

