# Feature 2 Plan - Junior Developer Review

**Reviewed**: 2026-05-09  
**Reviewer Level**: Junior (clarity, completeness, logical flow)  
**Plan Document**: FEATURE2_PLAN.md

---

## Strengths ✅

1. **Clear Structure**: Plan is broken into 4 logical phases that build on each other
   - Phase 1 (chat parsing) → Phase 2 (form routing) → Phase 3 (API) → Phase 4 (AI prompts)
   - Good progression from UI → backend → AI integration

2. **Good Reuse of Phase 2**: Recognizes FormManager already exists and is generic
   - Avoids reinventing state management
   - Smart reuse of existing patterns

3. **All Entity Types Covered**: Clearly lists 6 types throughout
   - DJ, Station, Brand, Jingle, Draft, Universe
   - Consistent naming across all docs

4. **Clear Component Contracts**: Each component shows clear interfaces
   - `EntitySuggestionCardProps` shows exactly what component needs
   - API method signatures clear

5. **Testing Included**: Each phase has testing checklist
   - Shows awareness that testing matters
   - Tests match implementation

6. **Code Examples Helpful**: Shows actual code structure
   - ENTITY_SUGGESTION block format clear
   - Database models show what fields to add

---

## Gaps & Concerns ⚠️

### 1. **Missing: Form Field Definitions per Entity Type**
**Concern**: Plan says "update StationForm to accept initialData" but doesn't specify WHICH fields each form expects.

**Question**: What are the required fields for:
- Station form? (name, frequency, genre, mood, description, backstory?)
- Brand form? (name, industry, tagline, description, target_demographic, price_range?)
- Jingle form? (title, description, mood, duration, lyrics_snippet?)
- Draft form? (title, description, genre, mood, tempo, notes?)
- Universe form? (name, description, setting, key_features, inspiration?)

**Risk**: Frontend forms might expect different fields than AI generates → mismatch

**Recommendation**: Add to FEATURE2_PLAN.md a table showing required + optional fields per entity type

### 2. **Missing: Handle Form Submission**
**Concern**: Plan shows form pre-fill but doesn't say what happens when user clicks "Save"

**Question**: 
- Does form call API directly (e.g., `api.createStation()`)? 
- Or does it call `api.stageStation()` to staging endpoint?
- Or something else?

**Risk**: Unclear flow could lead to incorrect implementation

**Recommendation**: Add submission flow diagrams for each entity type

### 3. **Missing: Error Handling for API Failures**
**Concern**: No mention of what happens if staging API fails
- Network error during `stageStation()`?
- Validation error (rejected by Pydantic)?
- Rate limit exceeded?

**Risk**: UI might hang or show confusing errors to user

**Recommendation**: Add error handling section with examples

### 4. **Missing: Backward Compatibility Note**
**Concern**: Plan extends parseEntitySuggestions() but existing code uses parseDJSuggestions()

**Question**: 
- Does Phase 1 need to support BOTH DJ_SUGGESTION and ENTITY_SUGGESTION?
- Or only ENTITY_SUGGESTION?

**Risk**: Old chat responses might break if we remove parseDJSuggestions()

**Recommendation**: Clarify that Phase 1 should support BOTH formats (backward compat)

### 5. **Missing: useFormInitialData Hook for Non-DJ Entities**
**Concern**: Plan assumes useFormInitialData() hook works for all entity types, but Phase 2 only tested it for DJ

**Question**: Does hook need updates to support Station, Brand, Jingle, Draft, Universe?

**Risk**: Hook might have DJ-specific logic that breaks for other types

**Recommendation**: Verify hook works generically or update it

### 6. **Database Constraint: Universe Status Field**
**Concern**: Plan adds status field to Station, Brand, Jingle, Draft but NOT Universe

**Question**: Why not Universe? Should users be able to stage/draft universes?

**Recommendation**: Clarify whether Universe needs staging or if it's always published

### 7. **Missing: AI Confidence Scoring**
**Concern**: Plan mentions `confidence: high|medium|low` but doesn't explain how to use it

**Question**: 
- Should UI hide low-confidence suggestions?
- Should we show warning for medium confidence?
- Should AI be more conservative (generate only high-confidence)?

**Risk**: Low-quality AI suggestions could frustrate users

**Recommendation**: Add section on confidence handling in UI

### 8. **Missing: Mobile Layout for Forms**
**Concern**: Plan says "mobile responsive" but doesn't specify form layout changes

**Question**: How should StationForm render on mobile (<768px)?
- Stack vertically?
- Modal overlay?
- Tabs instead of scroll?

**Risk**: Forms might be unusable on mobile

**Recommendation**: Add mobile form layout specs or reference existing patterns

---

## Questions for Clarification

1. **Staging vs Direct Creation**: When user submits AI-generated form data, does it:
   - Go straight to `api.createStation()` (immediate publish)?
   - Go to `api.stageStation()` then needs approval?
   - Something else?

2. **Form State Management**: Does form data come from:
   - `useFormInitialData()` hook (Phase 2 pattern)?
   - Or direct route state?
   - Or something else?

3. **Entity Type Routing**: How does FormManager know which form component to open?
   - Via route? (`/stations` → StationForm)
   - Via context?
   - Via conditional render?

4. **Undo Window**: Does every entity type have 30-second undo, or only major ones?

5. **Database Migrations**: Do existing Station/Brand/Jingle/Draft tables have status field already, or do we add it?

---

## Recommended Additions to Plan

### 1. **Entity Field Map**
```
Station:
  Required: name, frequency, genre
  Optional: mood, description, backstory, logo_url
  
Brand:
  Required: name, industry
  Optional: tagline, description, target_demographic, price_range, logo_url

Jingle:
  Required: title, description
  Optional: mood, duration, lyrics_snippet, audio_url

Draft:
  Required: title
  Optional: description, genre, mood, tempo, notes, audio_url

Universe:
  Required: name, description
  Optional: setting, key_features, inspiration
```

### 2. **Error Handling Section**
```
Network Error:
- Show: "Connection lost. Please try again."
- Button: "Retry"

Validation Error (from API):
- Show: Specific field errors (e.g., "Name required", "Invalid frequency")
- Allow: User to fix and resubmit

Rate Limit:
- Show: "Too many pending entities. Approve some first."
- Action: Let user navigate to pending section

Staging Failure:
- Show: Error message from API
- Action: Option to discard or retry
```

### 3. **Form Submission Flow Diagram**
```
User clicks "Save" on form
  ↓
Form validates locally (required fields, format)
  ↓
If invalid → Show errors on form, don't submit
  ↓
If valid → Call api.stageStation({ ...formData })
  ↓
API response:
  - Success: Show "✅ Staged successfully" → Navigate back to chat
  - Error: Show error message → Let user retry
```

### 4. **Backward Compatibility Note**
```
Phase 1 MUST support:
- Old DJ_SUGGESTION blocks (Phase 2 format)
- New ENTITY_SUGGESTION blocks (Feature 2 format)

ChatAssistant should:
1. Try parseEntitySuggestions() first
2. If no results, fallback to parseDJSuggestions()
3. Render both in same UI
```

---

## Overall Assessment

**Plan Quality**: ⭐⭐⭐⭐ (4/5 stars)

**Strengths**:
- Clear architecture, good reuse, all entity types covered
- Good progression from UI → backend → AI
- Testing mindset throughout

**Improvements Needed**:
- Clarify form field mappings (which fields per entity)
- Add error handling section
- Clarify staging vs direct creation flow
- Add backward compatibility note for DJ_SUGGESTION
- Specify mobile form layouts

**Recommendation**: Plan is solid foundation. Address the 8 gaps above, then ready for MID-level review.

---

## Next Steps

1. ✅ Update FEATURE2_PLAN.md with:
   - Entity field map
   - Error handling section
   - Form submission flow
   - Backward compatibility note
   - Mobile layout specs

2. Then: MID-level architecture review

3. Then: SR production-readiness review

4. Then: Implementation begins
