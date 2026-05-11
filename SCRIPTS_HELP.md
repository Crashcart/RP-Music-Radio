# AetherWave Scripts Reference Guide

**Last Updated**: 2026-05-09  
**Status**: ✅ All scripts have `--help` support

---

## Quick Help Reference

All scripts now support `--help` or `-h` flags:

```bash
./switch-branch.sh --help           # Branch switcher (Docker services)
./scripts/git-switch.sh --help      # Silent git switcher (CI/CD)
./scripts/pull-alpha.sh --help      # Pull from alpha branch
./scripts/pull-beta.sh --help       # Pull from beta branch
./scripts/pull-main.sh --help       # Pull from main branch
./backend/scripts/health_check.sh --help  # API health check
./backend/scripts/diagnose_api.py --help  # Full API diagnostic
```

---

## Branch Management Scripts

### 1. switch-branch.sh — Full Branch Switcher

**Stops services, switches branches, rebuilds, relaunches.**

```bash
./switch-branch.sh <branch> [OPTIONS]
./switch-branch.sh --help
```

**Branches Supported**:
- `main` (production)
- `alpha` (pre-release)
- `beta` (release candidate)
- `test` (deprecated, use alpha)
- `dev` (deprecated)
- Any feature branch (`claude/*`, `feat/*`, etc.)

**Options**:
- `--rebuild` — Force rebuild Docker images
- `--no-launch` — Don't launch services after switch
- `--help, -h` — Show help

**Examples**:
```bash
# Switch to alpha and rebuild
./switch-branch.sh alpha --rebuild

# Switch to main without launching
./switch-branch.sh main --no-launch

# Switch to feature branch
./switch-branch.sh claude/copy-github-rules
```

**What It Does**:
1. Validates clean working tree
2. Stops Docker services
3. Fetches and checks out branch
4. Updates .env LOG_LEVEL
5. Rebuilds or pulls Docker images
6. Launches services

---

### 2. git-switch.sh — Silent Branch Switcher

**For CI/CD and automation. No prompts, auto-stash.**

```bash
./scripts/git-switch.sh <branch>
./scripts/git-switch.sh --help
```

**Branches Supported**:
- `main`, `alpha`, `beta`, or any remote branch

**Features**:
- ✓ No interactive prompts
- ✓ Auto-stash uncommitted changes
- ✓ Auto-fetch from origin
- ✓ Minimal output
- ✓ Error handling

**Examples**:
```bash
./scripts/git-switch.sh main
./scripts/git-switch.sh alpha
./scripts/git-switch.sh claude/feature-name
```

---

### 3. pull-alpha.sh — Pull Pre-Release Branch

**Fetch and switch to alpha branch (pre-release testing).**

```bash
./scripts/pull-alpha.sh
./scripts/pull-alpha.sh --help
```

**Use For**: Early access to new features, bug testing

---

### 4. pull-beta.sh — Pull Release Candidate

**Fetch and switch to beta branch (release candidate).**

```bash
./scripts/pull-beta.sh
./scripts/pull-beta.sh --help
```

**Use For**: Stable pre-release testing, RC validation

---

### 5. pull-main.sh — Pull Production

**Fetch and switch to main branch (stable production).**

```bash
./scripts/pull-main.sh
./scripts/pull-main.sh --help
```

**Use For**: Production deployments, stable releases

---

## Health & Diagnostic Scripts

### 6. backend/scripts/health_check.sh — API Health Check

**Quick health check for running API server.**

```bash
./backend/scripts/health_check.sh
./backend/scripts/health_check.sh --help
```

**Environment Variables**:
```bash
API_URL=http://localhost:9000 ./backend/scripts/health_check.sh
TIMEOUT=10 ./backend/scripts/health_check.sh
```

**Tests**:
1. Health endpoint (/health) — Critical
2. Root endpoint (/) — Non-critical
3. API docs (/docs) — Non-critical
4. Port binding (:8000) — Critical
5. Database access — Non-critical
6. Logging configuration — Non-critical

---

### 7. backend/scripts/diagnose_api.py — Full API Diagnostic

**Comprehensive health check with detailed output.**

```bash
PYTHONPATH=backend python backend/scripts/diagnose_api.py
```

**Tests**:
1. Python environment
2. Critical imports (logging, app.main, database)
3. Database initialization
4. Logging configuration
5. Route registration (58 routes)
6. Health endpoint
7. Optional services (Redis)

**Output**: Color-coded (✓ green / ✗ red) with error details

---

## Common Workflows

### Switch to Alpha Branch

```bash
# Option 1: Full control (with Docker rebuild)
./switch-branch.sh alpha --rebuild

# Option 2: Silent switcher (for CI/CD)
./scripts/git-switch.sh alpha

# Option 3: Pull alpha directly
./scripts/pull-alpha.sh
```

### Verify API is Running

```bash
# Quick 5-second check
./backend/scripts/health_check.sh

# Comprehensive 2-second diagnostic
PYTHONPATH=backend python backend/scripts/diagnose_api.py
```

### Switch to Main and Launch

```bash
./switch-branch.sh main
```

### Switch Without Launching Services

```bash
./switch-branch.sh alpha --no-launch
```

---

## Branch Workflow Reference

```
Development Flow:
  feature/* (local)
       ↓
     alpha (pre-release testing)
       ↓
      beta (release candidate)
       ↓
     main (production)

Commands:
  Create feature:    git checkout -b claude/feature-name
  Test feature:      ./switch-branch.sh claude/feature-name
  Push to alpha:     git push origin claude/feature-name:alpha
  Pull alpha:        ./scripts/pull-alpha.sh
  Pull beta:         ./scripts/pull-beta.sh
  Pull main:         ./scripts/pull-main.sh
```

---

## Troubleshooting

### "Branch not found" Error

```bash
# List available branches
git branch -r | grep origin/

# Try git-switch instead (more flexible)
./scripts/git-switch.sh your-branch-name
```

### API Health Check Fails

```bash
# Run full diagnostic
PYTHONPATH=backend python backend/scripts/diagnose_api.py

# See API_TROUBLESHOOTING.md for detailed steps
```

### Service Won't Launch

```bash
# Switch without launching
./switch-branch.sh alpha --no-launch

# Debug services
docker-compose ps
docker-compose logs

# Then try launching
docker-compose up -d
```

---

## All Scripts Summary

| Script | Purpose | Mode | Help |
|--------|---------|------|------|
| switch-branch.sh | Full branch switch with services | Interactive | ✓ --help |
| git-switch.sh | Silent branch switcher | CI/CD | ✓ --help |
| pull-alpha.sh | Pull pre-release branch | Interactive | ✓ --help |
| pull-beta.sh | Pull release candidate | Interactive | ✓ --help |
| pull-main.sh | Pull production branch | Interactive | ✓ --help |
| health_check.sh | Quick API health | Diagnostic | ✓ --help |
| diagnose_api.py | Full API diagnostic | Diagnostic | ✓ |

---

## Key Improvements (2026-05-09)

✅ **All scripts now support `--help` / `-h` flags**
✅ **switch-branch.sh now supports `alpha` branch** (was: only main/test/dev)
✅ **switch-branch.sh now supports any remote branch** (claude/*, feat/*, etc.)
✅ **Consistent help formatting** across all branch scripts
✅ **Clear error messages** when branch not found
✅ **Examples included** in all help sections
✅ **Environment variable support** (API_URL, TIMEOUT)

---

**Status**: All scripts working and tested ✓
**Use**: `<script> --help` for detailed information
