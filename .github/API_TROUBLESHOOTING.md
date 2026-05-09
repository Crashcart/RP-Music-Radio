# API Troubleshooting Guide

## Quick Start (Local Development)

```bash
#!/bin/bash
cd /home/user/RP-Music-Radio
export PYTHONPATH=/home/user/RP-Music-Radio/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then verify: `curl http://localhost:8000/api/v1/health`

## Common Issues & Fixes

### Issue 1: "ModuleNotFoundError: No module named 'app'"
**Cause**: PYTHONPATH not set correctly  
**Fix**: Always set before running:
```bash
export PYTHONPATH=/home/user/RP-Music-Radio/backend
```

### Issue 2: "unable to open database file" in logging
**Cause**: Hardcoded `/app/data/` path only works in Docker  
**Fix**: Applied in commit 5571825 - SQLiteHandler now auto-detects environment

**Code changed**: `backend/app/logging_config.py` lines 27-35
```python
def __init__(self, db_path: str | None = None):
    if db_path is None:
        if os.path.exists("/app/data"):
            db_path = "/app/data/aetherwave.db"  # Docker
        else:
            db_path = "./data/aetherwave.db"     # Local
            os.makedirs("./data", exist_ok=True)
```

### Issue 3: "ModuleNotFoundError" during app initialization
**Cause**: Relative imports fail when PYTHONPATH not in sys.path  
**Fix**: Use `python -m` to invoke as module:
```bash
python -m uvicorn app.main:app --port 8000
# NOT: python app/main.py
```

### Issue 4: Port 8000 already in use
**Cause**: Previous API instance still running  
**Fix**:
```bash
# Kill all Python processes
pkill -f "app.main"
pkill -f "uvicorn"

# Or use different port
python -m uvicorn app.main:app --port 8001
```

### Issue 5: CORS errors from frontend
**Cause**: Frontend on different origin than allowed  
**Check**: `backend/app/main.py` lines 83-89
```python
allow_origins=[
    "http://localhost:8432",
    "http://localhost:5173",
    # ... add frontend URL here
]
```

## Database Issues

### Fresh Database Setup
```bash
cd /home/user/RP-Music-Radio/backend
PYTHONPATH=/home/user/RP-Music-Radio/backend python -c "from app.database import init_db; init_db()"
```

### Check Database Status
```bash
sqlite3 data/aetherwave.db ".tables"  # List tables
sqlite3 data/aetherwave.db ".schema"  # Show schema
```

### Reset Database (Careful!)
```bash
rm data/aetherwave.db
# API will recreate on startup
```

## Debugging

### Enable Verbose Logging
```bash
python -m uvicorn app.main:app --port 8000 --log-level debug
```

### Check API Logs Table
```bash
sqlite3 data/aetherwave.db "SELECT timestamp, level, message FROM app_logs ORDER BY timestamp DESC LIMIT 20;"
```

### Test Individual Endpoints
```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/stations
```

## Environment Variables

Essential for API startup:
- `PYTHONPATH=/home/user/RP-Music-Radio/backend` - Module path
- `DATABASE_URL` - Optional (defaults to `./data/aetherwave.db` locally)
- `GOOGLE_API_KEY` - Optional but needed for AI features
- `GOOGLE_CLOUD_PROJECT` - Optional (for Cloud Logging)

## Session History - API Fixes

### Session 1 (Previous)
- API was working correctly
- Documentation exists in `.github/`

### Session 2 (2026-05-09 - Current)
**Problem**: API not starting, logging handler database path issue  
**Cause**: Feature 2 frontend implementation + alpha merge exposed hardcoded Docker path  
**Solution**: Fixed SQLiteHandler in `backend/app/logging_config.py`  
**Commit**: 5571825

**Test Status**: 
- ✅ App module imports successfully
- ⏳ Uvicorn server binding needs verification
- ⏳ Health endpoint needs testing after startup

## Next Steps

Before declaring API fixed:
1. [ ] Start API with: `python -m uvicorn app.main:app --port 8000`
2. [ ] Verify health: `curl http://localhost:8000/api/v1/health`
3. [ ] Check logs: `sqlite3 data/aetherwave.db "SELECT * FROM app_logs LIMIT 5;"`
4. [ ] Test stations endpoint: `curl http://localhost:8000/api/v1/stations`
5. [ ] Implement Phase 3 backend endpoints for Feature 2

## Production Deployment

Use Docker:
```bash
docker-compose up -d aetherwave-api
docker logs -f aetherwave-api
```

Dockerfile handles paths correctly via `/app/data` mount point.
