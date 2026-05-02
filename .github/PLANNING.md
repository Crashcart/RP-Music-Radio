# AetherWave / RP-Music-Radio — Planning & Decisions Log

**Last Updated**: 2026-04-26  
**Project**: Headless Media Factory — Procedural Lore-Heavy Radio Content Generator  
**TDR Version**: 1.0.4 (Reference: `ARCHITECTURE.md`)

---

## Session 1: Governance & Architecture Foundation (2026-04-26)

### Objective
Establish governance framework and document AetherWave technical architecture to guide development of MVP phases.

---

## Architectural Decisions

### 1. System Architecture ✅
**Decision**: Microservices architecture with containerized services
- **Frontend**: React 18+ with Tailwind CSS, Vite bundler
- **Backend**: FastAPI (Python 3.11+) with async task queue
- **Task Queue**: Celery + Redis (async audio/image generation prevents UI timeout)
- **Database**: SQLite (persistent) + Redis (in-memory queue)
- **Containers**: Docker + Docker Compose (multi-service orchestration)

**Rationale**: 
- FastAPI is lightweight, high-performance, and ideal for homelab hardware
- Celery handles long-running AI synthesis without blocking UI
- Docker ensures reproducibility on Synology DS918+ / Beelink S12 Pro
- SQLite requires no external database; Redis is standard Celery broker

**Trade-offs**:
- SQLite not ideal for 1000+ concurrent users (but acceptable for homelab scale)
- Redis requires memory allocation (trade-off for responsive UI)

---

### 2. AI API Integrations ✅
**Decision**: Use Google 2026 API suite exclusively
- **Gemini 3 Flash** (Director) — Script/lore generation, market research
- **Lyria 3 Pro** (Musician) — Audio synthesis with voice persistence
- **Nano Banana 2** (Artist) — Album art generation with batch consistency

**Rationale**:
- Gemini 3 Flash is cost-effective for creative content
- Lyria supports Latent Voice Vectors for persistent AI voice signatures
- All three APIs support batch processing (important for queue throughput)
- TDR specifies these APIs; no alternatives planned

**Constraints**:
- API rate limits require queue management
- Costs scale with generation volume (need monitoring)
- Credentials must be stored securely (GitHub Secrets, not committed)

---

### 3. Voice Persistence & Memory ✅
**Decision**: Implement Latent Voice Vector system for consistent AI voices
- **Voice Seed**: UUID stored in `persona_db/` on first DJ/Artist creation
- **Persistence**: Voice seed passed to Lyria on every synthesis call
- **Memory Layer**: Before generating new scripts, Gemini reads `persona_db` to retrieve DJ habits/history
- **Database**: SQLite stores Persona records; Redis caches for fast lookup

**Rationale**:
- Game world immersion requires recognizable AI voices
- Procedural memory (habits, quirks) makes content feel authored
- Decoupled persistence (file-based + DB) allows container portability

**Implementation Detail**:
```json
{
  "persona_id": "dj-vance-rikard",
  "voice_seed": "550e8400-e29b-41d4-a716-446655440000",
  "type": "DJ",
  "habits": ["clicks pen during silence", "laughs at own jokes"],
  "rivals": ["DJ Static"],
  "history": ["100+ tracks generated", "favorite genre: synthwave"]
}
```

---

### 4. Lore-Shard MP3 Schema ✅
**Decision**: Embed all metadata directly into MP3 headers via ID3v2.4
- **Tags**: TPE1, TALB, TIT2, USLT, APIC, COMM, TXXX (Lore_Ledger)
- **Tool**: Mutagen (Python library for ID3 manipulation)
- **Portability**: MP3 becomes self-contained "lore container"
- **Versioning**: File stays with metadata even if moved/redistributed

**Rationale**:
- No separate database query needed to retrieve lore
- MP3 file is the authoritative record
- Works seamlessly with game engines and media players
- ID3v2.4 is universal standard (not proprietary)

**Schema Example**:
```json
{
  "backstory": "Vance Rikard took over Nebula FM when the former DJ...",
  "market_research": "Fusion Cores prevent reactor meltdown. 20% markup at spacedock.",
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "genre": "synthwave",
  "station": "Nebula FM 99.8"
}
```

---

### 5. Workflow: "Stage & Commit" ✅
**Decision**: Two-phase content creation process
1. **Stage**: User uploads seed (CSV, list, or form). AI "flesh-out" expands with research.
2. **Commit**: User confirms. Async synthesis (Celery) generates MP3 + art + imprints metadata.

**Rationale**:
- User retains editorial control before AI synthesis (expensive, time-consuming)
- Drafting Table UI allows editing before commitment
- Async prevents UI timeout during 3-5 minute synthesis window
- Clear separation between "planning" and "execution"

**API Endpoints**:
- `POST /api/v1/ingest` — Upload seed data
- `GET /api/v1/drafts` — List drafting table entries (not yet committed)
- `PATCH /api/v1/drafts/{id}` — Edit before commitment
- `POST /api/v1/commit` — Send to synthesis queue
- `GET /api/v1/tasks/{task_id}` — Poll generation status

---

### 6. Filler Protocol ✅
**Decision**: Procedural quirk injection when user provides minimal data
- **Simple Mode**: Direct descriptions (e.g., "Buy a Med-Kit")
- **Flavor Mode**: Brand-infused descriptions (e.g., "Patch-Me-Up 5000, 20% off")
- **Filler Mode**: AI-generated PSAs, station announcements when no item provided

**Rationale**:
- Prevents "dead air" (silence/blank content)
- Procedural quirks feel authored within game lore
- Reduces user input burden (works well for bulk generation)
- Configurable via `FILLER_ENABLED` env var

**Examples**:
- Missing item: → "Internal Gravity Safety PSA"
- Missing DJ: → "AI-generated guest host with quirk"
- Missing genre: → Research similar genres and pick one

---

## Development Phases & Milestones

### Phase 1: Backend Foundation (MVP)
**Timeline**: 2-3 weeks  
**Deliverables**:
- FastAPI server with 5 core endpoints
- SQLAlchemy models (Draft, Persona, History)
- Celery + Redis task queue
- 70%+ test coverage
- OpenAPI documentation

**Blockers**: None (architecture finalized)

---

### Phase 2: Frontend (React Drafting Table)
**Timeline**: 2 weeks  
**Deliverables**:
- Spreadsheet-like UI for draft staging
- CSV/seed upload form
- Task queue monitor (real-time status)
- Settings panel (API key, device type, options)
- 70%+ component test coverage

**Blockers**: None (design finalizedper TDR 1.0.4)

---

### Phase 3: AI Integration & Synthesis
**Timeline**: 2-3 weeks  
**Deliverables**:
- Gemini script generation (Filler Protocol implemented)
- Lyria audio synthesis with voice persistence
- Nano Banana 2 album art generation
- Mutagen ID3 tagging (full Lore-Shard schema)
- Async synthesis pipeline fully operational
- Cost monitoring & rate limit handling

**Blockers**: 
- Google API quota setup
- Cost estimation

---

### Phase 4: Persistence, Output, & Docker
**Timeline**: 1-2 weeks  
**Deliverables**:
- Host volume mapping (radio_vault/, persona_db/)
- Full docker-compose.yml
- .env.example with all variables
- Installation guide for Synology/Beelink
- End-to-end testing on target hardware

**Blockers**: Access to target hardware for testing

---

### Phase 5: CI/CD & Testing Infrastructure
**Timeline**: 1 week  
**Deliverables**:
- GitHub Actions workflows (test, lint, security, docker-build, code-review-gate)
- 80%+ test coverage achieved
- Security audit (bandit, npm audit, OWASP)
- Performance benchmarks documented

**Blockers**: None

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Google API rate limits | High | Implement queue backoff; monitor quota daily |
| AI synthesis cost overruns | Medium | Add per-request cost estimates; implement daily budget cap |
| SQLite scaling (100+ concurrent users) | Low | Document limitations; upgrade path to PostgreSQL documented |
| Voice consistency degrades over time | Medium | Test Latent Voice Vector persistence monthly |
| Container resource exhaustion | Medium | Memory limits in docker-compose; add resource monitoring |

---

## Known Limitations & Future Work

### MVP Limitations (By Design)
- Single-user (no RBAC/multi-user authentication)
- SQLite only (no distributed DB support)
- No caching of generated assets (each generation is fresh)
- Market Research limited to 15-second ad scripts
- No ability to regenerate specific portions post-commitment

### Roadmap (Post-MVP)
- [ ] Multi-user authentication (OAuth + JWT)
- [ ] PostgreSQL support for scaling
- [ ] Asset caching & deduplication
- [ ] Extended market research (full commercials, station bumpers)
- [ ] Voice fine-tuning interface
- [ ] Batch generation with scheduling
- [ ] Integration with game engines (direct file injection)

---

## Questions for Human Review

1. **Google Cloud Setup**: Is API key provisioning documented? Budget approval?
2. **Target User Count**: Is single-user MVP acceptable, or does Phase 1 need multi-user?
3. **Hardware Testing**: Can MVP be tested on actual Synology DS918+ / Beelink S12 Pro?
4. **Content Moderation**: Should generated MP3s be reviewed before export?
5. **License & Attribution**: Should all generated content include SynthID watermark?

---

## Session Summary

✅ **Completed**:
- Governance framework established (10 rules + 4-phase workflow)
- AetherWave technical architecture documented
- Phase breakdown defined with clear deliverables
- Risk assessment and roadmap outlined

⏳ **Pending**:
- Manual GitHub branch protection configuration
- CI/CD workflow implementations
- Project directory structure creation
- Initial backend/frontend scaffolding

**Next Actions**:
1. Human review of technical decisions
2. Google Cloud API provisioning
3. Begin Phase 1: Backend scaffolding
4. Set up CI/CD workflows in parallel

---

## Session 2: Bug Fixes & Refinement (2026-05-01)

### 7. Gemini API Google Search Grounding Bug ✅
**Decision**: Removed `google_search` tool from Gemini API calls in `/api/v1/chat`.
**Rationale**: 
- The `google-genai` SDK threw 500 Internal Server Errors when passing `{"google_search": {}}` directly in the `tools` array. 
- Since the AetherWave chat assistant is meant for fictional brainstorming, web search is unnecessary and was causing complete failure of the chat endpoint.

### 8. System Logs Viewer & Endpoint (2026-05-01) ✅
**Decision**: Built a `/api/v1/settings/logs` endpoint and a premium frontend terminal UI to view `backend.log`.
**Rationale**: 
- Necessary to quickly diagnose backend issues (like the Gemini 500 error) without needing terminal access to the Docker container.
- Provides immediate developer feedback directly within the web app's Settings page.

### 9. Entity Relationship Constraints (2026-05-01) ✅
**Decision**: Enforced a strict rule across the codebase and AI prompts: "DJs (Artists) MUST be linked to stations. All other topics (Brands, etc.) MUST NOT be linked to a station."
**Rationale**: 
- Fixes issues where the AI or data models were incorrectly attempting to link global entities (like Brands) to specific stations. Added this rule to `copilot-instructions.md`, `REPO_CONFIG.md`, and the Chat Assistant System Prompt.
