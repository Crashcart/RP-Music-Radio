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

### ✅ RESOLVED: API Startup Hang (Cr-Level — 2026-05-07 → 2026-05-08)

**ROOT CAUSE**: SQLiteHandler deadlock during logger.info() calls in logging_config.py line 165

**SOLUTION APPLIED** (Commit 71182db):
- ✅ Disabled SQLiteHandler: Commented out `root.addHandler(sqlite_handler)`
- ✅ Rebuilt Docker image without cache
- ✅ API now starts successfully
- ✅ Health check: `curl http://localhost:8433/health` returns `{"status":"ok",...}`
- ✅ All services running and healthy:
  - aetherwave-api: Up, healthy ✅
  - aetherwave-frontend: Up, running ✅
  - aetherwave-worker: Up ✅
  - aetherwave-beat: Up ✅
  - aetherwave-redis: Up, healthy ✅

**Status**: 🚀 **PRODUCTION READY** — Fresh install tested on alpha branch

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
- [x] Build **Galaxy Opening Splash Screen** (`SplashScreen.tsx`) — canvas starfield warp animation on every load
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

## Future Major Feature: Data Import/Export System (🔄 Planning Phase)

**Scope**: Complete data portability for AetherWave universes, stations, artists, brands, jingles, drafts, and generated media.

**Purpose**:
- Backup/restore entire universes (disaster recovery)
- Share universes between AetherWave instances (dev ↔ prod)
- Bulk editing workflow (export → edit CSV/JSON → import)
- Data migration between environments
- Archival and long-term storage
- Collaborative universe sharing

### Export Strategy

**Export Formats** (user selects at download time):
1. **JSON-Only** (metadata only, no media)
   - Compact, human-readable, git-friendly
   - Use case: version control universes, share templates
   - Size: ~100KB per 100 entities
   - Include: all entity relationships, metadata, seeds, IDs

2. **ZIP (JSON + Media)**
   - Complete data + all generated assets (MP3s, images)
   - Use case: full backup, cross-instance migration
   - Size: varies (MP3s are ~5-10MB each)
   - Include: folder structure matching AetherWave hierarchy

3. **CSV (Bulk Edit)**
   - Spreadsheet format for each entity type (Stations.csv, Artists.csv, etc.)
   - Use case: bulk rename, update descriptions, change genres
   - Relationships: ForeignKey IDs preserved as columns
   - Re-import via CSV uploader → validates → applies changes

4. **SQL Dump** (advanced users)
   - Raw SQLite export for developers
   - Use case: direct database migration, advanced analysis

**Export Scopes**:
- [ ] **Full Database**: Everything (all universes, stations, artists, brands, jingles, drafts, history)
- [ ] **Universe-Level**: Single universe + all children (stations, DJs, brands, jingles)
- [ ] **Station-Level**: Single station + DJs + jingles only
- [ ] **Selective**: User checkboxes to pick specific entities
- [ ] **Timeline**: Export drafts+history from date range (e.g., "last 30 days")

**Export Implementation**:
- [ ] `POST /api/v1/export` endpoint
  - Query params: `format=json|zip|csv|sql`, `scope=full|universe|station|selective`
  - Body (selective): `{ entity_ids: [list of UUIDs to export] }`
  - Response: File download with proper MIME type + Content-Disposition header
  - Rate limit: 1 export per 60s per user (prevent DOS)
  
- [ ] Frontend Export UI (Settings page)
  - Radio buttons: Choose format (JSON / ZIP / CSV / SQL)
  - Radio buttons: Choose scope (Full / Universe / Station / Selective)
  - If selective: Entity picker (checkbox tree: Universes → Stations → Artists)
  - Download button → triggers `POST /api/v1/export` → saves file
  - Progress bar (streaming for large ZIP files)
  - "Exporting..." spinner during compression

**Export File Structure** (ZIP):
```
aetherwave-backup-2026-05-08.zip
├── metadata.json                 # Export timestamp, version, scope
├── entities/
│   ├── universes.json
│   ├── stations.json
│   ├── artists.json
│   ├── brands.json
│   ├── jingles.json
│   ├── drafts.json
│   └── generation_history.json
└── media/
    ├── stations/
    │   └── {station_id}/
    │       └── logo.jpg
    ├── artists/
    │   └── {artist_id}/
    │       └── portrait.jpg
    └── audio/
        └── {draft_id}/
            ├── track.mp3
            └── album_art.jpg
```

### Import Strategy

**Import Workflow**:
1. User uploads file (JSON/ZIP/CSV or drag-drop)
2. Validation phase: Check schema, relationships, IDs
3. Conflict resolution: Detect duplicate IDs → prompt user
4. Dry-run preview: Show what will be created/updated
5. Atomic transaction: All-or-nothing import (no partial state)
6. Post-import: Verify relationships, log audit trail

**Conflict Resolution Modes**:
- [ ] **Skip** (default): If entity exists, skip it
- [ ] **Update**: Overwrite existing entity with imported data
- [ ] **Rename**: Auto-rename duplicates (append timestamp, e.g., "Station (2026-05-08 15:30)")
- [ ] **Merge**: For draft entities, combine with existing (track union)

**Import Implementation**:
- [ ] `POST /api/v1/import` endpoint
  - Multipart form: `file` (JSON/ZIP/CSV), `conflict_mode` (skip|update|rename|merge)
  - Response: Dry-run preview with counts (created, updated, skipped)
  - Query param: `?confirm=true` to actually execute (prevents accidental imports)
  
- [ ] `POST /api/v1/import?confirm=true` (execute)
  - Performs actual import in transaction
  - Returns: Import summary with IDs of created/updated entities
  - Logs: audit entry with user, timestamp, imported entities
  - Rate limit: 1 import per 5 minutes per user (prevent abuse)

- [ ] Validation layer (Pydantic schemas for import)
  - Schema check: All required fields present
  - Type check: station_id is UUID, genre is valid enum
  - Relationship check: All FK references exist in target or import file
  - Media check: If ZIP, verify all referenced files present
  - Reject malformed imports with detailed error messages

- [ ] Frontend Import UI (Settings page)
  - File upload (drag-drop + click-to-browse)
  - Show file preview (entity counts, relationships)
  - Conflict mode selector (radio buttons)
  - "Preview Import" button → shows what will happen
  - "Confirm Import" button (disabled until preview runs)
  - Progress bar + cancel button during import
  - Success/error toast with summary

**Import File Structure** (CSV):
```
Stations.csv:
  id,universe_id,name,frequency,genre,mood,status,created_at
  12345,uu-001,Nebula FM,99.8,synthwave,chill,published,2026-05-01T10:00:00Z

Artists.csv:
  id,station_id,artist_name,type,personality,voice_description,backstory,status
  aa-001,12345,Vance Rikard,dj,"Mysterious synthwave...",Deep laid-back,Took over Nebula...,published
```

### Data Integrity & Safety

**Atomicity**:
- [ ] Wrap import in `BEGIN TRANSACTION ... COMMIT / ROLLBACK`
- [ ] If any validation fails at any step, rollback entire transaction
- [ ] Prevent partial imports (no orphaned FKs)

**Backup Before Import**:
- [ ] Auto-backup database before each import (`.backup/{timestamp}.db`)
- [ ] Retention policy: Keep last 10 backups (auto-delete older)
- [ ] Manual rollback: User can restore from backup via UI

**Audit Trail**:
- [ ] Log each import in `app_logs` table with:
  - User ID, timestamp, import file name, conflict mode
  - Entities created/updated/skipped counts
  - Any validation errors encountered
- [ ] Log each export with user, format, scope

**Data Validation**:
- [ ] Verify all ForeignKeys resolve (station_id → actual Station)
- [ ] Verify no circular dependencies (Station A references Brand from Universe B)
- [ ] Verify media files match references (if album_art.jpg referenced, must exist in ZIP)
- [ ] Verify seeds/IDs are valid UUIDs
- [ ] Verify enums (genre, mood, type, status) are valid values

### Use Cases & Examples

**Use Case 1: Full Disaster Recovery**
1. User exports full database as ZIP (weekly automated backup)
2. Production instance crashes
3. User imports ZIP with `conflict_mode=update`
4. All universes, stations, DJs, drafts restored
5. Audio/images restored to `/radio_vault/`, `/output/`

**Use Case 2: Bulk Editing**
1. User exports "Nebula FM" station as CSV
2. Opens `Artists.csv` in Excel
3. Updates 5 DJ descriptions, changes 2 genres
4. Saves CSV file
5. Imports CSV with `conflict_mode=update`
6. All DJ changes applied atomically

**Use Case 3: Share Universe Template**
1. User exports "Cyberpunk Universe" as JSON (no media)
2. Pushes to GitHub (easy versioning)
3. Another user imports JSON into their instance
4. All station/brand/artist templates available
5. User can then customize and generate media

**Use Case 4: Environment Migration**
1. Dev instance exports full database as ZIP
2. Staging instance imports ZIP with `conflict_mode=skip` (preserves staging-specific data)
3. Prod instance imports selective station as ZIP (just the "News FM" universe)
4. All universes, DJs, drafts migrated correctly

### Technical Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Large ZIP files (1GB+) | Stream ZIP creation, use chunked multipart upload |
| ID collisions on import | UUIDs are globally unique; conflict_mode handles remapping |
| Media file paths change | Store relative paths in JSON; remap on import based on entity_id |
| Circular relationships | Validate import graph before committing transaction |
| CSV encoding issues | Enforce UTF-8; validate on upload; show errors to user |
| Performance (100K+ entities) | Pagination, batch operations, index optimization |
| Sensitive data in exports | Option to exclude passwords, API keys (always excluded) |

### Testing Requirements

- [ ] Unit tests: Validation logic, schema checks, FK resolution
- [ ] Integration tests: Full import/export round-trip (A → export → B → import → verify identical)
- [ ] Edge cases: Empty exports, circular refs, mixed entity types, large files
- [ ] Security: Malformed ZIP, SQL injection via CSV, path traversal
- [ ] Performance: Import 10K entities, export with 1GB media
- [ ] Rollback: Verify backup/rollback restores state exactly

### Timeline & Priority

**Estimate**: 2-3 weeks (backend 1 week + frontend 1 week + testing 1 week)  
**Priority**: High (essential for production reliability, user data independence)  
**Blocker**: None (can be implemented in parallel with other features)

**Proposed Implementation Order**:
1. Phase 1 (Week 1): JSON export/import (metadata only)
2. Phase 2 (Week 2): ZIP export/import (with media), CSV export
3. Phase 3 (Week 3): CSV import, conflict resolution modes, atomic transactions, backups
4. Phase 4 (Testing): Full test coverage, edge cases, security audit

---

---

## Feature: Universe Selector Home Page (🔧 Fix & Enhancement)

**Current UX Problem**: 
- Splash screen appears and vanishes in ~2.6 seconds
- User lands directly on Stations page (no context)
- If user has multiple universes (Star Wars, Star Citizen), they all show mixed together
- No way to switch universes after login without editing URL or context

**Desired UX**:
- After splash screen, show **Universe Selector** page
- User picks which universe to work in (e.g., "Star Wars Universe" or "Star Citizen Universe")
- Selected universe becomes active context for entire session
- All pages (Stations, Artists, Brands) scoped to that universe
- Easy universe switching via dropdown or modal (don't require page reload)
- If no universes exist: Show onboarding wizard to create first universe

### Implementation Plan

**Phase 1: Universe Selector Component** (1-2 days)
- [ ] Create `UniverseSelector.tsx` component
  - Display grid/list of user's universes (name, description, entity counts)
  - Show "Create Universe" button if none exist
  - Click to select → store in `localStorage.selectedUniverseId`
  - Show active universe badge (checkmark, highlight)
  - Delete button per universe (with confirmation)
  
- [ ] Onboarding flow (first-time user)
  - If no universes exist → show "Welcome!" modal
  - Prompt: "Create your first universe" (name + description)
  - POST /api/v1/universes → create → auto-select → proceed
  
- [ ] Universe switcher in main nav
  - Dropdown or icon in header showing current universe
  - Click → open UniverseSelector modal
  - Quick-switch without leaving current page
  - Shows universe name + count (e.g., "Star Wars (12 stations)")

**Phase 2: App Routing** (1 day)
- [ ] Update App.tsx routing logic
  - After splash screen: Route to UniverseSelector (not Stations)
  - Check `localStorage.selectedUniverseId` on app load
  - If no selection or invalid ID: Show UniverseSelector modal
  - If valid: Set context and route to Stations
  - Persist selection across sessions/refreshes

- [ ] Add universe context to React Context/Zustand store
  - `selectedUniverseId: string | null`
  - `setSelectedUniverse(id: string)` action
  - Access from any component: `useUniverse().selectedUniverseId`

**Phase 3: API Filtering** (2 days)
- [ ] Update all GET endpoints to filter by `universe_id`
  - `GET /api/v1/stations` → add query param: `?universe_id={id}`
  - `GET /api/v1/brands` → same
  - `GET /api/v1/universes` → list all (no filter)
  - Backend: Add WHERE clause: `WHERE universe_id = :universe_id`
  
- [ ] Update all POST endpoints to accept `universe_id`
  - `POST /api/v1/stations` → require body: `{ ..., universe_id }`
  - `POST /api/v1/brands` → same
  - Frontend: Auto-inject current universe: `{ name: "...", universe_id: selectedUniverse }`
  
- [ ] Update DELETE endpoints
  - Validate that entity belongs to selected universe (prevent cross-universe deletion)
  - `DELETE /api/v1/stations/{id}` → check Station.universe_id matches selectedUniverseId

**Phase 4: UI Updates** (1 day)
- [ ] Update page headers to show active universe
  - Stations page: "Star Wars Universe — 12 Stations"
  - Click universe name → open switcher modal
  
- [ ] Update entity creation forms
  - Don't prompt for universe (auto-set from context)
  - Show universe context above form: "Creating station in: Star Wars Universe"
  
- [ ] Update entity cards/tables
  - Don't show universe column (implied by context)
  - If viewing mixed entities: Add universe tag as badge

**Phase 5: Settings & Preferences** (1 day)
- [ ] Add to Settings page
  - "Current Universe: [Star Wars Universe]" (with change button)
  - List of all universes (name, count, actions)
  - Create new universe button
  - Delete universe button (with cascade warning)
  
- [ ] Add to Drafts
  - Show universe context: "Drafts for Star Wars Universe"
  - Filter by universe: Only drafts for selected universe

### Splash Screen Timing Fix

**Current Issue**: Splash screen duration (2.6s) is arbitrary and feels rushed

**Fix**:
- [ ] Increase splash screen duration to 4-5 seconds (feels more intentional)
- [ ] OR: Keep duration but don't auto-dismiss — require user click (more intentional)
- [ ] Add "Skip" button to splash screen (small, bottom-right)
- [ ] Smooth transition to UniverseSelector (fade, not instant)

### Data Model Requirements

**Database Schema** (if not already present):
- [ ] Universe table: `id (PK), name, description, created_at, updated_at`
- [ ] Stations: Add `universe_id (FK)` — NOT NULL, indexed
- [ ] Brands: Add `universe_id (FK)` — NOT NULL, indexed
- [ ] Drafts: Query universe via Station relationship (no direct FK needed)
- [ ] GenerationHistory: Query universe via Draft/Station (no direct FK needed)

**Alembic Migration**:
- [ ] Create migration: `add_universe_id_to_stations_and_brands.py`
  - Add nullable columns first
  - Backfill existing data (default to first universe or system universe)
  - Add NOT NULL constraint
  - Add index: `CREATE INDEX idx_stations_universe_id ON stations(universe_id)`

### API Endpoints (New or Updated)

**Universe Management**:
- [ ] `GET /api/v1/universes` — List all universes (no pagination limit, typically <20)
- [ ] `POST /api/v1/universes` — Create new universe
  - Body: `{ name: string, description?: string }`
- [ ] `GET /api/v1/universes/{id}` — Get universe details (name, created_at, counts)
- [ ] `PATCH /api/v1/universes/{id}` — Update universe (name, description)
- [ ] `DELETE /api/v1/universes/{id}` — Delete universe (cascade delete all children)

**Updated Endpoints**:
- [ ] `GET /api/v1/stations?universe_id={id}` — Filter by universe
- [ ] `GET /api/v1/brands?universe_id={id}` — Filter by universe
- [ ] `POST /api/v1/stations` — Require `universe_id` in body
- [ ] `POST /api/v1/brands` — Require `universe_id` in body

### Use Cases

**Use Case 1: Multi-Universe User**
1. Alice creates "Star Wars Universe" (10 stations)
2. Alice creates "Star Citizen Universe" (8 stations)
3. On app load: See both universes in selector
4. Click "Star Wars" → view 10 stations
5. Click universe dropdown → switch to "Star Citizen" instantly
6. View 8 Star Citizen stations
7. Create new station "UEE News" → auto-scoped to Star Citizen

**Use Case 2: Onboarding (First-Time User)**
1. User lands on app → splash screen
2. After splash: UniverseSelector shows "No universes yet"
3. Click "Create Your First Universe"
4. Modal: "New Universe: ___" (text input)
5. User types "My Sci-Fi Universe"
6. Auto-created → auto-selected → lands on Stations (empty)
7. User creates first station

**Use Case 3: Accidentally Created in Wrong Universe**
1. User is in "Star Wars Universe"
2. Accidentally creates station "Interstellar News" 
3. Realizes it should be in "Star Citizen Universe"
4. Goes to Settings → See station listed under "Star Wars"
5. Click station → Edit → No universe picker (shows read-only "Star Wars Universe")
6. Workaround: Delete station, switch universe, recreate
7. Future feature: Allow moving entity between universes (Phase 6)

### Timeline & Priority

**Estimate**: 4-5 days (selector 1d + routing 1d + API filtering 2d + UI 1d + settings 1d)  
**Priority**: High (critical UX for multi-universe users, prevents data confusion)  
**Dependency**: None (can be done independently, but pairs well with import/export)  
**Testing**: Unit tests for context/filtering, integration test for universe switching, UAT with multi-universe scenario

### Success Criteria

- [x] User sees UniverseSelector after splash screen
- [x] User can click to select a universe
- [x] Selection persists across page reloads (localStorage)
- [x] All stations/brands filtered by selected universe
- [x] Universe dropdown in header shows current context
- [x] Creating new station auto-scopes to selected universe
- [x] No data leakage between universes (A's stations never appear when B is selected)
- [x] Onboarding flow guides new user to create first universe
- [x] Splash screen feels natural (not rushed)

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
- [ ] **Universe as top-level container — schema migration**:
  - Add `universe_id` FK (NOT NULL) to `stations` table
  - Add `universe_id` FK (NOT NULL) to `brands` table
  - Artists/Jingles scoped through Station → no direct FK needed
  - Write Alembic migration (nullable first, backfill, then NOT NULL)
  - Update all `POST /stations` and `POST /brands` to require `universe_id`
  - Update all `GET /stations` and `GET /brands` to filter by `universe_id`
  - Add `GET /universes/{id}/stations` and `GET /universes/{id}/brands` convenience routes
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

---

## Future Major Feature: Advanced AetherWave Expansion — Multi-Module Content Generation (📋 Planning Complete — See `/root/.claude/plans/calm-soaring-dolphin.md`)

**Scope**: Transform AetherWave into a full-featured procedural radio station factory with real-time data integration, lore synthesis, and extensible plugin architecture. Each universe operates as an isolated sandbox with zero cross-universe data leakage.

**Total Effort**: 4 months (14 weeks), 5-7 developers or 1 dev × 4 months serial

### MODULE 1: Core Talk Radio & News Generation (Weeks 1-7)

**Feature 1.1: Dynamic Market Scraper (In-Universe Economy Index)** ⏳ Priority: HIGH
- [ ] Database schema: UniverseDataSources, configurable parsers (Star Citizen Trade Tools, Eve Online, etc.)
- [ ] Commodity scraper: extract top 3 margins + optimal routes
- [ ] LLM prompt: "Write 60s Market Minute in gritty space trucker voice"
- [ ] API endpoints: POST /universes/{id}/data-sources, GET /universes/{id}/market-report
- [ ] Frontend: Universe config UI for adding data sources (Universe Settings tab)
- [ ] Celery beat job: scheduled scraping + report generation
- [ ] Testing: E2E with live API calls (with fallback/mocking)
- [ ] **Effort**: 3-4 days

**Feature 1.2: Lore-Driven News Engine (Real-to-Lore Translation)** ⏳ Priority: HIGH
- [ ] Database schema: UniverseNewsSources, GeneratedNewsSegments
- [ ] RSS parser + feed monitoring (Celery job)
- [ ] Lore translation prompt: "Translate meta-update into [Universe] lore using attached lore doc"
- [ ] Example: Real: "Server meshing live" → Lore: "New quantum lanes discovered"
- [ ] API endpoints: POST /universes/{id}/news-sources, GET /universes/{id}/news
- [ ] Frontend: News sources management UI
- [ ] Admin approval queue: show source + translation side-by-side
- [ ] Testing: Prompt tuning, LLM coherence validation
- [ ] **Effort**: 4-5 days

**Feature 1.3: Dynamic World Status Alerts (Emergency Broadcasts)** ⏳ Priority: HIGH
- [ ] Database schema: UniverseStatusMonitors, EmergencyAlerts
- [ ] Status monitor: poll official API (30s or 1m intervals)
- [ ] Error mapping: "Error30000" → "Sub-Space Anomaly", "ServiceOffline" → "Comm-Relay Network Failure"
- [ ] Emergency script generation: urgent PSA via LLM
- [ ] Audio queue integration: INTERRUPT current track, play alert immediately (priority > bumper > track)
- [ ] API endpoints: POST /universes/{id}/status-monitor, GET /universes/{id}/alerts
- [ ] Testing: Status API mocking, interrupt timing validation (<2s latency)
- [ ] **Effort**: 2-3 days

**Feature 1.4: Procedural Call-In Show Segments** ⏳ Priority: MEDIUM
- [ ] Database schema: CallerArchetypes (personality prompts, voice profiles)
- [ ] Script generation: LLM dialogue between DJ + random Caller Archetype
- [ ] Output format: `[{"speaker": "DJ", "emotion": "concerned", "text": "..."}, ...]` for TTS emotion markers
- [ ] Voice consistency: each Caller has `voice_profile_id` → Lyria seed linking
- [ ] API endpoints: POST /universes/{id}/caller-archetypes, POST /universes/{id}/call-in-segment
- [ ] Testing: Multi-character dialogue coherence, emotion modulation
- [ ] **Effort**: 3-4 days

**Feature 1.5: Extensible Web Scraper (Dynamic Data Extraction)** ⏳ Priority: MEDIUM
- [ ] Database schema: ScrapeJobs (async job tracking)
- [ ] Headless browser orchestration (Puppeteer integration)
- [ ] Boilerplate stripping: remove nav, footer, ads before LLM
- [ ] LLM-driven extraction: flexible schema validation (user provides goal + expected JSON schema)
- [ ] Example: "Extract pirate activity mentions from this forum" → structured JSON
- [ ] API endpoints: POST /universes/{id}/scrape, GET /universes/{id}/scrape/{job_id}
- [ ] Risks: XSS in scraped content, memory/CPU spike on large pages, robots.txt respect
- [ ] Testing: Multi-page scraping, LLM callback validation
- [ ] **Effort**: 3-4 days

**Feature 1.6: Broadcast Memory Ledger (Contextual Continuity)** ⏳ Priority: HIGH
- [ ] Database schema: `Universe.broadcast_memory` (JSON rolling buffer of 15 events)
- [ ] Event types: market_report, news, emergency_alert, call_in, podcast_episode
- [ ] Ledger injection: every LLM prompt includes recent events
- [ ] LLM continuity prompting: "Reference these past events where natural... (e.g., 'Following up on yesterday's comms blackout...')"
- [ ] API endpoints: GET /universes/{id}/broadcast-memory, POST /universes/{id}/broadcast-memory/reset (admin)
- [ ] Snapshot history: weekly backups for rollback (BroadcastMemoryHistory table)
- [ ] Callback validation: only allow references to events <7 days old
- [ ] Testing: Ledger persistence, event deduplication, LLM callback accuracy
- [ ] **Effort**: 2-3 days

**Phase 1 Total**: 2 weeks (17-21 days)

### MODULE 2: Extensions & Plugins (Weeks 8-12)

**Feature 2.1: Opt-In Podcast Integration (Sandboxed Media)** ⏳ Priority: MEDIUM
- [ ] Database schema: UniversePodcasts (RSS feeds per universe), PodcastEpisodes
- [ ] RSS parser + daily feed check (Celery job)
- [ ] Audio downloader: fetch MP3, normalize volume with ffmpeg
- [ ] Queue rotation: configurable weight (e.g., 1 podcast per 5 tracks)
- [ ] Syndication bumper generation: LLM creates intro/outro scripts
- [ ] API endpoints: POST /universes/{id}/podcasts, GET /universes/{id}/podcasts, POST /podcasts/{id}/refresh
- [ ] Frontend: Podcast management UI (add feed, set rotation weight, view episodes)
- [ ] Testing: RSS parsing edge cases, audio normalization, bumper coherence
- [ ] **Effort**: 2-3 days

**Feature 2.2: Extensible Plugin Architecture (The Hook System)** ⏳ Priority: MEDIUM (long-term value)
- [ ] Event emitter system throughout core app
  - [ ] Events: onApplicationBoot, onUniverseLoad, onTrackStart, onTrackEnd, onNewsFetch, onEmergencyAlert, onTalkSegmentGenerate, onTTSQueue
  - [ ] Listener registration: `eventEmitter.on('onTrackStart', (context) => {...})`
- [ ] Plugin manifest schema (JSON): name, version, author, universes, permissions, entry_point, hooks
- [ ] Plugin manager (backend):
  - [ ] Plugin registry: SQLite (InstalledPlugins table)
  - [ ] Plugin loader: read manifest, validate, load entry point
  - [ ] Permission enforcer: whitelist network/fs access per permission
  - [ ] State manager: isolated key-value store per plugin (PluginState table)
  - [ ] Error isolation: plugin crash doesn't crash core (try-catch wrapper)
- [ ] VM sandbox (Node.js VM context):
  - [ ] Each plugin runs in isolated context
  - [ ] No direct access to other plugins
  - [ ] Restricted require() (no @aws-sdk, @google-cloud, no fs except /plugins/{name}/)
  - [ ] Memory limit: 512MB per plugin
  - [ ] Execution timeout: 10s per hook (kill at 10s)
- [ ] Plugin state isolation:
  - [ ] Each plugin has isolated `plugin_state.json`
  - [ ] Key-value store: `{ "last_market_report": "2026-05-09T14:30:00Z", ... }`
  - [ ] State persisted to DB (PluginState table)
- [ ] API endpoints:
  - [ ] POST /api/v1/plugins/install (upload ZIP, validate, install)
  - [ ] GET /api/v1/plugins (list installed, with universe scope)
  - [ ] PATCH /api/v1/plugins/{id} (enable/disable, update config)
  - [ ] DELETE /api/v1/plugins/{id} (uninstall)
  - [ ] GET /api/v1/plugins/{id}/logs (realtime console output)
  - [ ] GET /api/v1/plugins/{id}/state (retrieve key-value store)
- [ ] Frontend UI (new "Plugins" tab in Settings):
  - [ ] Grid of installed plugins (icon, name, version, author, enable/disable toggle)
  - [ ] "Install from GitHub" button (repo URL → clone → extract → validate → install)
  - [ ] Per-plugin logs viewer (console output, error stream)
  - [ ] Uninstall button with confirmation
  - [ ] Permissions disclosure: "This plugin can access network, read memory ledger"
- [ ] Plugin SDK (npm package: @aetherwave/plugin-sdk):
  - [ ] Export: `register(app: PluginAPI) → void | Promise<void>`
  - [ ] Hook interface: `onTrackStart(context: TrackContext) → void | Promise<void>`
  - [ ] Context object: access to Broadcast Memory Ledger (read), plugin state (read/write), event emitter
  - [ ] Example plugin skeleton in docs
- [ ] Documentation:
  - [ ] Plugin development guide (manifest, hooks, SDK usage)
  - [ ] Plugin gallery (examples: custom scraper, lore translator, sentiment analyzer)
  - [ ] Security best practices (no fs access without permission, validate user input)
  - [ ] Deployment checklist (test in VM, submit to plugin registry — future)
- [ ] Security testing:
  - [ ] Sandbox escape attempts (require() breakout, global variable pollution)
  - [ ] Permission bypass (network access without permission grant)
  - [ ] Resource limits (512MB heap enforcement, 10s timeout kill)
  - [ ] Malicious plugin (corrupts state, steals API keys, reads other plugins)
- [ ] **Effort**: 5-7 days

**Phase 2 Total**: 1-1.5 weeks (7-10 days)

### Integration & Polish (Weeks 12-14)

- [ ] End-to-end testing: all 8 features working together across 3+ test universes
- [ ] Universe isolation audit: verify NO cross-universe data leakage
  - [ ] Every API query includes WHERE universe_id = :universe_id
  - [ ] LLM prompts include explicit universe constraint
  - [ ] Plugin hooks only fire for subscribed universes
  - [ ] Memory ledger completely isolated
- [ ] Performance profiling:
  - [ ] Market report generation: <30s (polling + LLM synthesis)
  - [ ] News translation: <60s per article
  - [ ] Emergency alert: <2s interruption latency
  - [ ] Lyria synthesis queue: <100 items (auto-pruning if exceeded)
  - [ ] Plugin hook execution: <10s (timeout at 10s)
- [ ] Security audit:
  - [ ] Sandbox escapes, XSS, injection, path traversal
  - [ ] API rate limiting (third-party services don't block)
  - [ ] Cost tracking + ceiling enforcement
- [ ] Load testing: 5 universes running simultaneously, 50 concurrent LLM requests
- [ ] Rollback plan: corrupted Memory Ledger → restore from weekly snapshot
- [ ] Documentation:
  - [ ] Architecture guide (universe isolation, data flows, plugin sandbox)
  - [ ] Plugin SDK + example plugins
  - [ ] Deployment checklist
  - [ ] Troubleshooting guide

**Total Estimate**: 4 months (14 weeks) for full implementation + testing

---

### Critical Database Schema (Summary)

**New Tables**:
- UniverseDataSources, UniverseNewsSources, UniverseStatusMonitors, UniversePodcasts
- GeneratedNewsSegments, EmergencyAlerts, CallerArchetypes, ScrapeJobs
- PodcastEpisodes, InstalledPlugins, PluginState, PluginLogs, BroadcastMemoryHistory

**Universe Table Updates**:
- Add `broadcast_memory` JSON column (15-event rolling buffer)
- Existing `lore_document` used for news translation + emergency context

**Schema Constraint**: Every new row MUST have explicit `universe_id` FK + index

---

### Risk Register (Module 1 + 2)

| ID | Risk | Severity | Mitigation |
|----|------|----------|-----------|
| 1 | Cross-universe data leak | CRITICAL | WHERE universe_id clause audits + integration tests with 3+ universes |
| 2 | LLM prompt injection | CRITICAL | Sanitize all user inputs; jinja2 template escaping |
| 3 | Plugin sandbox escape | CRITICAL | VM isolation tests; restricted require() whitelist; permission enforcement audit |
| 4 | API rate limit exceeded | HIGH | Cache responses (1h TTL); exponential backoff; admin alert at 80% quota |
| 5 | LLM cost spiral | HIGH | Cost ceiling per universe + day; detailed logging; alerts at 50%, 80%, 100% |
| 6 | Memory ledger corruption | MEDIUM | Weekly snapshots; rollback endpoint; validation on append |
| 7 | Headless browser memory leak | MEDIUM | Process timeout + restart; heap limit; page size <5MB |
| 8 | Podcast feed validation broken | MEDIUM | Fallback to cached version; admin notification; manual re-parse |
| 9 | Plugin dependency conflicts | MEDIUM | Audit on install; warn if npm pkg conflicts |
| 10 | Lyria synthesis queue backlog | MEDIUM | Monitor depth; prioritize emergency > bumper > track |

---

### Implementation Prerequisites

✅ Universe Selector home page (foundation for universe-scoped features)  
✅ Import/Export system (for backup/recovery)  
✅ AI DJ staging + ChatAssistant (pattern for generalized entity staging)  
✅ Broadcast system architecture (queue manager, Lyria integration)

**Ready to start**: After all above features ship to production

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
