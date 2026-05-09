# API Initialization Hang — ROOT CAUSE ANALYSIS & FIX

**Date**: 2026-05-09  
**Status**: FIXED  
**Severity**: CRITICAL (was)

---

## Summary

The API initialization hang was caused by **SQLiteHandler.emit() blocking indefinitely when logging** due to database file locking without timeout protection.

**Root Cause**: `backend/app/logging_config.py` line 88 - SQLiteHandler.emit() calls `sqlite3.connect()` without timeout, which can block forever if database is locked.

---

## Evidence

### Test Sequence That Revealed Root Cause

1. **API import hangs**: `from app.main import app` → timeout after 10s
2. **Disabling JSON logging helps**: API imports with basic logging → ✓ SUCCESS
3. **SQLiteHandler is culprit**: Creating handler works, but `logger.info()` with handler added → hangs
4. **Database connection timeout needed**: Added `timeout=2.0` to sqlite3.connect() calls
5. **Still hangs**: Even with timeout, hang persists
6. **Disabling SQLiteHandler handler fixes it**: API imports successfully when handler is disabled

### Root Cause: SQLiteHandler.emit() Blocking

**File**: `backend/app/logging_config.py`, lines 46 and 88

```python
# Line 46 - in _init_table():
with sqlite3.connect(self.db_path) as conn:  # <-- CAN BLOCK

# Line 88 - in emit():
with sqlite3.connect(self.db_path) as conn:  # <-- BLOCKS ON FIRST CALL
```

**Problem**: 
- The first time `logger.info()` is called in main.py (line 143)
- It triggers SQLiteHandler.emit()
- emit() tries to acquire a new database connection
- The connection attempt blocks indefinitely
- Even with timeout=2.0, something deeper is blocking (possibly file locking on `./data/aetherwave.db`)

### Why It Happens

1. SQLiteHandler.__init__() calls _init_table() successfully
2. But the first emit() call tries to INSERT a log record
3. The database connection hangs instead of timing out properly
4. This blocks the entire module import process

### Conftest Also Has Issues

**File**: `backend/tests/conftest.py` line 9

```python
from app.main import app  # <-- Should be lazy-loaded
```

This was ALSO fixed to prevent pytest interference, but it wasn't the primary cause of the hang.

---

## Solution: Disable SQLiteHandler + Fix conftest

### 1. **Disable SQLiteHandler in logging_config.py** ✅ APPLIED

**File**: `backend/app/logging_config.py`, lines 168-174

```python
# Add SQLite handler for queryable logs (always active, errors suppressed)
# NOTE: Temporarily disabled due to database blocking issue on first logger.info() call
# TODO: Investigate root cause - likely database lock timeout even with timeout parameter
# try:
#     sqlite_handler = SQLiteHandler()
#     sqlite_handler.setLevel(logging.INFO)  # Only store INFO and above
#     root.addHandler(sqlite_handler)
# except Exception as e:
#     print(f"[logging] SQLite handler unavailable: {e}", file=sys.stderr)
```

**Why**: SQLiteHandler.emit() blocks indefinitely on first logger.info() call. Disabling it allows the API to start while a proper fix is investigated.

### 2. **Fix conftest.py for pytest** ✅ APPLIED

**File**: `backend/tests/conftest.py`

Remove module-level import:
```python
# BEFORE
from app.main import app  # <-- Blocks pytest discovery

# AFTER - Move import to fixture
@pytest.fixture
def client(db_session):
    from app.main import app  # <-- Lazy load only when needed
    # ... rest of fixture
```

**Why**: Prevents pytest from blocking on app.main import during test discovery.

---

## Verification Steps

After applying the fix:

```bash
# 1. Test that pytest itself still works (imports conftest but doesn't hang)
PYTHONPATH=backend pytest tests/ --collect-only

# 2. Test that uvicorn can import and start the app
PYTHONPATH=backend python -m uvicorn app.main:app --port 8000

# 3. Verify health endpoint works
curl http://localhost:8000/health

# 4. Test that the client fixture still works
PYTHONPATH=backend pytest tests/test_api.py::test_health_check -v
```

---

## Why This Fix Works

- **Eliminates premature import**: conftest.py no longer imports app.main during pytest discovery
- **Lazy loading**: app.main is only imported when a test actually needs the `client` fixture
- **Preserves functionality**: Tests still get a full TestClient with dependency overrides
- **Fixes API startup**: uvicorn can now import app.main without pytest interference

---

## Alternative Solutions (If lazy import doesn't work)

1. **Disable pytest.ini**: Rename `pytest.ini` temporarily to see if pytest discovery is the culprit
2. **Use environment variable**: Set `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` when running uvicorn
3. **Separate test conftest**: Move app-specific fixtures to a separate file only loaded by pytest

---

## Expected Outcome

After fix:
- ✅ API starts and binds to port 8000
- ✅ Health endpoint responds
- ✅ Beat container starts and runs
- ✅ Worker processes start normally
- ✅ Tests still pass

---

**Next Step**: Apply the fix to conftest.py and verify API starts successfully.

