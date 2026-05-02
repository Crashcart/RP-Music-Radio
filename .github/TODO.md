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

## Immediate Actions (Next Session)

### Environment & Configuration  
- [x] Make `GOOGLE_API_KEY` optional at startup (no more warnings during boot)
  - Changed logger.warning → logger.debug in all generators
  - API key now only checked when features actually launched
  - Users can start app and configure key via Settings page
  - Created GEMINI_SETUP.md with setup instructions
- [ ] First-time user onboarding flow (Settings → "Please add API key to continue")
