# Repository Configuration — RP-Music-Radio

> **Purpose**: Project-specific settings for AI agents and developers. Read this alongside `copilot-instructions.md`.  
> **Last Updated**: 2026-04-26  
> 🔒 **GOVERNANCE FILE** — Protected by Rule 10 in `copilot-instructions.md`. Follow full workflow when editing.

---

## PROJECT OVERVIEW

**Name**: AetherWave / RP-Music-Radio  
**Type**: Headless Media Factory with React Frontend  
**Description**: Procedural lore-heavy radio content generator for game environments. Transforms user-defined seeds (genres, item lists, station vibes) into self-contained Lore-Shard MP3s with embedded metadata, album art, lyrics, and persistent AI voice signatures.  
**Target Users**: Game servers, roleplay communities, content creators  
**Target Hardware**: Docker containers on Synology DS918+ / Beelink S12 Pro (homelab)  
**Status**: Development (TDR v1.0.4)

---

## COMMANDS

### Frontend (React/Node)
| Action                    | Command                     |
| ------------------------- | --------------------------- |
| **Install dependencies**  | `npm install`               |
| **Run dev server**        | `npm run dev`               |
| **Build frontend**        | `npm run build`             |
| **Run tests**             | `npm test`                  |
| **Lint (check)**          | `npm run lint:check`        |
| **Lint (fix)**            | `npm run lint`              |
| **Format (check)**        | `npm run format:check`      |
| **Format (fix)**          | `npm run format`            |

### Backend (FastAPI/Python)
| Action                    | Command                     |
| ------------------------- | --------------------------- |
| **Install dependencies**  | `pip install -r requirements.txt` |
| **Run API server**        | `python -m uvicorn app:app --reload` |
| **Run Celery worker**     | `celery -A tasks worker --loglevel=info` |
| **Run tests**             | `pytest`                    |
| **Lint (Python)**         | `flake8 .`                  |
| **Format (Python)**       | `black .`                   |
| **Security audit**        | `bandit -r .`               |

### Docker
| Action                    | Command                     |
| ------------------------- | --------------------------- |
| **Start all services**    | `docker-compose up -d`      |
| **Stop all services**     | `docker-compose down`       |
| **View logs**             | `docker-compose logs -f`    |
| **Run migrations**        | `docker-compose exec api alembic upgrade head` |

---

## FILES TO MONITOR

Read these before editing anything in the project.

### Governance (read first every session)

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `.github/copilot-instructions.md` | Universal agent rules                |
| `.github/REPO_CONFIG.md`          | This file — project-specific config  |
| `.github/TODO.md`                 | Active task list                     |
| `.github/PLANNING.md`             | Planning, context, and handoff notes |

### Core Application

| File                           | Description                              | Conflict Risk |
| ------------------------------ | ---------------------------------------- | :-----------: |
| **Frontend**                   |                                          |               |
| `frontend/package.json`        | React dependencies & scripts             |   🟡 MEDIUM   |
| `frontend/src/App.tsx`         | Main React component (Drafting Table)    |   🟡 MEDIUM   |
| `frontend/src/pages/`          | Page components (Draft, Generate, etc.)  |   🟡 MEDIUM   |
| `frontend/tailwind.config.js`  | Tailwind CSS configuration               |   🟢 LOW      |
| **Backend**                    |                                          |               |
| `backend/requirements.txt`     | Python dependencies                      |   🟡 MEDIUM   |
| `backend/app/main.py`          | FastAPI server & route definitions       |   🟡 MEDIUM   |
| `backend/app/api/`             | API endpoints (v1 routes)                |   🟡 MEDIUM   |
| `backend/app/models/`          | Database models (Drafts, Personas)       |   🟡 MEDIUM   |
| `backend/app/tasks/`           | Celery task definitions                  |   🟡 MEDIUM   |
| `backend/app/integrations/`    | Google APIs (Gemini, Lyria, Nano)       |   🟡 MEDIUM   |
| `backend/app/utils/mutagen_handler.py` | ID3 tag imprinting         |   🟡 MEDIUM   |
| **Database**                   |                                          |               |
| `backend/database.sqlite`      | SQLite persistent storage (gitignored)   |   🟢 LOW      |
| `backend/persona_db/`          | Voice DNA persistence (volume-mapped)    |   🟢 LOW      |
| **Docker**                     |                                          |               |
| `docker-compose.yml`           | Multi-container orchestration            |   🟡 MEDIUM   |
| `Dockerfile.api`               | FastAPI container image                  |   🟡 MEDIUM   |
| `Dockerfile.worker`            | Celery worker container image            |   🟡 MEDIUM   |
| **Configuration**              |                                          |               |
| `.env.example`                 | Environment variable template            |   🟢 LOW      |
| `README.md`                    | Project documentation                    |   🟡 MEDIUM   |

---

## HIGH-CONFLICT FILES

These files are frequently edited. Check `PLANNING.md` before modifying.

| File                              |   Risk    | Why                                      |
| --------------------------------- | :-------: | ---------------------------------------- |
| `.github/copilot-instructions.md` |  🔴 HIGH  | Governance rules                         |
| `backend/app/main.py`             | 🔴 HIGH   | Routes, middleware, API definitions      |
| `backend/app/integrations/`       | 🟡 MEDIUM | AI API integrations (Gemini, Lyria)      |
| `frontend/package.json`           | 🟡 MEDIUM | Dependency version conflicts             |
| `docker-compose.yml`              | 🟡 MEDIUM | Service config, volume mappings          |
| `README.md`                       | 🟡 MEDIUM | Documentation and setup instructions     |

---

## PROJECT CONVENTIONS

### Technology Stack
- **Frontend**: React 18+ (TypeScript), Tailwind CSS, Vite
- **Backend**: FastAPI (Python 3.11+), Pydantic, SQLAlchemy
- **Database**: SQLite (persistent), Redis (task queue)
- **Task Queue**: Celery + Redis (async audio/image generation)
- **Container**: Docker + Docker Compose
- **Meta Engine**: Mutagen (ID3v2.4 tag manipulation)
- **AI APIs**: Google Cloud (Gemini 3 Flash, Lyria 3 Pro, Nano Banana 2)

### Naming Conventions
- **Files**: snake_case for Python, camelCase for TypeScript
- **Classes**: PascalCase (Python & TypeScript)
- **Constants**: UPPER_SNAKE_CASE
- **Directories**: lowercase, hyphenated (e.g., `persona_db`, `radio_vault`)
- **MP3 Files**: `{STATION}_{ARTIST}_{TRACK}.mp3` (auto-generated)

### Database & Persistence
- **SQLite**: Main database (backend/database.sqlite) — stores Drafts, Personas, History
- **Host Volume**: `./radio_vault/` — generated MP3s with full lore imprinted
- **Persona DB**: `./persona_db/` — Voice DNA seeds for consistent AI voices
- **Redis**: In-memory queue for Celery task management

### ID3v2.4 Lore-Shard Schema
All MP3s are "lore containers" with these tags:
- **TPE1**: Artist/DJ name
- **TALB**: Station name
- **TIT2**: Track title
- **USLT**: Script/lyrics or 15s ad copy
- **APIC**: Album art (1600x1600 JPG)
- **COMM**: Provenance string
- **TXXX**: Lore_Ledger (JSON: backstory, market_research, voice_id)

### Testing & Quality
- **Unit Tests**: pytest for Python, Jest for React
- **Linting**: flake8 (Python), ESLint (JavaScript)
- **Formatting**: black (Python), Prettier (JavaScript)
- **Security**: bandit (Python), npm audit
- **Coverage Target**: 80%+ for both backends
- **Pre-commit Hooks**: Enforce linting, formatting, conventional commits

### API Versioning
- **Current**: `/api/v1/` (all endpoints)
- **Core Endpoints**:
  - `POST /api/v1/ingest` — Upload CSV/seed list
  - `GET /api/v1/drafts` — List drafting table entries
  - `PATCH /api/v1/drafts/{id}` — Edit before commitment
  - `POST /api/v1/commit` — Send to Celery for synthesis
  - `GET /api/v1/tasks/{task_id}` — Check generation status

### Commits
Use conventional commit format:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Test additions/updates
- `refactor:` — Code reorganization (no behavior change)
- `chore:` — Build, deps, config
- Example: `feat: Add Market Research Ad Logic [Issue #15]`

---

## CI/CD WORKFLOWS

| Workflow               | Trigger       | Purpose                                         |
| ---------------------- | ------------- | ----------------------------------------------- |
| `test.yml`             | Push/PR       | Pytest (Python) + Jest (React), coverage       |
| `lint.yml`             | Push/PR       | flake8 (Python), ESLint + Prettier (React)     |
| `security-audit.yml`   | Push/PR       | bandit (Python), npm audit                      |
| `docker-build.yml`     | Push to main  | Build & validate Dockerfiles, docker-compose   |
| `code-review-gate.yml` | PR to main    | Conflict detection, static review, docs check   |

---

## BRANCH STRATEGY

| Branch         | Purpose                     |
| -------------- | --------------------------- |
| `main`         | Production-ready, protected |
| `feat/issue-N` | Feature branches            |
| `fix/issue-N`  | Bug fix branches            |
| `docs/name`    | Documentation branches      |
| `chore/name`   | Maintenance branches        |

---

## Development Checklist

Before submitting a PR, ensure:
- [ ] All Python tests pass (`pytest`)
- [ ] All React tests pass (`npm test`)
- [ ] Python linting passes (`flake8 .`)
- [ ] JavaScript linting passes (`npm run lint:check`)
- [ ] Code formatting correct (black & Prettier)
- [ ] Security audit clean (`bandit -r .`, `npm audit`)
- [ ] Docker images build successfully
- [ ] `.github/TODO.md` updated with completed subtasks
- [ ] `.github/PLANNING.md` updated with decisions and blockers
- [ ] `README.md` updated if public-facing changes
- [ ] Database migrations tested (if applicable)
- [ ] PR title follows: `feat: <description> [Issue #N]`
- [ ] PR body includes context from `.github/PLANNING.md`

---

## Environment Variables

See `.env.example` for required variables:

| Variable                | Required | Purpose                              |
| ----------------------- | -------- | ------------------------------------ |
| `GOOGLE_API_KEY`        | ✅ Yes   | Google Cloud API key (Gemini, etc.)  |
| `DEVICE_TYPE`           | ✅ Yes   | Hardware type (INTEL_QUICKSYNC, etc) |
| `AUTO_NAME_FORMAT`      | ✅ Yes   | MP3 naming scheme                    |
| `FILLER_ENABLED`        | ✅ Yes   | Enable Filler Protocol (true/false)  |
| `REDIS_URL`             | ✅ Yes   | Redis connection string              |
| `DATABASE_URL`          | ✅ Yes   | SQLite connection string             |
| `LOG_LEVEL`             | No       | Logging level (DEBUG, INFO, etc.)    |

**Never commit sensitive keys.** Use GitHub Secrets for CI/CD and `.env.local` for local development.

---

## System Architecture Overview

See the full **Technical Design Reference (TDR)** in `ARCHITECTURE.md` for:
- Detailed AI API specifications (Gemini, Lyria, Nano Banana 2)
- Lore-Shard MP3 schema with ID3v2.4 tags
- Voice DNA & persistence layer (Latent Voice Vectors)
- Market Research Ad Logic (Simple, Flavor, Filler modes)
- Complete workflow diagram (Stage & Commit)

## Docker Deployment

All services run in containers. Local volume mapping:
- `./radio_vault/` → Generated MP3s (host machine file system)
- `./persona_db/` → Voice DNA persistence
- `./backend/database.sqlite` → Main database (gitignored)

Start entire stack: `docker-compose up -d`

## Questions or Clarifications?

If `REPO_CONFIG.md` is unclear or missing information about the project:
1. Post a question in the issue
2. Update `.github/PLANNING.md` with context
3. Reference the TDR in `ARCHITECTURE.md` for system details
4. Escalate to human review for governance clarifications
