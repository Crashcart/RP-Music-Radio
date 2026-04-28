# AetherWave / RP-Music-Radio — Active Task List

**Last Updated**: 2026-04-27  
**Project**: Headless Media Factory for procedural lore-heavy radio content  
**Status**: Foundation & UI Architecture phase

---

## Current Session: Architecture & UI Realignment

### Governance & Documentation (✅ Completed)

- [x] Copy governance files from Kali-AI-term repository
- [x] Adapt governance files for AetherWave project
- [x] Create `.github/REPO_CONFIG.md` with tech stack details
- [x] Create `.github/TODO.md` with actual project phases
- [x] Create `.github/PLANNING.md` with technical decisions
- [x] Create `.github/ARCHITECTURE.md` (full TDR documentation)
- [x] Update TODO list to reflect the new hierarchical DB architecture

---

## Phase 1: Backend Foundation (Hierarchical DB)

### Backend Tasks

- [x] Create `backend/` directory structure
- [x] Set up database schema with hierarchical models (Station, Artist, Brand, Jingle, Draft)
- [x] Implement API routers for all entities (CRUD for Stations, Artists, Brands, Jingles)
- [x] Implement `POST /api/v1/chat` endpoint (Gemini brainstorming with Google Search grounding)
- [x] Implement `/api/v1/settings/api-key` validation endpoint
- [x] Integrate Lyria, Nano Banana 2, and Gemini SDKs
- [x] Create Celery app config + synthesis pipeline task
- [x] Create `docker/` and `Dockerfile.api`, `Dockerfile.worker`
- [ ] Write unit tests for the 28+ new hierarchical API endpoints

### Backend Blockers

- [ ] Need to verify Celery task runner works flawlessly with the new nested ID fields (station_id, artist_id).

---

## Phase 2: Frontend Foundation (React)

### Frontend Tasks

- [x] Create `frontend/` directory structure and `index.css` design system (dark sci-fi)
- [x] Build **Stations Dashboard** (`Stations.tsx`) with nested DJ & Jingle sub-lists
- [x] Build **Artists Gallery** (`Artists.tsx`) with deep-field forms (22 fields) and portrait generation
- [x] Build **Brands Portal** (`Brands.tsx`) for fictional sponsors and ad settings
- [x] Build **Settings Page** with secure Google API key storage and system status
- [x] Build **AI Chat Assistant** (`ChatAssistant.tsx`) floating widget
- [x] Build real-time task queue monitor (`GenerationQueue.tsx`)
- [x] Refactor `api/client.ts` to support all 28 API methods
- [ ] Write component tests (Jest + React Testing Library)
- [ ] Clean up legacy `DraftingTable.tsx` so it only handles raw CSV ingestion.

---

## Phase 3: AI Integration (MVP)

### AI Integration Tasks

- [x] Implement Gemini Chat Assistant with Google Search grounding
- [x] Wire up Nano Banana 2 integration for Artist Portraits and Station Logos
- [ ] Implement Gemini "Flesh-Out" protocol (expand brand/station seeds into full scripts)
- [ ] Implement Lyria 3 Pro integration for Voice DNA and procedural audio generation
- [ ] Ensure voice consistency across multiple tracks for the same Artist
- [ ] Create Celery async tasks to link generation steps together seamlessly
- [ ] Write AI integration tests

### AI Blockers

- [ ] API rate limits (may need to implement queue management and exponential backoff)
- [ ] Cost tracking strategies for heavy Lyria/Gemini API usage

---

## Phase 4: Persistence & Output

### Persistence Tasks

- [x] Implement enhanced Mutagen ID3v2.4 tagging (18+ tags: genre, BPM, copyright, TXXX seeds)
- [ ] Update Lore_Ledger JSON schema to pull directly from the relational database (Artist/Brand DB)
- [ ] Implement host volume mapping for persistent output (`./radio_vault/`)
- [ ] Implement `POST /api/v1/commit` endpoint (Full synthesis trigger)
- [ ] Establish new hierarchical file naming convention (e.g., `{STATION}/{ARTIST}/{TRACK}.mp3` or `{STATION}/jingles/{JINGLE_TYPE}.mp3`)
- [ ] Write tests for MP3 generation & metadata tagging

---

## Phase 5: Docker & Deployment

### Deployment Tasks

- [x] Finalize `docker-compose.yml` (api, worker, redis, frontend)
- [x] Create `.env.example` with all required variables
- [x] Create installation guide in README.md
- [ ] Test full Docker stack locally and resolve any `NODE_ENV` conflicts
- [ ] Document setup for Synology DS918+ / Beelink S12 Pro
- [ ] Test on target hardware (if available)

---

## Phase 6: Testing & Quality

### Testing Tasks

- [ ] Achieve 80%+ test coverage (Python + React)
- [ ] Set up CI/CD workflows (GitHub Actions)
- [ ] Run full integration tests (end-to-end)
- [ ] Security audit (bandit, npm audit, OWASP check)
- [ ] Performance testing (response times, audio quality)
- [ ] Load testing (concurrent requests, queue depth)
- [ ] Document known limitations & roadmap

---

## Notes

- **Branch**: `feature/stations-artists-brands-restructure` — active development branch
- **Governance**: Follow 10 rules in `.github/copilot-instructions.md`
- **Reference**: Full TDR at `ARCHITECTURE.md`
- **Database**: SQLite (persistent relational), Redis (task queue)
- **APIs**: Google Cloud (Gemini, Lyria, Nano Banana 2)

---

## History

- **2026-04-26**: Initial governance setup + TDR v1.0.4 documentation
- **2026-04-27**: Abandoned flat architecture; migrated to hierarchical relational DB (Stations, Artists, Brands) + AI Chat Assistant.
