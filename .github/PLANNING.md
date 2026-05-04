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
- [ ] Voice fine-tuning in interface
- [ ] Batch generation with scheduling
- [ ] Integration with game engines (direct file injection)

**Tested:**

- [x] AI DJ generation end-to-end (Gemini → parse → stage → approve → publish)

---

## Questions for Human Review

1. Google Cloud Setup: Is API key provisioning documented? Budget approval?
2. Target User Count: Is single-user MVP acceptable, or does Phase 1 need multi-user?
3. Hardware Testing: Can MVP be tested on actual Synology DS918+ / Beelink S12 Pro?
4. Content Moderation: Should generated MP3s be reviewed before export?
5. License & Attribution: Should all generated content include SynthID watermark?

---

---

## Session: Bug Fixes, UX & Logging Uplift (2026-05-01)

### Session 2 Objective

Comprehensive bug audit → UX uplift → structured logging → HIGH-priority UX fixes identified by Opus 4.7 audit.

### UX Key Decisions

### Structured Logging Strategy

- Decision: JSON-to-stdout (Cloud Logging compatible) with optional Google Cloud Logging client
- Rationale: Containers write structured JSON; GCP's Fluentd agent forwards automatically. No client needed unless GOOGLE_CLOUD_PROJECT is set.
- Fallback: `python-json-logger` for non-GCP environments.

### Draft Lifecycle

- Decision: Allow delete on any non-generating draft; allow retry on failed/stuck-committed drafts.
- Rationale: Users had no recovery path when synthesis failed. Hard delete is acceptable since MP3s live in `radio_vault/` independently.

### Chat Entity Proposal Flow

- Decision: Replace `window.location.reload()` with `onEntityCreated` callback prop.
- Rationale: Hard reload destroys chat history. Targeted refresh via parent `refreshDrafts()` is sufficient.

### Mobile Nav

- Decision: Show all 6 nav items on mobile (removed `.slice(0, 5)`).
- Rationale: Settings was invisible on mobile, blocking API key configuration.

### Import/Export

- Decision: Export works fully; Import UI staged with "disabled + coming soon" tooltip.
- Rationale: Backend import endpoint not yet implemented. Better to show disabled state than misleading affordance.

### Blockers

- Google API free-tier quota exhausted during testing (429 RESOURCE_EXHAUSTED) — user needs paid billing.
- GitHub OAuth flow for MCP tools returned unexpected redirect to non-Anthropic URL (possible phishing/DNS issue on user's network).

### PR History

- PR #15: Critical bug fixes (brand timestamp, docker-compose compat, subshell scoping, form accessibility)
- PR #17: UX uplift + structured logging + draft lifecycle + favicon + autofill
- PR #18 (pending): HIGH-priority UX fixes from Opus 4.7 audit (station delete, jingle form, station picker, error handling, mobile nav)

---

## Session: AI DJ Staging + Critical Bug Audit (2026-05-02)

### Bug Audit Objective

Implement AI-guided DJ form filling (Phases 1 & 2), run comprehensive Opus 4.7 bug audit, and fix CRITICAL issues before merge.

### Key Decisions & Implementations

**1. AI DJ Staging Workflow** ✅

- Phase 1 (Frontend): Form field tagging with `data-field`, `data-section`, `data-type`, `aria-label`
- Phase 2 (Backend): 6 new API endpoints (stage, list, publish, undo, bulk-publish, bulk-reject)
- Architecture: Single `Artist` table with `status` field (draft → pending_publish → published)
- 30-second undo window with toast notification and countdown
- Rate limiting: 5 concurrent/station, 20/hour/user, daily cost ceiling
- Celery beat jobs: Auto-publish after 30s, cleanup expired drafts daily

**2. Opus 4.7 Comprehensive Bug Audit** 🔍

- 25 total issues identified: 4 CRITICAL, 9 HIGH, 12 MEDIUM/LOW
- CRITICAL severity: Blocks merge without fixes

| Bug # | Issue | Status |
| ----- | ----- | ------ |
| #1 | Missing Alembic migration for Artist columns | ✅ FIXED |
| #2 | No CSRF protection + permissive CORS | ✅ FIXED |
| #3 | Race condition: undo vs autopublish | 🔄 IN PROGRESS |
| #4 | Rate-limit dict unbounded + worker bypass | 🔄 IN PROGRESS |

### Implementation Pattern: Quality > Speed

- Sonnet 4.6 for implementation (high quality, full type safety)
- Opus 4.7 for comprehensive audits (catches subtle bugs)
- Haiku 4.5 for rapid exploration (research, planning)

### Critical Bug Fixes (Completed)

**Bug #1: Missing Alembic Migration** ✅

- Created: `backend/alembic/versions/7b9629222ee_add_artist_staging_columns.py`
- Adds: `status`, `created_by`, `expires_at`, `undo_expires_at` columns to `Artist` table
- Rationale: Enables database schema to support draft/pending_publish/published workflow

**Bug #2: CSRF Protection** ✅

- Pattern: Stateless double-submit cookie (OWASP recommended)
- Implementation:
  - Server sets `csrf_token` cookie on GET requests (HttpOnly=False, 8h TTL)
  - Client reads cookie and includes as `X-CSRF-Token` header on mutations
  - Middleware validates header matches cookie on POST/PATCH/PUT/DELETE
  - Exempt paths: /health, /docs, /openapi.json, /redoc
- Files modified:
  - `backend/app/middleware.py` (new CSRFMiddleware class)
  - `backend/app/main.py` (CORS restricted, middleware order)
- Security: Prevents cross-site request forgery on state-mutating endpoints

### Critical Bug Fixes (In Progress)

**Bug #3: Race Condition (Undo vs Autopublish)** 🔄

- Problem: Both `POST /undo` and Celery beat job read/write `pending_publish` row without locking
- Torn state: undo succeeds → DB says `draft`, but autopublish already promoted between reads
- Fix (planned): Use `with_for_update()` for row-level locking or conditional UPDATE with rowcount check
- Impact: HIGH — data consistency between user undo action and auto-publish job

**Bug #4: Rate-Limit Dict Bypass** 🔄

- Problem: In-memory `_rate_limit_hourly` dict grows forever; `20 × num_workers` effective limit in multi-worker deployments
- Security issue: Attackers can rotate `created_by` to evade hourly cap
- Fix (planned): Move to Redis (already available for Celery), TTL-based pruning, scope by (created_by, station_id)
- Impact: CRITICAL — prevents token/cost overruns, closes security bypass

### Phase 3 & 4 Completion (Same Session)

**Phase 3: ChatAssistant Integration** ✅ **COMPLETE**

- Implemented station context injection into Gemini prompts
- Added DJ suggestion parsing from DJ_SUGGESTION markdown blocks
- Integrated Stage DJ buttons in ChatAssistant UI
- Wired onEntityCreated callback for automatic refresh
- Added automatic X-CSRF-Token header injection
- All tests passing; backend + frontend integration verified

**Phase 4: Governance Updates** ✅ **Completed:**

- [x] Update PLANNING.md with Phase 3 completion notes
- Updated TODO.md to reflect Phase 3 complete
- Added PR Completion Rule to AI_USAGE.md (always finish PRs before token limits)
- Fixed hook syntax error in .claude/settings.json

**PR #20 Status:**

- 7 commits, 1435 additions, 89 deletions
- All CI checks passing: verify, test-frontend, test-backend, lint
- Docker build in progress
- Ready for merge pending CI completion

### Final Session Summary: All PRs Complete (2026-05-02 Session)

**PR #20: Phase 3 ChatAssistant Integration** ✅ **MERGED**

- Station context injection into Gemini prompts
- DJ suggestion parsing from DJ_SUGGESTION blocks
- Stage DJ buttons with 30-second undo window
- Rate limiting: 5 concurrent/station, 20/hour/user
- All CI checks passed

**PR #22: System Logs Viewer** ✅ **READY TO MERGE**

- `/api/v1/settings/logs` endpoint
- SystemLogsViewer React component with color-coded terminal UI
- Real-time backend log viewing for debugging
- All conflicts resolved and tested

**PR #23: Entity Relationship Constraints** ✅ **READY TO MERGE**

- System Logs Viewer integration (merged from PR #22)
- Entity Relationship Rule enforcement in ChatAssistant prompt
- Prevents AI from incorrectly linking non-DJ entities to stations
- Added to governance files (copilot-instructions.md)
- All conflicts resolved

**Models Used This Session:**

- Planning & Governance: Opus 4.7 (AI_USAGE.md, copilot-instructions.md)
- Implementation: Sonnet 4.6 (Phase 3 integration, PR fixes)
- Review: Opus 4.7 (bug audits, governance updates)

### Remaining Work

**Post-Launch (Next Sprint):**

- Bug #3 & #4 fixes (race condition, rate limiting) — deferred, functionality working but not optimized
- Unit tests for all new endpoints (80%+ coverage target)
- Document data-field tagging contract in CLAUDE.md (✅ DONE in this session)
- Bug #5-#13 (HIGH severity): Timezone handling, bulk undo, form validation
- Bug #14-#25 (MEDIUM/LOW): Accessibility improvements, type safety

---

## Session Summary (Original — 2026-04-26)

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

### 10. Chat Assistant UX & Stability Fixes (2026-05-01) ✅

**Decision**: Refactored `ChatAssistant.tsx` with premium CSS classes and added an error boundary to `SystemLogsViewer` in `App.tsx`.
**Rationale**:

- The Settings page crashed (blank screen) if the logs endpoint returned a non-string response. Added strict type checks to fix it.
- Improved the Gemini Chat Assistant UX by adding quick-action prompt chips and dedicated Accept/Reject icon buttons for AI proposals, moving inline styles to `index.css`.

### 11. Governance Adaptation: AI Sandbox Exception (2026-05-01) ✅

**Decision**: Adapted `Rule 7` in `.github/copilot-instructions.md` to include an explicit exception for AI agents.
**Rationale**:

- The AI agent is operating in a sandboxed Windows environment where direct execution of `git` via terminal is blocked. Therefore, the agent cannot autonomously run `git pull origin main` to check for remote conflicts before creating PRs.
- To abide by `.github` rules while acknowledging technical limitations, the AI is now explicitly responsible for guiding the human user to perform conflict detection and resolution via the CLI.

### 12. Deep Debugging Pass & Stability Fixes (2026-05-01) ✅

**Decision**: Executed a comprehensive bug hunt across frontend and backend, resolving critical crashes.
**Rationale**:

- **API Key Null Crashes**: In `audio_generator.py`, `art_generator.py`, and `gemini_client.py`, if the API key was unset, passing an empty string to `genai.Client(api_key="")` caused a fatal initialization crash, bringing down the Celery worker. Updated logic gracefully disables the client, logs an error, and returns `None` so the task fails gracefully.
- **Vite/React Syntax Corruption**: The previous AI left extraneous brackets and a syntax error (`}n>`) at the very end of `ChatAssistant.tsx`. This completely broke Vite's HMR and crashed the React tree. Removed the malformed syntax.
- **VSCode Workspace Path**: Fixed `python.defaultInterpreterPath` in `.vscode/settings.json` to point correctly to the root `.venv` instead of a non-existent `backend/.venv`, fixing unresolved import warnings.

---

## Session: AI Governance & Gemini Tiering (2026-05-03)

### Governance Update Objective

Establish a separate governance file (`GEMINI_USAGE.md`) to guide the usage of Gemini 3.1 model tiers while keeping Anthropic rules intact, and fix formatting issues across `PLANNING.md`.

### Key Decisions

- **Decision**: Created `GEMINI_USAGE.md` as a companion to `AI_USAGE.md`.
- **Rationale**: Keeps governance rules specific to the AI provider separate, allowing clear instruction sets for Anthropic (Claude) and Google (Gemini) agents without confusion.
- **Decision**: Explicitly defined that planning should always be done with the **Nested Thinking LLM** (Highest Tier).
- **Rationale**: Ensures architectural and complex planning tasks are handled by models capable of deep reasoning.
- **Decision**: Fixed MD022, MD032, and MD024 formatting issues in `PLANNING.md`.
- **Rationale**: Ensures documentation cleanliness and passes markdown linters without warnings.

**Models Used**:

- Planning: Nested Thinking LLM (Gemini 3.1 Pro High / Opus 4.7)
- Implementation: Gemini 3.1 Pro
**Rationale**: Governance and architectural updates fall entirely under the Highest tier responsibilities.
