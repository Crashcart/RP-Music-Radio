# AetherWave / RP-Music-Radio

A headless **Media Factory** that generates procedural, lore-heavy radio content for game environments.

## Overview

AetherWave transforms user-defined seeds (genres, item lists, station vibes) into self-contained **Lore-Shard MP3s** with:
- Embedded album art and metadata
- Full scripts and lyrics
- Detailed backstories
- Persistent AI voice signatures
- Market research & brand information

All metadata is baked directly into MP3 ID3v2.4 tags, making each file a portable "lore container."

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Google Cloud API key (for Gemini, Lyria, Nano Banana 2)
- 4-8 GB RAM available
- 50 GB disk space

### Setup (Recommended)

```bash
git clone https://github.com/crashcart/rp-music-radio.git
cd rp-music-radio
./install-full.sh                   # Guided install with hardware detection
# Edit .env with your GOOGLE_API_KEY when prompted
```

Then open `http://localhost:8432`.

### Operational Scripts

| Script | Purpose |
| --- | --- |
| `./install.sh` | Quick install on the current branch |
| `./install-full.sh` | Full guided install (hardware detection, security hardening) |
| `node install.js` | Cross-platform Node-based installer (macOS/Windows/Linux) |
| `./update.sh` | Pull latest, rebuild, redeploy with optional rollback |
| `./switch-branch.sh <branch>` | Safely switch between `main` / `test` / `dev` |
| `./uninstall.sh` | Stop & clean containers (preserves generated content) |
| `./uninstall-full.sh` | Complete removal (purges everything, optional repo deletion) |
| `./collect-logs.sh` | Bundle diagnostics into a tarball for support |
| `./scripts/logs.sh <cmd>` | Centralized log viewer/manager |
| `./scripts/troubleshoot.sh` | Run all diagnostic checks (60+ failure modes) |

All scripts accept `--branch <main\|test\|dev>` to target a specific branch.

### Branches

| Branch | Purpose | Image Source |
| --- | --- | --- |
| `main` | Production (stable releases) | Pre-built images |
| `test` | Pre-production staging | Release-candidate images |
| `dev` | Active development | Built from source |

## Architecture

Full technical documentation: [ARCHITECTURE.md](ARCHITECTURE.md)

### Technology Stack
- **Frontend**: React 18 + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Task Queue**: Celery + Redis
- **Database**: SQLite
- **Meta Engine**: Mutagen (ID3v2.4 tagging)
- **AI APIs**: Google Cloud (Gemini 3 Flash, Lyria 3 Pro, Nano Banana 2)

## Workflow: Stage & Commit

### 1. Ingest
Upload CSV/seed list with station names, artists, genres, items.

### 2. Flesh-Out
AI researches and expands your seeds. Edit in Drafting Table UI.

### 3. Commit
Submit to synthesis queue. Generates script, audio, art, and metadata.

### 4. Monitor
Poll for status. When complete, MP3 appears in `radio_vault/`.

## Core Features

### Voice Persistence
- First generation: DJ voice seed stored in `persona_db/`
- Subsequent generations: Same voice → perfect consistency

### Filler Protocol
AI injects procedural quirks when data is minimal:
- "Vance clicks his pen during silence"
- "Station takeover announcements"
- "Internal Gravity Safety PSAs"

### Market Research Ads
AI generates in-universe product ads:
- Simple: "Buy a Med-Kit. It stops bleeding."
- Flavor: "Patch-Me-Up 5000™ — 20% off at the port."

### Lore-Shard Metadata
Every MP3 embeds full lore in ID3v2.4 tags:
- Artist, Station, Title
- Backstory, Market Research
- Voice ID, Generation timestamp
- Engines used (Gemini, Lyria, Nano)

## Development

### Governance
See [.github/copilot-instructions.md](.github/copilot-instructions.md):
- 10 Non-Negotiable Rules for AI agents
- 4-phase workflow
- Conflict detection protocol

### Project Config
See [.github/REPO_CONFIG.md](.github/REPO_CONFIG.md):
- Tech stack details
- File structure
- High-conflict files
- Development checklist

### Task Tracking
- **Current tasks**: [.github/TODO.md](.github/TODO.md)
- **Decisions**: [.github/PLANNING.md](.github/PLANNING.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

## Testing & Quality

```bash
# Backend
pytest
flake8 .
black .
bandit -r .

# Frontend
npm test
npm run lint:check
npm run format:check
npm audit
```

## Contributing

Follow the governance rules in [.github/copilot-instructions.md](.github/copilot-instructions.md):
1. Create feature branch: `feat/issue-N-slug`
2. Complete Planning → Implementation → Verification
3. Pass CI/CD checks
4. Await human review

## Troubleshooting

AetherWave ships with a centralized **compile log system** for diagnostics.
All install/update/uninstall scripts write structured logs to `logs/` with
ISO 8601 timestamps and severity levels (DEBUG / INFO / WARN / ERROR).

### Run Full Diagnostics
```bash
./scripts/troubleshoot.sh           # 60+ checks with prioritized fixes
./scripts/troubleshoot.sh --quick   # Skip slow network/Docker checks
./scripts/troubleshoot.sh --export  # Save report to logs/troubleshoot-report-*.txt
```

### View & Manage Logs
```bash
./scripts/logs.sh list                  # List all log files
./scripts/logs.sh tail install-full     # Tail latest install-full log
./scripts/logs.sh show update           # Print full content of latest update log
./scripts/logs.sh docker aetherwave_api # View a specific container's logs
./scripts/logs.sh search "API_KEY"      # Search across all logs
./scripts/logs.sh errors                # Show recent errors across all logs
./scripts/logs.sh summary               # Counts, sizes, error totals
./scripts/logs.sh clean                 # Remove logs older than 30 days
./scripts/logs.sh clean --all           # Wipe all log files
```

### Bundle for Support
```bash
./collect-logs.sh
# Produces: aetherwave-logs-<timestamp>.tar.gz
# Includes: system info, container logs, redacted config, troubleshoot
# snapshot, error summary, and recent script logs.
```

### Log File Layout
```
logs/
├── install-20260426-093015.log
├── install-full-20260426-093020.log
├── update-20260426-101430.log
├── uninstall-20260426-110500.log
├── troubleshoot-20260426-120000.log
└── *-latest.log                # symlinks to most recent log per script
```

Logs are auto-rotated (last 30 per script) and ignored by `.gitignore`.

## AI Logging & Automated Error Analysis

AetherWave includes a **three-phase AI logging system** that automatically analyzes errors, detects patterns, and suggests fixes.

### Phase 1: Log Collection & Persistence

Every API call, error, and task is logged to a structured **SQLite database** for queryable analysis:

```bash
# View logs via the Settings page
# Navigate to: Settings → System Logs → Live backend logs
```

**Logged Events**:
- ✅ Successful API calls (endpoint, duration, status)
- ❌ Errors & exceptions (type, message, stack trace)
- ⏱️ Performance metrics (slow queries, timeouts)
- 🤖 AI API calls (model, tokens used, cost)
- 📝 Form submissions & data validation
- 🔄 Task queue events (staging, synthesis, retries)

**Database**: SQLite table `app_logs` with JSON context + exceptions

### Phase 2: Pattern Detection & Fix Suggestions

The system automatically detects **recurring errors** and suggests fixes:

```bash
# Check for recurring error patterns
python -m app.automation --action check-errors

# Example output:
# Pattern: "404 Not Found" (5 occurrences in 24h)
# Severity: HIGH
# Suggested fixes:
#   - Verify endpoint path in routes.py
#   - Check VITE_API_URL environment variable
#   - Inspect browser network tab for actual URL
```

**Supported Pattern Detection**:
- **404 errors** → Path issues, doubled prefixes (/api/api/)
- **Timeouts** → Slow queries, API rate limits, resource exhaustion
- **CSRF errors** → Token handling, cookie configuration
- **Gemini API errors** → Invalid models, deprecated APIs, rate limits
- **Validation errors** → Required fields, type mismatches, enum violations

### Phase 3: Automated Remediation & Reporting

The system can **auto-fix simple issues** and generate alerts:

```bash
# Auto-fix known issues
python -m app.automation --action auto-fix

# Generate daily error summary
python -m app.automation --action summary --period daily

# Generate weekly summary
python -m app.automation --action summary --period weekly

# Clean up old logs (keep only 30 days)
python -m app.automation --action cleanup --days 30

# Create GitHub issues for critical recurring errors
python -m app.automation --action create-issues
```

**Auto-Fix Examples**:
- 🔧 Update environment variables (e.g., LOG_LEVEL=INFO → LOG_LEVEL=info)
- 📝 Fix configuration values
- 🗑️ Clean up expired draft records
- 📊 Generate error trend reports

### Viewing Error Analysis

**Via Web UI**:
1. Open Settings → System Logs
2. Browse backend logs in real-time
3. See color-coded errors and warnings
4. Search for specific patterns

**Via API**:
```bash
# Get error summary (past 24 hours)
curl http://localhost:8433/api/v1/logs/summary?hours=24

# Get recent errors
curl http://localhost:8433/api/v1/logs/errors?hours=24&limit=10

# Search for specific pattern
curl "http://localhost:8433/api/v1/logs/search?pattern=timeout"

# Get detected patterns with fix suggestions
curl http://localhost:8433/api/v1/logs/patterns
```

**Via CLI**:
```bash
# List recent errors
python -m app.log_analyzer errors 24

# Search for specific pattern
python -m app.log_analyzer search "CSRF" 24

# View error summary
python -m app.log_analyzer summary 24
```

### Error Budget & Cost Control

The system enforces **cost limits** for AI API calls:

```bash
# Set daily cost ceiling (in cents, e.g., 500 = $5.00)
export AI_COST_CEILING_CENTS=500

# System returns HTTP 429 (Too Many Requests) when exceeded
# Cost tracking via X-AI-Cost-Cents response header
```

### Automated Alerts

Critical errors trigger **automatic GitHub issue creation**:

```bash
# Automatically create issues for errors > 5 in 24 hours
python -m app.automation --action create-issues

# Issues include:
# - Error message & frequency
# - Suggested fixes from catalog
# - Investigation steps
# - Related log links
```

Requires `GITHUB_TOKEN` environment variable.

### Fix Catalog

The system includes a built-in catalog of common errors and fixes:

| Pattern | Causes | Suggested Fixes |
|---------|--------|-----------------|
| **404** | Endpoint missing, path doubled, VITE_API_URL misconfigured | Check routes.py, verify VITE_API_URL, inspect network tab |
| **timeout** | Slow query, API slowness, resource exhaustion | Add DB indexes, increase timeout, check CPU/memory |
| **CSRF** | Token missing/expired, cookie not sent | Reload page, check api/client.ts, clear cookies |
| **Gemini** | Invalid model, API key expired, rate limit | Update model name, verify key, wait before retry |
| **validation** | Missing field, wrong type, invalid enum | Check Pydantic schema, inspect error details, fix request |

### Data Retention

- 📊 Logs retained for **30 days** (configurable)
- 🗑️ Auto-cleanup runs daily via Celery beat
- 🔒 All personal data scrubbed from error reports
- 💾 Export available for compliance/support

### Integration with Development

AI agents (Claude, Copilot, Gemini) can use the logging system to:
- **Diagnose issues** during development without SSH
- **Spot trends** (e.g., "Why is this endpoint timing out?")
- **Auto-suggest fixes** based on error patterns
- **Monitor cost** of AI API calls in real-time

See [.github/PLANNING.md](.github/PLANNING.md) for Phase 1-3 logging architecture decisions.

### Quick Health Check
```bash
curl http://localhost:8000/health
docker-compose logs -f
```

### Reset Everything
```bash
./uninstall-full.sh --backup-vault   # Total reset with vault backup
./install-full.sh                    # Reinstall fresh
```

## 🎁 Free to Use — With a Favor

**AetherWave is completely free to use, modify, and deploy.**

If you find this project useful and are making it public (sharing with others, deploying publicly, or using it in a public game/stream), we'd love it if you'd:

- **Add a small credit** in your game credits, stream description, or project README:
  > "Radio content generated with [AetherWave](https://github.com/crashcart/rp-music-radio) — a procedural radio station generator for immersive game environments."
- **Link to this repo** so others discover the tool
- **Share your universe examples** if you create interesting ones (open an issue with your game world!)

This helps the project grow and inspires others to build amazing radio experiences. No obligation—use it freely either way! 🎙️

## 📚 Example Content (Try It Now!)

The repo includes example universes & content you can load immediately:

**Included Examples:**
- 🎮 **Cyberpunk World** — Futuristic neon aesthetic, corporate factions, ramen bars
- ⚔️ **Medieval Kingdom** — Taverns, guilds, fantasy items, ballad aesthetics
- 🌙 **Cosmic Horror** — Eldritch atmospheres, mysterious factions, ambient mood
- 🏜️ **Post-Apocalyptic** — Wasteland survival, faction wars, gritty authenticity

**To Load Examples:**
```bash
# Option 1: Use the UI
# 1. Open http://localhost:8432
# 2. Click "🌍 Universes"
# 3. Enter a universe name from the examples above
# 4. Click "🔍 Research" to auto-populate via AI

# Option 2: Seed via CLI (coming soon)
# python scripts/seed-examples.py
```

Each example includes:
- Researched description (lore, atmosphere, distinctive items)
- Genre/mood hints (e.g., "synthwave|cyberpunk", "dark|mysterious")
- 3-4 sample DJs tailored to the world
- Suggested ad content and places to stay
- Music mood recommendations

## Support

- **Full Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **GitHub Issues**: Post questions & share your universe ideas!
- **Development Log**: [.github/PLANNING.md](.github/PLANNING.md)
- **Bundle Diagnostics**: `./collect-logs.sh` then attach the tarball to your issue
- **Share Your Universes**: Create an issue titled "[Universe] Game Name" with your research results

---

**AetherWave v1.0.4** | Free & Open | Built with FastAPI, React, and Google Cloud AI
