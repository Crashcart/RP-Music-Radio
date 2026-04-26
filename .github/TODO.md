# AetherWave / RP-Music-Radio — Active Task List

**Last Updated**: 2026-04-26  
**Project**: Headless Media Factory for procedural lore-heavy radio content  
**Status**: Foundation & Governance phase

---

## Current Session: Foundation Setup

### Governance & Documentation (✅ In Progress)

#### Completed ✅
- [x] Copy governance files from Kali-AI-term repository
- [x] Adapt governance files for AetherWave project
- [x] Create `.github/REPO_CONFIG.md` with tech stack details
- [x] Create `.github/TODO.md` with actual project phases
- [x] Create `.github/PLANNING.md` with technical decisions
- [x] Create `.github/ARCHITECTURE.md` (full TDR documentation)
- [x] Create `.github/workflows/test.yml` (Python + React tests)
- [x] Create `.github/workflows/lint.yml` (flake8, ESLint, black, Prettier)
- [x] Create `.github/workflows/security-audit.yml` (bandit, npm audit)
- [x] Create `.github/workflows/docker-build.yml` (validate Dockerfiles)
- [x] Create `.github/workflows/code-review-gate.yml` (conflict detection, docs check)

#### Pending ⏳
- [ ] Configure GitHub branch protections (manual in Settings)

---

## Phase 1: Backend Foundation (MVP)

### Subtasks:
- [ ] Create `backend/` directory structure
  - [ ] `app/main.py` — FastAPI server
  - [ ] `app/api/v1/` — Routes (ingest, drafts, commit, tasks)
  - [ ] `app/models/` — SQLAlchemy models (Draft, Persona, History)
  - [ ] `app/tasks/` — Celery task definitions
  - [ ] `app/integrations/` — Google APIs (Gemini, Lyria, Nano)
  - [ ] `app/utils/` — Helpers (mutagen_handler, filler_protocol, etc.)
- [ ] Create `requirements.txt` with core dependencies
  - [ ] FastAPI, Uvicorn, Pydantic
  - [ ] SQLAlchemy, Alembic (migrations)
  - [ ] Celery, Redis
  - [ ] Mutagen (ID3 tagging)
  - [ ] google-cloud-generativeai (Gemini API)
  - [ ] Pytest, Black, Flake8
- [ ] Create `docker/` and `Dockerfile.api`, `Dockerfile.worker`
- [ ] Set up database schema (Drafts, Personas, History)
- [ ] Implement `POST /api/v1/ingest` endpoint
- [ ] Implement `GET /api/v1/drafts` endpoint
- [ ] Implement `PATCH /api/v1/drafts/{id}` endpoint (editing)
- [ ] Write unit tests for all endpoints
- [ ] Document API in OpenAPI/Swagger

### Blockers:
- [ ] Google Cloud API credentials setup

---

## Phase 2: Frontend Foundation (React)

### Subtasks:
- [ ] Create `frontend/` directory structure
  - [ ] `src/components/` — Reusable UI components
  - [ ] `src/pages/DraftingTable.tsx` — Main spreadsheet interface
  - [ ] `src/pages/GenerateQueue.tsx` — Task queue monitor
  - [ ] `src/api/client.ts` — API client (fetch/axios)
  - [ ] `src/hooks/` — Custom React hooks
  - [ ] `src/styles/` — Tailwind CSS setup
- [ ] Create `package.json` with React, Vite, Tailwind, Jest
- [ ] Build "Drafting Table" UI component (spreadsheet-like)
- [ ] Implement CSV/seed list upload form
- [ ] Create task queue monitor (task status polling)
- [ ] Add settings panel (API key input, device type selection)
- [ ] Write component tests (Jest + React Testing Library)
- [ ] Style with Tailwind CSS

---

## Phase 3: AI Integration (MVP)

### Subtasks:
- [ ] Set up Google Cloud credentials
- [ ] Implement Gemini 3 Flash integration
  - [ ] "Flesh-Out" research (expand seeds to full scripts)
  - [ ] Filler Protocol (procedural quirks, PSAs)
  - [ ] Market Research Ad Logic
- [ ] Implement Lyria 3 Pro integration (audio synthesis)
  - [ ] Voice DNA system (Latent Voice Vectors)
  - [ ] Consistent voice across multiple tracks
- [ ] Implement Nano Banana 2 integration (image generation)
  - [ ] Batch Style Seed (consistent album art)
- [ ] Create Celery async tasks for synthesis
- [ ] Implement task status tracking API (`GET /api/v1/tasks/{task_id}`)
- [ ] Write integration tests

### Blockers:
- [ ] API rate limits (may need to implement queue management)
- [ ] Cost tracking (generative AI can be expensive)

---

## Phase 4: Persistence & Output

### Subtasks:
- [ ] Implement Mutagen ID3v2.4 tagging
  - [ ] TPE1, TALB, TIT2, USLT, APIC, COMM, TXXX (Lore_Ledger)
- [ ] Create Lore_Ledger JSON schema (backstory, market_research, voice_id)
- [ ] Implement host volume mapping (./radio_vault/)
- [ ] Create Persona DNA persistence (./persona_db/)
  - [ ] Voice seed storage & retrieval
  - [ ] Memory lookup (habits, rivals, history)
- [ ] Implement `POST /api/v1/commit` endpoint (full synthesis)
  - [ ] Call Gemini for script
  - [ ] Call Lyria for audio
  - [ ] Call Nano for art
  - [ ] Imprint with Mutagen
  - [ ] Move to radio_vault/
- [ ] Create file naming convention ({STATION}_{ARTIST}_{TRACK}.mp3)
- [ ] Write tests for MP3 generation & tagging

---

## Phase 5: Docker & Deployment

### Subtasks:
- [ ] Finalize `docker-compose.yml`
  - [ ] aetherwave-api service
  - [ ] aetherwave-worker service (Celery)
  - [ ] redis service
- [ ] Create `.env.example` with all required variables
- [ ] Test full Docker stack locally
- [ ] Document setup for Synology DS918+ / Beelink S12 Pro
- [ ] Create installation guide in README.md
- [ ] Test on target hardware (if available)

---

## Phase 6: Testing & Quality

### Subtasks:
- [ ] Achieve 80%+ test coverage (Python + React)
- [ ] Set up CI/CD workflows (GitHub Actions)
- [ ] Run full integration tests (end-to-end)
- [ ] Security audit (bandit, npm audit, OWASP check)
- [ ] Performance testing (response times, audio quality)
- [ ] Load testing (concurrent requests, queue depth)
- [ ] Document known limitations & roadmap

---

## Notes

- **Branch**: `claude/copy-github-rules-w1KTY` — development branch
- **Governance**: Follow 10 rules in `.github/copilot-instructions.md`
- **Reference**: Full TDR at `ARCHITECTURE.md`
- **Database**: SQLite (persistent), Redis (task queue)
- **APIs**: Google Cloud (Gemini, Lyria, Nano Banana 2)

---

## History

- **2026-04-26**: Initial governance setup + TDR v1.0.4 documentation
