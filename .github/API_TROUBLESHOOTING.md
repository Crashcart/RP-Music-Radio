# API Troubleshooting Guide

**Last Updated**: 2026-05-09  
**Status**: Active  
**Purpose**: Rapid diagnosis and resolution of API startup failures

---

## Quick Diagnosis

### Run Diagnostic Suite
```bash
cd /home/user/RP-Music-Radio
PYTHONPATH=backend python backend/scripts/diagnose_api.py
```

**Output** shows:
- ✓ Pass (green) — Component working
- ✗ Fail (red) — Problem identified with details

---

## Known Issues & Fixes

### Issue 1: SQLiteHandler Blocks API Startup ✅ FIXED

**Symptom:**
```
Static files mounted at /output
[hangs indefinitely, does not bind to port 8000]
```

**Root Cause**: `SQLiteHandler.emit()` blocks on database lock even with timeout parameter.

**Fix Applied** (backend/app/logging_config.py lines 168-174):
```python
# SQLiteHandler temporarily disabled - see ROOT_CAUSE_API_HANG.md
# try:
#     sqlite_handler = SQLiteHandler()
#     root.addHandler(sqlite_handler)
# except Exception as e:
#     print(f"[logging] SQLite handler unavailable: {e}", file=sys.stderr)
```

**Verify**:
```bash
PYTHONPATH=backend python -c "from app.main import app; print(f'✓ {len(app.routes)} routes')"
```

---

### Issue 2: Cryptography Library Rust Extension Broken ✅ FIXED

**Symptom**:
```
ModuleNotFoundError: No module named '_cffi_backend'
pyo3_runtime.PanicException: Python API call failed
```

**Root Cause**: Debian system-installed cryptography conflicts with pip version.

**Fix Applied**:
```bash
rm -rf /usr/lib/python3/dist-packages/cryptography*
pip install --no-cache-dir cryptography==41.0.7
```

**Verify**:
```bash
python -c "import google.genai; print('✓ OK')"
```

---

### Issue 3: conftest.py Module-Level Import Blocks pytest ✅ FIXED

**Symptom**:
```
pytest discovery hangs indefinitely
```

**Root Cause**: `from app.main import app` at module level in conftest.py.

**Fix Applied** (backend/tests/conftest.py):
```python
@pytest.fixture
def client(db_session):
    from app.main import app  # <-- Lazy import in fixture, not at module level
```

**Verify**:
```bash
PYTHONPATH=backend pytest tests/ --collect-only
```

---

## Diagnostic Workflow

### Step 1: Run Full Diagnostic
```bash
PYTHONPATH=backend python backend/scripts/diagnose_api.py
```

### Step 2: Test Components Individually

```bash
# Logging
PYTHONPATH=backend python -c "
from app.logging_config import setup_logging
setup_logging()
print('✓ Logging OK')
"

# Database
PYTHONPATH=backend python -c "
from app.database import init_db
init_db()
print('✓ Database OK')
"

# API Import
PYTHONPATH=backend timeout 10 python -c "
from app.main import app
print(f'✓ API: {len(app.routes)} routes')
"

# Health Check
PYTHONPATH=backend python -m uvicorn app.main:app --port 8000 &
sleep 2
curl http://localhost:8000/health && kill %1
```

### Step 3: Enable Debug Logging

```bash
PYTHONPATH=backend LOG_LEVEL=debug python -m uvicorn app.main:app --port 8000
```

---

## Common Failure Scenarios

### Scenario A: API imports but doesn't bind to port 8000

**Checklist**:
- [ ] Port 8000 not already bound: `netstat -tuln | grep 8000`
- [ ] Try different port: `--port 8001`
- [ ] Check Docker networking if applicable

---

### Scenario B: pytest hangs during collection

**Checklist**:
- [ ] No module-level import in conftest.py: `grep -n "from app" backend/tests/conftest.py`
- [ ] All imports are inside fixtures
- [ ] Run with timeout: `timeout 5 pytest --collect-only`

---

### Scenario C: Gemini API fails

**Checklist**:
- [ ] google-genai imports: `python -c "from google import genai"`
- [ ] API key set: `echo $GOOGLE_API_KEY`
- [ ] Update .env if needed: `GOOGLE_API_KEY=<your-key>`

---

### Scenario D: Database errors

**Checklist**:
- [ ] Database file writable: `touch /app/data/test && rm /app/data/test`
- [ ] init_db() works: `PYTHONPATH=backend python -c "from app.database import init_db; init_db()"`
- [ ] PYTHONPATH includes backend

---

## Pre-Deployment Checklist

- [ ] `python backend/scripts/diagnose_api.py` passes
- [ ] `from app.main import app` imports successfully
- [ ] `curl http://localhost:8000/health` responds
- [ ] `pytest --collect-only` doesn't hang
- [ ] No module-level imports in conftest.py
- [ ] SQLiteHandler commented out in logging_config.py
- [ ] google-genai imports without errors
- [ ] Database file writable

---

## Debug Mode

```bash
# Full tracing
PYTHONPATH=backend LOG_LEVEL=debug PYTHONUNBUFFERED=1 \
  python -m uvicorn app.main:app --port 8000 2>&1 | tee api.log

# System call tracing
PYTHONPATH=backend strace -e trace=network,file -o api.strace \
  timeout 10 python -m uvicorn app.main:app --port 8000
tail -50 api.strace
```

---

## Emergency Reference

**API Hang Detection**:
- Hangs after "Static files mounted" → SQLiteHandler issue (see Issue 1)
- Hangs on import → cryptography issue (see Issue 2) or module-level blocking
- Hangs in pytest → conftest.py issue (see Issue 3)

**Immediate Tests**:
```bash
# If API doesn't start, run this immediately:
PYTHONPATH=backend python backend/scripts/diagnose_api.py
```

---

See `.github/ROOT_CAUSE_API_HANG.md` for deep investigation details.
