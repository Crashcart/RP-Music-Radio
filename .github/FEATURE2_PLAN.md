# Feature 2: Multi-Entity Form Filling via Chat (Natural Language Entity Creation)

**Date**: 2026-05-09  
**Status**: Planning (JR → MID → SR review cycle)  
**Effort**: 2-3 weeks total (4 phases)  
**Priority**: HIGH (extends FormManager from DJ-only to all entity types)

---

## Executive Summary

**Goal**: Enable users to create ANY entity type (Station, Brand, Jingle, Draft, Universe, DJ) via natural language chat with AI-generated data, form preview confirmation, and approval workflow.

**Example Flow**:
```
User:  "Create a synthwave station"
AI:    "I can help! Should I fill in a Station form with these details?"
User:  "Yes"
Form:  Opens /stations with pre-filled name, genre, description
User:  Edits fields, clicks Save → Station created
```

**Key Differences from Phase 2 (DJ-only)**:
- ✅ Phase 2: DJ staging only, limited entity types
- 🔄 Feature 2: ALL entity types (6 total), generalized FormManager, enhanced AI
- 🔄 Feature 2: Confirmation dialog for major entities, auto-open for quick-creates
- 🔄 Feature 2: Staging endpoints for Stations, Brands, Jingles, Drafts, Universes

---

## Entity Field Map (All Types)

### Station
**Required**: name, frequency, genre  
**Optional**: mood, description, backstory, logo_url  
**Example AI Output**:
```json
{
  "name": "Nebula FM",
  "frequency": "99.8",
  "genre": "synthwave",
  "mood": "cyberpunk",
  "description": "Fictional synthwave station set in 2087",
  "backstory": "Founded by rogue AI collective"
}
```

### Brand
**Required**: name, industry  
**Optional**: tagline, description, target_demographic, price_range, logo_url  
**Example AI Output**:
```json
{
  "name": "Retro Wave Corp",
  "industry": "music production",
  "tagline": "Analog vibes for the digital age",
  "description": "80s-inspired fictional brand",
  "target_demographic": "Gen X nostalgia lovers",
  "price_range": "mid-range"
}
```

### Jingle
**Required**: title, description  
**Optional**: mood, duration, lyrics_snippet, audio_url  
**Example AI Output**:
```json
{
  "title": "Neon Dreams",
  "description": "Upbeat synth jingle for station bumper",
  "mood": "energetic",
  "duration": "15",
  "lyrics_snippet": "Neon dreams, electric nights..."
}
```

### Draft (Track)
**Required**: title  
**Optional**: description, genre, mood, tempo, notes, audio_url  
**Example AI Output**:
```json
{
  "title": "Midnight Run",
  "description": "Instrumental synthwave track",
  "genre": "synthwave",
  "mood": "melancholic",
  "tempo": "120",
  "notes": "Vintage synthesizers, lo-fi production"
}
```

### Universe
**Required**: name, description  
**Optional**: setting, key_features, inspiration  
**Example AI Output**:
```json
{
  "name": "Star Citizen Universe",
  "description": "Far-future space opera with procedural planets",
  "setting": "Year 2954, United Earth Empire",
  "key_features": "Space exploration, alien civilizations, player-driven economy",
  "inspiration": "Elite Dangerous, No Man's Sky, real space exploration"
}
```

---

## Form Submission Flow

All forms follow same pattern:

```
1. Form loads with initialData from useFormInitialData() hook
   - If aiGenerated=true, show warning banner
   - Mark AI-filled fields with .form-ai-filled class

2. User edits fields (can change anything)

3. User clicks "Save/Create [Entity]" button
   - Form validates locally (required fields, format)
   - If errors: show them below each field, don't submit

4. Form submits → call api.stage{Entity}({ ...formData })
   - Staging endpoint validates via Pydantic (rejects malformed)
   - On success: entity created with status="draft", expires_at set
   - On error: show error message, let user retry

5. On success → show "✅ Staged successfully"
   - Navigate back to chat or previous page
   - Entity appears in "Pending [EntityType]" section

6. On error → show error, allow user to:
   - Fix and retry
   - Cancel and go back
```

### Form Submission Examples

**StationForm Submission**:
```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!isFormValid()) {
    showErrors();
    return;
  }
  
  try {
    const result = await api.stageStation({
      name: formData.name,
      frequency: formData.frequency,
      genre: formData.genre,
      mood: formData.mood,
      description: formData.description,
      backstory: formData.backstory,
    });
    
    // Success
    showSuccess("Station staged successfully!");
    setTimeout(() => navigate("/"), 1500);
  } catch (err) {
    showError(err.message);
  }
};
```

**For all other entities**: Same pattern, just call `api.stage{Entity}()`

---

## Error Handling Strategy

### Network Error
```
Scenario: api.stageStation() fails due to network
Display: "Connection lost. Please try again."
Action: "Retry" button re-submits form
```

### Validation Error (from API)
```
Scenario: API rejects invalid data (Pydantic validation fails)
Display: Specific field errors, e.g.:
  "Name: Required field"
  "Frequency: Invalid format (expected X.X)"
Action: User fixes fields and resubmits
```

### Rate Limit Exceeded
```
Scenario: User has 5 pending drafts already, tries to create 6th
Display: "Too many pending entities. Approve or reject some first."
Action: Link to pending section, or Cancel
```

### Staging API Error
```
Scenario: Database error, internal server error, etc.
Display: "Failed to stage [Entity]. Please try again or contact support."
Action: "Retry" or "Cancel"
```

### Quota/Cost Ceiling
```
Scenario: User exceeded AI cost limit for the day
Display: "Daily AI quota exceeded. Try again tomorrow."
Action: Show estimated reset time, Cancel
```

---

## Backward Compatibility: DJ_SUGGESTION Support

**Requirement**: Phase 1 MUST support both old and new formats.

**Old Format** (Phase 2):
```
DJ_SUGGESTION
name: Vance Rikard
display_name: DJ Vex
type: dj
personality: ...
ENTITY_SUGGESTION
```

**New Format** (Feature 2):
```
ENTITY_SUGGESTION
type: dj
name: Vance Rikard
display_name: DJ Vex
personality: ...
ENTITY_SUGGESTION
```

**ChatAssistant Logic**:
```typescript
// Phase 2 existing logic
const entitySuggestions = parseEntitySuggestions(replyText);
const djSuggestions = entitySuggestions.length === 0 
  ? parseDJSuggestions(replyText)  // Fallback to old format if no new format
  : [];

// Render both in same UI
{entitySuggestions.map(entity => <EntitySuggestionCard ... />)}
{djSuggestions.map(dj => <EntitySuggestionCard ... />)}
```

**Result**: Old and new suggestion formats work simultaneously, no breaking changes.

---

## Mobile Form Layout

### Mobile Constraints (<768px)
- Vertical stack (no side-by-side)
- Full-width inputs
- Bottom-aligned buttons (44px min height)
- No horizontal scroll

### Pattern
```
[Form Title]

[Warning Banner] (if aiGenerated)

[Field Group 1: Identity]
  [Label]
  [Input]

[Field Group 2: Details]
  [Label]
  [Input or Textarea]

[Field Group 3: Metadata]
  [Label]
  [Input]

[Buttons: Cancel | Save]
```

### Examples
- StationForm mobile: Name, Frequency, Genre fields stacked vertically
- BrandForm mobile: Name, Industry, Tagline stacked
- All buttons full-width or 44px tap targets

---

## Phase 1: Extended ChatAssistant Proposal System (2-3 days)

### Scope
Enhance ChatAssistant to parse structured entity suggestions for ALL types, show confirmation dialogs, and route to FormManager.

### Architecture

#### New ENTITY_SUGGESTION Format
Replace/extend DJ_SUGGESTION with generic ENTITY_SUGGESTION blocks:

```
ENTITY_SUGGESTION
type: station
confidence: high
name: Nebula FM
frequency: 99.8
genre: synthwave
mood: cyberpunk
description: Fictional synthwave station set in year 2087
backstory: Founded by rogue AI collective
ENTITY_SUGGESTION

ENTITY_SUGGESTION
type: brand
confidence: medium
name: Retro Wave Corp
industry: music production
tagline: Analog vibes for the digital age
description: Fictional 80s-inspired brand
target_demographic: Gen X nostalgia lovers
price_range: mid-range
ENTITY_SUGGESTION
```

#### Components to Create/Modify

**File: `frontend/src/components/EntitySuggestionCard.tsx` (NEW)**
```typescript
// Generic suggestion card for any entity type
interface EntitySuggestionCardProps {
  suggestion: EntitySuggestion;
  entityType: FormEntityType;
  onOpenForm: (suggestion: EntitySuggestion) => void;
  onStageEntity?: (suggestion: EntitySuggestion) => void; // Legacy DJ staging
}

// Displays:
// - Entity type badge (station | brand | dj | jingle | draft | universe)
// - Name + description (truncated)
// - Confidence indicator (if medium/low)
// - "Open Form" button
// - Status indicator (idle | staging | staged | error)
```

**File: `frontend/src/utils/entitySuggestionParser.ts` (EXTEND)**

Currently supports DJ_SUGGESTION. Add:
```typescript
// Extend EntityType union
type EntityType = "dj" | "station" | "brand" | "jingle" | "draft" | "universe";

// Parser already supports generic ENTITY_SUGGESTION blocks
// Just ensure it extracts all fields correctly for all types
function parseEntitySuggestions(text: string, entityType?: EntityType): EntitySuggestion[]
```

**File: `frontend/src/components/ChatAssistant.tsx` (MODIFY)**

Currently handles DJ suggestions and FormManager. Extend to:
```typescript
// Already have:
const entitySuggestions = parseEntitySuggestions(replyText);
const djSuggestions = parseDJSuggestions(replyText);

// Add rendering for ALL entity types
{msg.entitySuggestions?.map(entity => (
  <EntitySuggestionCard 
    key={entity.type}
    suggestion={entity}
    onOpenForm={handleOpenFormForEntity}
  />
))}
```

#### Flow
1. AI responds with ENTITY_SUGGESTION blocks (any type)
2. ChatAssistant parses via parseEntitySuggestions()
3. Renders EntitySuggestionCard for each (generic, works for all types)
4. User clicks "Open Form"
5. handleOpenFormForEntity() called (existing logic, already generic)
6. FormPreviewDialog shows if requiresFormPreview(entityType) = true
7. User confirms → FormManager.openForm() called
8. AIFormNavigator routes to appropriate page

### Testing
- [ ] Parse STATION_SUGGESTION blocks
- [ ] Parse BRAND_SUGGESTION blocks
- [ ] Parse JINGLE_SUGGESTION blocks
- [ ] Parse DRAFT_SUGGESTION blocks
- [ ] Parse UNIVERSE_SUGGESTION blocks
- [ ] Render EntitySuggestionCard for each type
- [ ] FormPreviewDialog appears for Station/Brand/Universe
- [ ] Auto-open for DJ/Jingle/Draft

---

## Phase 2: Enhanced FormManager for All Entity Types (2-3 days)

### Scope
Extend FormManager context to support routing to ANY entity form, not just DJ.

### Current FormManager (Phase 2)
```typescript
type FormEntityType = "dj" | "jingle" | "draft" | "station" | "brand" | "universe";

interface FormOpenRequest {
  entityType: FormEntityType;
  initialData: Record<string, string>;
  aiGenerated?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Existing helpers already support all types:
getFormPageRoute(entityType) → "/stations" | "/artists" | "/brands" | "/jingles" | "/drafts" | "/universes"
requiresFormPreview(entityType) → true for Station/Brand/Universe, false for DJ/Jingle/Draft
```

### Updates Needed

**None for FormManagerContext itself** - already generic!

**Forms to Update** (all need to support initialData):

1. **StationForm** (frontend/src/pages/Stations.tsx)
   ```typescript
   export function StationForm() {
     const { initialData, isAiGenerated } = useFormInitialData("station");
     const [name, setName] = useState(initialData?.name ?? "");
     const [genre, setGenre] = useState(initialData?.genre ?? "");
     // ... pre-fill all fields from initialData
     
     return (
       <>
         {isAiGenerated && <WarningBanner />}
         <input value={name} className={isAiGenerated ? "form-ai-filled" : ""} />
         {/* ... rest of form */}
       </>
     );
   }
   ```

2. **BrandForm** (frontend/src/pages/Brands.tsx)
   - Same pattern as StationForm

3. **JingleForm** (frontend/src/pages/DraftingTable.tsx or separate Jingles.tsx)
   - Same pattern as StationForm

4. **DraftForm** (frontend/src/pages/DraftingTable.tsx)
   - Same pattern as StationForm

5. **UniverseForm** (frontend/src/pages/Universes.tsx or separate component)
   - Same pattern as StationForm

6. **ArtistForm** (already done for DJ - no changes needed)

### Testing
- [ ] StationForm pre-fills from AI data
- [ ] BrandForm pre-fills from AI data
- [ ] JingleForm pre-fills from AI data
- [ ] DraftForm pre-fills from AI data
- [ ] UniverseForm pre-fills from AI data
- [ ] All forms show warning banner when isAiGenerated=true
- [ ] Form navigation works for all types

---

## Phase 3: Staging API Endpoints for All Entities (3-4 days)

### Scope
Add `/staged` endpoints for Stations, Brands, Jingles, Drafts, Universes (following DJ pattern from Phase 2).

### Backend Updates Required

**File: `backend/app/models/database.py` (MODIFY)**

Add `status` field to models (if not present):
```python
class Station(Base):
    # ... existing fields
    status: str = "published"  # published | draft | pending_publish
    created_by: str = None
    created_at: datetime = datetime.utcnow()
    expires_at: datetime = None
    undo_expires_at: datetime = None

class Brand(Base):
    # ... existing fields
    status: str = "published"
    created_by: str = None
    created_at: datetime = datetime.utcnow()
    expires_at: datetime = None
    undo_expires_at: datetime = None

class Jingle(Base):
    # ... existing fields
    status: str = "published"
    created_by: str = None
    created_at: datetime = datetime.utcnow()
    expires_at: datetime = None
    undo_expires_at: datetime = None

class Draft(Base):
    # ... existing fields
    status: str = "published"
    created_by: str = None
    created_at: datetime = datetime.utcnow()
    expires_at: datetime = None
    undo_expires_at: datetime = None

# Universe can remain as-is (simple creation, no staging)
```

**File: `backend/app/api/v1/routes.py` (ADD ENDPOINTS)**

```python
# POST /api/v1/stations/staged — Create draft station
# POST /api/v1/brands/staged — Create draft brand
# POST /api/v1/jingles/staged — Create draft jingle
# POST /api/v1/drafts/staged — Create draft track

# Each endpoint:
# - Validates input via Pydantic schema
# - Creates record with status="draft"
# - Sets expires_at = now + 7 days
# - Returns record with ID + expires_at

# GET /api/v1/stations?status=draft — List staged stations
# POST /api/v1/stations/{id}/publish — Approve station (draft → pending_publish)
# POST /api/v1/stations/{id}/undo — Revert (pending_publish → draft, within 30s window)

# Same endpoints for brands, jingles, drafts
```

**Rate Limiting** (Reuse from Phase 2):
- 5 concurrent drafts per entity type
- 20 creations/hour per user
- Cost ceiling tracking

**Celery Cleanup Job**:
```python
# backend/app/jobs/cleanup_drafts_job.py
# Daily task: delete all drafts where expires_at < now()
# Runs at 2 AM UTC daily
```

### Frontend Updates

**File: `frontend/src/api/client.ts` (ADD METHODS)**

```typescript
// For each entity type:
async stageStation(data: StationCreate): Promise<Station> { ... }
async listStagedStations(): Promise<Station[]> { ... }
async publishStation(id: string): Promise<Station> { ... }
async undoPublishStation(id: string): Promise<Station> { ... }

async stageBrand(data: BrandCreate): Promise<Brand> { ... }
// ... etc for Jingle, Draft
```

### Testing
- [ ] POST /api/v1/stations/staged creates draft station
- [ ] GET /api/v1/stations?status=draft returns staged stations
- [ ] POST /api/v1/stations/{id}/publish creates pending_publish
- [ ] POST /api/v1/stations/{id}/undo reverts within 30s
- [ ] Expired drafts auto-deleted
- [ ] Same for brands, jingles, drafts
- [ ] Rate limiting enforced
- [ ] Pydantic validation rejects malformed input

---

## Phase 4: AI Prompt Engineering for Multi-Entity (1-2 days)

### Scope
Update system prompts to guide AI to generate structured suggestions for ALL entity types.

### File: `backend/app/integrations/gemini_client.py` (MODIFY)

Enhance system prompt:

```
When users ask to create entities, respond with structured blocks:

For STATIONS:
ENTITY_SUGGESTION
type: station
name: [Station Name]
frequency: [99.8 or similar]
genre: [Primary genre]
mood: [Mood/vibe]
description: [Brief description]
backstory: [In-universe backstory]
ENTITY_SUGGESTION

For BRANDS:
ENTITY_SUGGESTION
type: brand
name: [Brand Name]
industry: [Industry]
tagline: [Short tagline]
description: [Description]
target_demographic: [Target market]
price_range: [Budget level]
ENTITY_SUGGESTION

For JINGLES:
ENTITY_SUGGESTION
type: jingle
title: [Title]
description: [Description]
mood: [Mood]
duration: [Seconds]
lyrics_snippet: [Optional lyrics]
ENTITY_SUGGESTION

For DRAFTS/TRACKS:
ENTITY_SUGGESTION
type: draft
title: [Title]
description: [Description]
genre: [Genre]
mood: [Mood]
tempo: [BPM]
notes: [Musical notes]
ENTITY_SUGGESTION

For UNIVERSES:
ENTITY_SUGGESTION
type: universe
name: [Universe Name]
description: [Full universe description]
setting: [Time/place]
key_features: [Defining characteristics]
inspiration: [Creative inspiration]
ENTITY_SUGGESTION
```

### Testing
- [ ] AI generates STATION_SUGGESTION with all required fields
- [ ] AI generates BRAND_SUGGESTION with all required fields
- [ ] AI generates JINGLE_SUGGESTION with all required fields
- [ ] AI generates DRAFT_SUGGESTION with all required fields
- [ ] AI generates UNIVERSE_SUGGESTION with all required fields
- [ ] Parser correctly extracts all fields for all types

---

## Implementation Checklist

### Phase 1: ChatAssistant Extensions (2-3 days)
- [ ] Create EntitySuggestionCard.tsx (generic suggestion card)
- [ ] Extend parseEntitySuggestions() to handle all types
- [ ] Update ChatAssistant.tsx to render all entity types
- [ ] Test parsing + rendering for all types
- [ ] Verify FormPreviewDialog appears for major entities

### Phase 2: Form Updates (2-3 days)
- [ ] Update StationForm to accept initialData
- [ ] Update BrandForm to accept initialData
- [ ] Update JingleForm to accept initialData
- [ ] Update DraftForm to accept initialData
- [ ] Update UniverseForm to accept initialData
- [ ] Add isAiGenerated warning banner to all forms
- [ ] Test form pre-fill for all types

### Phase 3: Backend Staging API (3-4 days)
- [ ] Add status fields to database models
- [ ] Create POST /api/v1/{entity}/staged endpoints
- [ ] Create GET /api/v1/{entity}?status=draft endpoints
- [ ] Create POST /api/v1/{entity}/{id}/publish endpoints
- [ ] Create POST /api/v1/{entity}/{id}/undo endpoints
- [ ] Implement rate limiting
- [ ] Implement Celery cleanup job
- [ ] Test all endpoints

### Phase 4: AI Prompting (1-2 days)
- [ ] Update Gemini system prompt
- [ ] Test AI generation for all entity types
- [ ] Verify all required fields included
- [ ] Test parser extraction

### Final Testing (2+ days)
- [ ] Unit tests for all new components
- [ ] Integration tests (chat → form → staging → approval)
- [ ] E2E tests (full user flows)
- [ ] Regression tests (Phase 1-2 features still work)
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

---

## Critical Design Decisions

1. **Reuse FormManager from Phase 2**: Don't create new state management, extend existing
2. **Status fields on all models**: Not separate DraftTable, keeps relationships intact
3. **Generic EntitySuggestionCard**: One component, works for all types
4. **AI prompt templates**: Clear structure for LLM to follow
5. **Rate limiting**: Prevent token/cost overruns

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Forms inconsistent in handling AI data | MEDIUM | Create shared `useFormInitialData` hook (already done in Phase 2) |
| AI generates invalid field values | HIGH | Pydantic validation at staging endpoint rejects malformed input |
| Database schema inconsistencies | MEDIUM | All models follow same status pattern (published/draft/pending_publish) |
| Race conditions on concurrent form opens | LOW | React batching + FormManager single state |
| Performance: loading 100+ staged entities | MEDIUM | Pagination + filtering on GET endpoints |

---

## Success Criteria

✅ Users can create ANY entity type (6 total) via natural language chat  
✅ AI-generated data properly validated before staging  
✅ Forms accept and display AI-generated initial data  
✅ Confirmation dialogs work for major entities, auto-open for quick-creates  
✅ Staged entities persist with auto-expiry (7 days)  
✅ Rate limiting prevents cost/token overruns  
✅ No regression in Phase 1-2 features  
✅ Mobile responsive, accessible (WCAG 2.1 AA)  
✅ Production-ready code with comprehensive tests  

---

**Next Step**: Junior review → MID review → SR review → Implementation
