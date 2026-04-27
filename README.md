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

## Support

- **Full Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **GitHub Issues**: Post questions
- **Development Log**: [.github/PLANNING.md](.github/PLANNING.md)
- **Bundle Diagnostics**: `./collect-logs.sh` then attach the tarball to your issue

---

**AetherWave v1.0.4** | Built with FastAPI, React, and Google Cloud AI
