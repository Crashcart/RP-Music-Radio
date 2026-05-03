# Logging & Diagnostics Architecture

**Status**: Phase 1 complete (core infrastructure)  
**Last Updated**: 2026-05-03

---

## Overview

AetherWave implements comprehensive, queryable logging across all components (API, frontend, workers, database, system). Logs are structured as JSON and persisted to SQLite for analysis.

**Goal**: Enable Claude Code to automatically detect error patterns, suggest fixes, and improve system reliability.

---

## Phase 1: Core Infrastructure ✅

### What's Logged

| Component | What | How |
|-----------|------|-----|
| **API** | Requests, responses, latency, CSRF events, rate limits | RequestLoggingMiddleware |
| **Frontend** | API call failures, JS errors, ChatAssistant interactions | Try-catch wrapper (TODO) |
| **Workers** | Task start/complete/failure, timing, resource usage | Celery task logging (TODO) |
| **Database** | Query errors, constraint violations, slow queries | SQLAlchemy events (TODO) |
| **AI Calls** | Model, tokens, latency, cost, parse errors | Gemini client logging |
| **System** | Container restarts, Redis connectivity, uptime | Health endpoint (TODO) |

### Storage

**Dual-write**:
1. **Files**: JSON logs in `/app/logs/` (daily rotation, last 10 days)
2. **SQLite**: `app_logs` table (indexed by timestamp, level, component)

### Access Points

**HTTP Endpoints** (easiest for Claude analysis):
```
GET /api/v1/logs/errors?hours=24
GET /api/v1/logs/summary?hours=24
GET /api/v1/logs/search?pattern=timeout&hours=24
```

**CLI** (local debugging):
```bash
python -m app.log_analyzer errors 24
python -m app.log_analyzer search "pattern" 24
python -m app.log_analyzer summary 24
```

### Schema

```sql
CREATE TABLE app_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,           -- ISO 8601 UTC
  component TEXT NOT NULL,           -- "app.api", "app.middleware", etc.
  level TEXT NOT NULL,               -- DEBUG, INFO, WARN, ERROR, CRITICAL
  message TEXT NOT NULL,             -- Human-readable message
  context TEXT,                      -- JSON blob: {method, path, status, latency_ms, ...}
  exception TEXT                     -- Full stack trace if error
);

CREATE INDEX idx_logs_timestamp ON app_logs(timestamp);
CREATE INDEX idx_logs_level ON app_logs(level);
```

---

## Phase 2: Pattern Detection & Analysis 🚧

**Not yet implemented.**

### Goals
- Auto-detect recurring errors (same error >3x in 24h)
- Suggest fixes based on error patterns
- Track error trends (are we improving?)
- Build cost tracking for AI calls

### Approach
1. Claude Code queries `/api/v1/logs/errors`
2. Groups by error message → frequency
3. Suggests fixes based on known patterns
4. User approves → implements fix → monitors logs

### Examples
```
Pattern: 404 /api/api/v1/artists (5 occurrences)
Root Cause: VITE_API_URL doubling path prefix
Suggested Fix: Set VITE_API_URL to empty string
```

```
Pattern: Timeout on /api/v1/stations/{id} (8 occurrences)
Root Cause: Database query slow on large datasets
Suggested Fix: Add index on station_id, paginate responses
```

---

## Phase 3: Automation ⏳

**Not yet implemented.**

### Goals
- Auto-create GitHub issues for recurring errors
- Auto-fix simple issues (config updates, env vars)
- Daily/weekly error summaries
- Performance regression alerts

### Scope (if implemented)
- Issue creation for >5 same errors in 24h
- Auto-fix: env var updates, log level adjustments
- Performance trends: alert if P95 latency increases >20%
- Cost tracking: alert if AI spend exceeds ceiling

---

## Implementation Notes

### Logging Best Practices

**API Middleware** (already done):
```python
logger.info("Request started", extra={
    "request_id": request_id,
    "method": request.method,
    "path": request.url.path,
})
```

**In your code** (going forward):
```python
from app.log_analyzer import log_with_context

log_with_context(logger, "error", "DJ staging failed",
    station_id=station_id,
    artist_id=artist_id,
    reason="Validation error"
)
```

### SQLite vs Files

- **Use SQLite**: When you need to query, aggregate, or analyze logs
- **Use Files**: When tailing in real-time, or in low-disk environments
- **Both**: Current setup writes to both simultaneously

### Performance

- Logging is non-blocking (sqlite writes in separate thread)
- Errors logged at INFO level and above (DEBUG suppressed in prod)
- Old logs auto-pruned (>10 days deleted)

---

## Next Steps (Phase 2)

- [ ] Implement pattern detection algorithm
- [ ] Build error grouping/frequency tracking
- [ ] Create fix suggestion engine
- [ ] Add `/api/v1/logs/patterns` endpoint
- [ ] Test on alpha branch
- [ ] Document fix catalog (known errors + solutions)

---

## Troubleshooting

**No logs appearing?**
- Check `/app/logs/api.log` exists
- Check SQLite connection: `sqlite3 /app/data/aetherwave.db "SELECT COUNT(*) FROM app_logs"`
- Check log level: `echo $LOG_LEVEL` (should be lowercase "info")

**Logs table missing?**
- Handler auto-creates table on first log write
- If still missing, restart API container

**High disk usage from logs?**
- File rotation keeps only 10 days
- Delete old logs: `rm /app/logs/*.log.*`
- Trim SQLite: `DELETE FROM app_logs WHERE timestamp < datetime('now', '-30 days')`

