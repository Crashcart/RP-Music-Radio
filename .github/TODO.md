# AetherWave / RP-Music-Radio — Active Task List

**Last Updated**: 2026-05-03  
**Project**: Headless Media Factory for procedural lore-heavy radio content  
**Status**: Foundation & UI Architecture phase + Governance Refinement

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

### Governance Refinement (✅ SR-Level Cleanup Completed)

**Session 2026-05-03: Consolidated PR Rules & Entity Constraints**
- [x] Identified and fixed rule numbering chaos ("10 rules" → "12 core rules")
- [x] Consolidated overlapping Rules 12-P1 and Rule 12 into single cohesive rule
- [x] Added explicit escalation procedures with GitHub workflow steps
- [x] Enhanced escalation triggers: merge conflicts, unclear tests, blocked deps, Cr-level blockers
- [x] Fixed entity constraint violation: Artist.station_id now NOT NULL (per governance)
- [x] Updated versions: copilot-instructions.md v2.1 → v3.0
- [x] Updated timestamps: 2026-04-26 → 2026-05-03 across governance files
- [x] Verified all CI/CD workflows exist and are correctly referenced
- [x] Added migration notes for database upgrades (nullable → NOT NULL)

### 🚨 Active Blockers (User-Reported)

**API Failure on boris.local (Cr-Level — Reported 2026-05-03)**
- [ ] **BLOCKER**: API is failing on boris.local deployment
- [ ] Gather logs to diagnose root cause (Claude Code sandbox cannot reach boris.local)
- [ ] User action required: Run log gathering commands locally:
  ```bash
  # On boris.local, run any of these to capture logs:
  docker-compose logs --tail=200 api          # FastAPI service logs
  docker-compose logs --tail=200 worker       # Celery worker logs
  docker-compose ps                           # Service status
  curl -v http://localhost:8000/health        # Health endpoint check
  curl -v http://localhost:8000/api/v1/stations  # Sample API call
  ```
- [ ] Common failure modes to check:
  - Database connection (SQLite file permissions, Redis reachable?)
  - Port conflicts (8000 already in use?)
  - Missing env vars (GOOGLE_API_KEY, REDIS_URL, DATABASE_URL)
  - Recent deploy broke schema (Artist.station_id NOT NULL migration needed?)
  - Celery worker can't reach Redis
- [ ] Once logs available: paste in chat or commit to `.github/PLANNING.md` for analysis

**Google Cloud API Offline (Cr-Level — Reported 2026-05-04)**
- [ ] **BLOCKER**: Google Cloud API status shows ❌ Offline in Settings UI
- [ ] Frontend shows: "API Status: ❌ Offline" on Settings page
- [ ] Issue: ChatAssistant cannot reach Gemini, Lyria, or Nano Banana APIs
- [ ] Root cause to investigate:
  - GOOGLE_API_KEY missing or invalid in environment
  - Google Cloud project not configured
  - API services (Gemini, Lyria, Nano Banana) disabled in console
  - Network connectivity issue (backend cannot reach googleapis.com)
  - API quota exceeded or billing suspended
- [ ] User action required:
  - [ ] Verify GOOGLE_API_KEY is set in `.env` (not shown in Settings)
  - [ ] Verify API key has permissions for: Gemini, Lyria, Nano Banana 2
  - [ ] Test: `curl -H "Authorization: Bearer <KEY>" https://generativelanguage.googleapis.com/v1/models:list`
  - [ ] Check Google Cloud Console: Billing enabled, APIs activated, quotas available
- [ ] Once verified: Backend should return status 200 on `/api/v1/settings/api-key` validation
- [ ] Impact: All AI features blocked (chat, DJ generation, art generation, announcements)

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
- [x] Add Premium **System Logs Viewer** to Settings Page for debugging
- [x] Build **AI Chat Assistant** (`ChatAssistant.tsx`) floating widget
- [x] Build real-time task queue monitor (`GenerationQueue.tsx`)
- [x] Refactor `api/client.ts` to support all 28 API methods
- [ ] Write component tests (Jest + React Testing Library)
- [x] Clean up legacy `DraftingTable.tsx` so it only handles raw CSV ingestion.

---

## Phase 3: AI Integration (MVP)

### AI Integration Tasks

- [x] Implement Gemini Chat Assistant (Google Search grounding removed due to 500 errors)
- [x] Wire up Nano Banana 2 integration for Artist Portraits and Station Logos
- [x] Implement AI Entity Proposal (One-click UI creation for Stations/Brands/Artists from chat)
- [ ] Implement Gemini "Flesh-Out" protocol (expand brand/station seeds into full scripts)
- [ ] Write AI integration tests

**Note**: Lyria 3 Pro audio synthesis and Celery pipeline integration tasks have moved to Phase 4 (Audio & Visual Synthesis Pipeline) to show they're part of the unified content generation workflow.

### AI Blockers

- [ ] API rate limits (may need to implement queue management and exponential backoff)
- [ ] Cost tracking strategies for heavy Lyria/Gemini API usage

---

## Phase 4: Audio & Visual Synthesis Pipeline

### Audio & Album Art Generation (Unified)

**Audio Synthesis (Lyria 3 Pro):**
- [ ] Implement Lyria 3 Pro integration for Voice DNA and procedural audio generation
- [ ] Ensure voice consistency across multiple tracks for the same Artist
- [ ] Create Celery async tasks to link generation steps together seamlessly

**Visual Synthesis (Album Art, Station Art, DJ Portraits, Brand Logos):**
- [x] Implement album cover generation (via Nano Banana 2 / Google Imagen)
- [x] Implement DJ portrait generation 
- [x] Implement station logo generation
- [x] Implement brand logo generation
- [ ] **Integrate album art into synthesis pipeline**: Generate album cover as part of `POST /api/v1/drafts/{id}/commit`
- [ ] Display album art thumbnails in GenerationQueue alongside audio preview
- [ ] Implement per-track art regeneration (allow users to re-generate if unsatisfied)

**Synthesis Pipeline Integration:**
- [ ] Wire Lyria audio output → Album art generation (both triggered by single `/commit` call)
- [ ] Celery task: Generate audio first, then use audio metadata (mood, genre, BPM) to seed album art prompt
- [ ] Track both audio and visual outputs in GenerationHistory
- [ ] Write integration tests for complete audio + visual synthesis workflow

---

### Persistence & Output

- [x] Implement enhanced Mutagen ID3v2.4 tagging (18+ tags: genre, BPM, copyright, TXXX seeds)
- [ ] Update Lore_Ledger JSON schema to pull directly from the relational database (Artist/Brand DB)
- [ ] Implement host volume mapping for persistent output (`./radio_vault/`)
- [ ] Establish new hierarchical file naming convention (e.g., `{STATION}/{ARTIST}/{TRACK}.mp3` or `{STATION}/jingles/{JINGLE_TYPE}.mp3`, with parallel art paths like `{STATION}/{ARTIST}/{TRACK}.jpg`)
- [ ] Write tests for MP3 generation, album art output, and metadata tagging

---

## Phase 5: Docker & Deployment

### Deployment Tasks

- [x] Finalize `docker-compose.yml` (api, worker, redis, frontend)
- [x] Create `.env.example` with all required variables
- [x] Create installation guide in README.md
- [ ] Test full Docker stack locally and resolve any `NODE_ENV` conflicts
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

---

## Session: Bug Fixes, UX & Logging Uplift (2026-05-01)

### Critical Bug Fixes (✅ Completed — PR #15)
- [x] Brand `updated_at` not set on PATCH
- [x] `docker-compose` vs `docker compose` plugin detection in scripts
- [x] `collect-logs.sh` subshell variable loss in pipe-to-while loop
- [x] `uninstall-full.sh` repo deletion skippable in non-interactive mode
- [x] All form fields missing `id`/`name`/`aria-label` for AI automation
- [x] Silent `.catch(() => {})` on API failures replaced with `console.error`
- [x] Art/portrait generation showed generic error instead of actual message

### UX & Feature Additions (✅ Completed — PR #17)
- [x] Chat error messages — human-readable (quota, auth, network, timeouts)
- [x] Draft lifecycle — `DELETE /drafts/{id}` and `POST /drafts/{id}/retry`
- [x] AetherWave favicon (radio wave SVG) in browser tab
- [x] Form autofill enabled site-wide (`autoComplete="on"`)
- [x] Import/Export UI in Settings (export works; import staged)
- [x] Structured logging with Google Cloud Logging support
- [x] `LOG_LEVEL` env var now actually used by uvicorn and Celery
- [x] Request correlation IDs via `RequestLoggingMiddleware`
- [x] All `logger.error()` calls include `exc_info=True`

### HIGH Priority UX Fixes (🔄 In Progress — fix/clean-pr-branch)
- [x] Station delete button added to StationDetail
- [x] Jingle creation replaced with proper inline form (no more `prompt()`)
- [x] Jingle delete action added per row
- [x] Artist station picker added to ArtistForm
- [x] Silent catches replaced with `console.error` in App.tsx, Artists, Brands
- [x] `api.deleteArtist`/`api.deleteBrand` wrapped in try/catch
- [x] `window.location.reload()` replaced with `onEntityCreated` callback
- [x] Mobile nav updated to show all 6 items (Settings no longer hidden)
- [x] Settings import button disabled with "Coming soon" tooltip
- [ ] Sonnet 4.6 code review of HIGH UX fixes
- [ ] Commit and push HIGH UX fixes

### Pending (Next Sprint)
- [ ] Styled confirmation modal (replace all `confirm()`/`alert()` with component)
- [ ] Client-side form validation with field-level error messages
- [ ] Keyboard accessibility for entity cards and nav items (`role="button"`)
- [ ] Station draft/content history in detail view
- [ ] Artist station relationship shown in detail view
- [ ] GenerationQueue cancel/retry/download controls
- [ ] DraftingTable search and filter bar
- [ ] Chat auto-scroll only when user is near bottom
- [ ] Unit tests for all new endpoints

---

---

## Session: AI DJ Staging + Critical Bug Audit (2026-05-02)

### AI DJ Generation Workflow (✅ Phase 1 & 2 Complete)

**Phase 1: Frontend Enhancements** ✅
- [x] Form fields tagged with `data-field`, `data-section`, `data-type`, `aria-label`
- [x] AI-generated field styling (`.form-ai-filled` with amber warning banner)
- [x] "Pending AI DJs" section (desktop grid + mobile accordion layout)
- [x] Undo toast notification with 30-second countdown timer
- [x] Edit/Approve/Reject buttons with loading states (race condition prevention)

**Phase 2: Backend API** ✅
- [x] `POST /api/v1/artists/staged` — Create staged DJ with Pydantic validation
- [x] `GET /api/v1/artists?status=draft` — List pending DJs with filtering
- [x] `POST /api/v1/artists/{id}/publish` — Approve (draft → pending_publish, 30s undo window)
- [x] `POST /api/v1/artists/{id}/undo` — Revert within 30-second window
- [x] `POST /api/v1/artists/bulk-publish` — Batch approve multiple DJs
- [x] `POST /api/v1/artists/bulk-reject` — Batch delete multiple DJs
- [x] Rate limiting: 5 concurrent/station, 20/hour per user, cost ceiling
- [x] Celery beat jobs: auto-publish after 30s, cleanup expired drafts

**Critical Bug Fixes (Opus 4.7 Audit)** 🔧

| Bug | Severity | Status | Commit |
|-----|----------|--------|--------|
| #1: Missing Alembic migration | CRITICAL | ✅ FIXED | d1a1754 |
| #2: No CSRF protection | CRITICAL | ✅ FIXED | d1a1754 |
| #3: Race condition (undo vs autopublish) | CRITICAL | 🔄 IN PROGRESS | pending |
| #4: Rate-limit dict bypass | CRITICAL | 🔄 IN PROGRESS | pending |
| #5-#13: HIGH priority issues | HIGH | ⏳ DEFERRED | next sprint |

**Completed Critical Fixes:**
- [x] Create Alembic migration: `7b9629222ee_add_artist_staging_columns.py`
  - Adds: status, created_by, expires_at, undo_expires_at columns
  - Enables: draft/pending_publish/published workflow
- [x] Implement CSRF protection (stateless double-submit cookie)
  - Server: Sets `csrf_token` cookie on GET (HttpOnly=false, 8h TTL)
  - Client: Reads cookie, includes as `X-CSRF-Token` header on mutations
  - Middleware: Validates header matches cookie on POST/PATCH/PUT/DELETE
  - Exempt paths: /health, /docs, /openapi.json, /redoc

**In Progress (Sonnet 4.6):**
- [ ] Fix race condition with `with_for_update()` row-level locking
- [ ] Move rate limiting from in-memory dict to Redis
- [ ] Implement bulk undo endpoint

### Phase 3 (✅ Complete) — ChatAssistant Integration

**Completed (PR #20):**
- [x] Update ChatAssistant to inject station context into AI prompt
- [x] Update ChatAssistant to handle staged DJ proposals
- [x] Parse DJ suggestions from Gemini DJ_SUGGESTION blocks
- [x] Add "Stage DJ" buttons for granular control
- [x] Integrate with Stations detail "Pending AI DJs" section
- [x] Wire up onEntityCreated callback for auto-refresh
- [x] Automatic X-CSRF-Token header injection

**Tested:**
- [x] AI DJ generation end-to-end (Gemini → parse → stage → approve → publish)

### Phase 4 (Final) — Governance & Documentation Update

**Completed:**
- [x] Update PLANNING.md with Phase 3 completion notes
- [x] Update AI_USAGE.md with PR Completion Rule
- [x] Mark Phase 3 complete in TODO.md

**Remaining (Post-Launch):**
- [ ] Document data-field tagging contract in CLAUDE.md
- [ ] Create comprehensive integration test suite
- [ ] Performance benchmarking before production

---

## AI-Friendly Design Checklist

**Goal**: Make the website easy for AI agents (ChatAssistant, automation tools, screen readers) to understand and navigate.

**Principle**: "Design as if a blind person were using a screen reader." If it passes accessibility, AI will understand it perfectly.

### Semantic HTML & Accessibility

- [x] Use semantic HTML tags instead of generic `<div>` / `<span>`
  - [x] Use `<button>` or `<input type="submit">` for clickable elements (not `<div onclick>`)
  - [x] Use `<label>` tags for all input fields
  - [x] Use `<section>` or `<article>` for content regions (e.g., `<section aria-label="Pending AI DJs">`)

- [x] Explicitly link labels to inputs using `for` and `id` attributes
  ```html
  <label for="brand-name">Brand Name</label>
  <input id="brand-name" type="text">
  ```

- [x] Use descriptive, human-readable ID and name attributes
  - [x] Not: `id="fld_123"` or `id="input-af82"`
  - [x] Yes: `id="brand-name"`, `id="company-description"`, `name="email_address"`

- [x] Use standard input types for correct format hints
  - [x] `type="email"` for email addresses
  - [x] `type="date"` for dates
  - [x] `type="tel"` for phone numbers
  - [x] `type="number"` for numeric values

- [x] Add ARIA labels and attributes for custom components
  ```html
  <div role="button" aria-label="Approve DJ" aria-pressed="false">...</div>
  <section aria-live="polite" aria-label="Pending AI DJs">...</section>
  ```

### Form Field Contract (AI-Targeting)

- [x] All form fields tagged with data attributes:
  - [x] `data-field="field-name"` — Maps to database column/API field
  - [x] `data-section="section-name"` — Groups related fields (identity, music, lore, etc.)
  - [x] `data-type="entity-type"` — Entity being edited (artist, brand, station)
  - [x] `aria-label="human-readable"` — What the field is (mirrored from label text)

- [x] Example field tagging:
  ```html
  <label for="personality">Personality</label>
  <textarea 
    id="personality" 
    name="personality"
    data-field="personality"
    data-section="personality"
    data-type="artist"
    aria-label="Personality traits and quirks of the artist"
    placeholder="3-4 sentences describing..."
  ></textarea>
  ```

### Anti-Patterns (Avoid These)

- [ ] Shadow DOM for critical form elements — keeps them hidden from some AI tools
- [ ] Dynamic ID generation that changes on refresh (e.g., `id="input-{random}"`)
- [ ] Cryptic form field names (e.g., `name="f1"`, `name="x"`)
- [ ] Missing `<label>` tags or disconnected labels
- [ ] Using `<div onclick>` instead of `<button>`
- [ ] Form elements not wrapped in semantic containers

### Testing

- [ ] Verify all form pages pass accessibility audit (Axe, WAVE, Lighthouse)
- [ ] Test with screen reader: VoiceOver (Mac), NVDA (Windows), JAWS (Enterprise)
- [ ] Verify ChatAssistant can fill all forms using data-field attributes
- [ ] Test that UI elements are reachable via keyboard only (Tab, Enter, Arrow keys)

---

## History

---

## Session: Art System Implementation (2026-05-02) ✅

### Phase 1: Station Art + DJ Portraits (✅ Complete)

**Backend**:
- [x] Verified Gemini working (fixed API key optional logging)
- [x] Station art: `POST /api/v1/stations/{id}/art` endpoint
- [x] DJ portrait: `POST /api/v1/artists/{id}/portrait` endpoint
- [x] Nano Banana 2 integration for image generation

**Frontend**:
- [x] Station Art card display (full-width, min-height 200px)
- [x] Station Art regenerate button (🔄 with ⏳ loading state)
- [x] DJ Portrait grid layout (2-4 columns responsive)
- [x] DJ Portrait regenerate button (hover-over 🔄, semi-transparent)
- [x] Per-item loading state tracking (doesn't block other items)

**UX & Accessibility**:
- [x] Responsive mobile layout (<768px, ≥768px)
- [x] 44px min tap targets (WCAG AA)
- [x] Keyboard navigation (Tab, Enter)
- [x] Screen reader support (aria-labels)
- [x] Color contrast validation
- [x] Placeholder messages when no art exists
- [x] Error handling with user-friendly messages

**Documentation**:
- [x] ART_SYSTEM.md — Complete art hierarchy + API status
- [x] UX_CHECKLIST.md — 60+ point accessibility/UX audit
- [x] PLANNING.md — Session 4 completion log
- [x] CLAUDE.md — Form field tagging contract
- [x] GEMINI_SETUP.md — API key setup guide

**Status**: Ready for UAT (User Acceptance Testing)
- Blockers: None (API fallback to no-regenerate state)
- User Ready: Yes — Can create stations & DJs, regenerate art if key set

---

## Immediate Actions (Next Session)

### Settings Page Implementation (✅ Complete — cac63a9)

**Completed**:
- [x] Create Settings.tsx component with API key configuration UI
- [x] Add localStorage support for API key and project ID
- [x] Integrate with api.setApiKey() for backend validation
- [x] Add help section with setup guide and FAQ
- [x] System info display (API status, app version)
- [x] Responsive mobile layout (44px tap targets)
- [x] Import in App.tsx and wire to navigation
- [x] Settings accessible via ⚙️ icon in main nav

**Status**: Ready
- Users can configure API key via UI (no CLI needed)
- Keys stored locally in browser (not sent to servers)
- Backend validation with friendly error messages
- Help docs for first-time setup

---

### Phase 2: Brand Logos & Album Art (🔄 In Progress — PR #27)

**Backend Tasks**:
- [ ] Add `POST /api/v1/brands/{brand_id}/logo` endpoint
- [ ] Extend Brand model with `logo_path` field
- [ ] Integrate album art into synthesis pipeline (POST /api/v1/drafts/{id}/commit)
- [ ] Add `GenerationHistory.art_path` field
- [ ] Implement rate limiting (5 brand/day, 10 album art/day)

**Frontend Tasks**:
- [ ] Update Artists.tsx with brand logo display + regenerate
- [ ] Update GenerationQueue.tsx with album art thumbnails (80x80px)
- [ ] Per-track art regeneration workflow
- [ ] Fallback emoji (💿) for missing/generating art

**Testing**:
- [ ] End-to-end brand logo generation
- [ ] Album art generation during synthesis
- [ ] Per-track art regeneration
- [ ] Mobile responsive layout
- [ ] Keyboard navigation + screen reader support

**Documentation**:
- [ ] Update ART_SYSTEM.md (brand logo + album art endpoints)
- [ ] Update UX_CHECKLIST.md (gallery/completed tracks)
- [ ] Update PLANNING.md (Phase 2 decisions)

**Timeline**: 2-3 days  
**Branch**: `claude/brand-logos-album-art-w1KTY` (PR #27)

---

### Entity Deletion & Data Cleanup (✅ Complete — e4e9d37)

**Completed**:
- [x] Add delete button for published DJs in station detail (red ✕ overlay)
- [x] Add delete handler with confirmation dialog
- [x] Verify all other entities have delete buttons:
  - [x] Stations: Delete button in detail header
  - [x] Independent Artists: Delete button in Artists page table
  - [x] Brands: Delete button in Brands detail
  - [x] Jingles: Delete button in jingles table
  - [x] Drafts: Delete button in DraftingTable
  - [x] Pending DJs: Reject button in pending section (draft deletion)
- [x] Document deletion UX pattern in PLANNING.md (Session 6)
- [x] All deletions require confirmation: `confirm("Delete [entity]? This cannot be undone.")`

**Implementation**:
- Added `deletingDJId` state tracking for in-flight delete requests
- Added `handleDeleteDJ` async handler with API call and refresh
- Button shows "…" while deleting, disabled to prevent double-click
- Published DJ deletion: red background, `color: var(--status-failed)`
- All deletions permanent (no soft-delete, no undo window)
- Cascading protection: deleting station doesn't auto-delete DJs

**Status**: Ready for production
- All entity types support deletion
- Consistent UX across all pages
- No data loss risks (confirmation required)

---

### Environment & Configuration  
- [x] Make `GOOGLE_API_KEY` optional at startup (no more warnings during boot)
  - Changed logger.warning → logger.debug in all generators
  - API key now only checked when features actually launched
  - Users can start app and configure key via Settings page
  - Created GEMINI_SETUP.md with setup instructions
- [ ] First-time user onboarding flow (Settings → "Please add API key to continue")
- [ ] **Universe selection gate (NOT the main/stations page)**: The universe context is a separate layer — the main page (Stations) is not where universes are set. On first load with no universes configured, the app should route to the Universes page or show a dedicated prompt/wizard before the user reaches Stations. The main nav page remains Stations; universe setup is a prerequisite layer that sits above it.

---

## Logging & Diagnostics (Phase 1-3)

### Phase 1: Core Infrastructure ✅

- [x] SQLite logging handler + app_logs table schema
- [x] JSON formatter for structured logging
- [x] Log analyzer with query methods (errors, patterns, summaries)
- [x] API endpoints: /api/v1/logs/errors, /api/v1/logs/summary, /api/v1/logs/search
- [x] CLI tool for local debugging (python -m app.log_analyzer)
- [x] Documentation in .github/LOGGING.md

**Status**: Ready. Claude Code can now query logs via HTTP to analyze issues.

### Phase 2: Pattern Detection & Analysis 🚧 (Next)

- [ ] Error grouping by message + frequency tracking
- [ ] Auto-detect recurring errors (>3x in 24h)
- [ ] Build fix suggestion catalog (error → common causes → fixes)
- [ ] Implement `/api/v1/logs/patterns` endpoint
- [ ] Claude Code integration: analyze logs → suggest fixes
- [ ] Track error trends (are we improving?)
- [ ] Add cost tracking for AI calls (tokens, USD spent)

**When to start**: After Phase 1 tested on alpha branch

### Phase 3: Automation ⏳ (Future)

- [ ] Auto-create GitHub issues for recurring errors (>5 in 24h)
- [ ] Auto-fix simple issues (env var updates, log level adjustments)
- [ ] Daily/weekly error summaries (email/Slack)
- [ ] Performance regression alerts (P95 latency spike >20%)
- [ ] Cost budget alerts (exceed $X/day → warn)
- [ ] Log cleanup automation (delete >30 days, compress archives)

**When to start**: After Phase 2 validated on production

---

## Security Audit Issue (Jr-2) — npm Vulnerabilities in Vite ✅ FIXED

**Identified in PR #36**: npm audit failed with 2 moderate vulnerabilities
- **Package**: esbuild <=0.24.2, vite <=6.4.1
- **Severity**: Moderate (GHSA-67mh-4wv8-2f99)
- **Issue**: esbuild allows sending requests to dev server and reading responses
- **Status**: ✅ FIXED (Vite upgraded to 6.4.2)

**Fix Applied** (Commit 858c604):
- Upgraded vite from ^5.0.8 → ^6.4.2
- npm audit: ✅ 0 vulnerabilities (was 2)
- Build: ✅ Successful (no breaking changes)
- Verified: Build works, TypeScript compiles, assets generated

**Testing Results**:
- [x] npm install with Vite 6.4.2 → success
- [x] npm run build → success (1.05s, no errors)
- [x] npm audit → 0 vulnerabilities found
- [x] Build output: identical size/structure to v5

**Resolution**:
Option 2 implemented: Found Vite 6.4.2 as intermediate version that patches vulnerabilities without breaking changes. Vite 6 is stable and maintained, provides better compatibility than Vite 8.

---

## PR #38 Check-In (Rule 12 — Governance Process) 🔄

**Created**: 2026-05-03 22:22:12Z  
**Merged Conflicts**: ✅ Resolved (merge commit a3e7b58)  
**Current Status**: 4/5 CI checks passing, backend test in progress, Sr-1 escalated

### Issues Identified

| Issue ID | Severity | Type | Status | Notes |
|----------|----------|------|--------|-------|
| Jr-1 | Minor | CI | ❌ ESCALATED | Backend test still running (`test-backend`) |
| Sr-1 | Major | CI Infrastructure | 🚨 ESCALATED | Backend test hung (15+ min, no completion, started 22:34:21) |

### CI Check Status

- [x] verify — ✅ SUCCESS
- [x] build — ✅ SUCCESS  
- [x] test-frontend — ✅ SUCCESS
- [x] lint — ✅ SUCCESS
- 🔄 test-backend — IN PROGRESS (awaiting completion)

### Comments & Reviews

- No comments yet
- No review requests
- mergeable_state: "unstable" (waiting for backend test)

### Next Steps

1. [ ] Monitor backend test completion (3 min timeline per Rule 12)
2. [ ] Review backend test results when available
3. [ ] Categorize any failures as Jr/Sr issues
4. [ ] Fix issues per governance process (create subtask → document → implement → verify → commit → push)
5. [ ] Update PR with completion comment
6. [ ] Verify PR becomes mergeable
