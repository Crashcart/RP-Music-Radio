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

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/crashcart/rp-music-radio.git
   cd rp-music-radio
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Google API key
   ```

3. **Create host volumes**
   ```bash
   mkdir -p radio_vault persona_db market_ingest
   ```

4. **Launch Docker stack**
   ```bash
   docker-compose up -d
   docker-compose ps
   ```

5. **Access the frontend**
   ```
   http://localhost:8080
   ```

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
3. Submit PR with full context
4. Pass CI/CD checks
5. Await human review

## Support

- **Full Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **GitHub Issues**: Post questions
- **Development Log**: [.github/PLANNING.md](.github/PLANNING.md)

---

**AetherWave v1.0.4** | Built with FastAPI, React, and Google Cloud AI
