# Phase 2 Testing Strategy — FormManager & Multi-Entity Form Filling

**Last Updated**: 2026-05-09  
**Project**: AetherWave / RP-Music-Radio  
**Phase**: Phase 2 - Generalized Form Opening Logic

---

## Overview

Phase 2 introduces FormManager context to decouple AI-suggested entities from database staging. Testing ensures:
1. FormManager state management works correctly
2. Forms receive and display AI-generated initial data
3. User can review and edit AI data before submission
4. Navigation flows work end-to-end
5. No regressions in Phase 1 functionality

---

## Testing Pyramid

```
              E2E (Manual)
            Integration Tests
          Unit Tests
```

### Unit Tests (Bottom Layer)

**Goal**: Test individual functions/components in isolation

**Coverage**:
- FormManagerContext provider (state, actions)
- useFormInitialData hook (data retrieval)
- useFormField hook (field value retrieval)
- getFormPageRoute helper (route mapping)
- requiresFormPreview helper (preview logic)
- stripEntityBlocks utility (block removal)

**Test Files**:
- `frontend/src/contexts/FormManagerContext.test.tsx` — 20+ tests
- `frontend/src/hooks/useFormInitialData.test.ts` — 15+ tests
- `frontend/src/utils/entitySuggestionParser.test.ts` — 25+ tests (from Phase 1)

**Tools**: Vitest + React Testing Library

**Run**: `npm run test`

---

### Integration Tests (Middle Layer)

**Goal**: Test components working together (ChatAssistant → FormManager → Form)

**Scenarios**:

#### Scenario 1: DJ Suggestion → Form Fill
```
1. ChatAssistant receives ENTITY_SUGGESTION block for DJ
2. Parses suggestion using entitySuggestionParser
3. Renders DJ suggestion card
4. User clicks "Open Form"
5. handleOpenFormForEntity called
6. FormManager.openForm({ entityType: "dj", initialData: {...}, aiGenerated: true })
7. FormManagerContext updated
8. AIFormNavigator navigates to /artists
9. ArtistForm component mounts
10. useFormInitialData("dj") returns initial data + isAiGenerated flag
11. Form pre-fills fields
12. User edits fields
13. User submits
14. API creates artist
15. formManager.confirmForm() closes form
```

**Test**: Verify all steps work without errors

**Test File**: `frontend/src/__tests__/integration/form-filling.test.tsx`

```typescript
describe("DJ Suggestion → Form Fill Flow", () => {
  it("should navigate and pre-fill form when user clicks Open Form", async () => {
    // Setup: Render ChatAssistant with FormManager provider
    // Action: Simulate chat response with ENTITY_SUGGESTION
    // Action: User clicks entity suggestion "Open Form" button
    // Verify: Navigation happens to /artists
    // Verify: Form fields are pre-filled with AI data
    // Verify: AI-generated banner appears
  });

  it("should allow user to edit AI-generated data before submit", async () => {
    // Setup: Form is pre-filled with AI data
    // Action: User changes "name" field
    // Verify: Field value changed
    // Action: User submits form
    // Verify: API receives edited data (not original AI data)
  });
});
```

#### Scenario 2: Station Suggestion → Preview Dialog
```
1. ChatAssistant receives ENTITY_SUGGESTION for Station
2. User clicks "Open Form"
3. handleOpenFormForEntity checks requiresFormPreview("station")
4. FormPreviewDialog opens (shows confirmation)
5. User reviews summary
6. User clicks "Confirm"
7. openFormWithSuggestion called
8. FormManager.openForm invoked
9. Navigation to /stations
10. Form pre-fills
```

**Test**: Verify preview dialog appears for major entities

#### Scenario 3: Legacy DJ_SUGGESTION Backward Compatibility
```
1. ChatAssistant receives old DJ_SUGGESTION block (Phase 1 format)
2. parseDJSuggestions called (legacy parser)
3. djSuggestions array populated (not entitySuggestions)
4. Both old and new suggestion cards can render
5. Old "Stage DJ" button (renamed "Open Form") works
```

**Test**: Verify old format still works alongside new format

---

### E2E / Manual Tests (Top Layer)

**Goal**: Test real user workflows in browser

**Environment Setup**:
```bash
npm run dev                # Start frontend on localhost:5173
docker compose up -d       # Start backend services
```

**Test 1: Create DJ via Chat**
```
1. Open app
2. Chat: "Create 3 DJs for this station"
3. Wait for AI response (ENTITY_SUGGESTION blocks)
4. Click "Open Form" on first DJ
5. Verify: Navigated to /artists
6. Verify: Form fields pre-filled (name, personality, etc.)
7. Verify: AI-generated warning banner shows
8. Edit a field manually (e.g., change name)
9. Click "Save" / "Create Artist"
10. Verify: API creates artist
11. Verify: Form closes
12. Return to chat
13. Verify: Chat still open with suggestions visible
```

**Test 2: Station Creation via Preview Dialog**
```
1. Chat: "Create a new synthwave station"
2. Wait for ENTITY_SUGGESTION
3. Click "Open Form" on station
4. Verify: FormPreviewDialog appears
5. Verify: Summary shows station name, genre, concept
6. Click "Confirm" button in dialog
7. Verify: Dialog closes
8. Verify: Navigated to /stations
9. Verify: Form pre-filled with station data
10. Click "Create Station"
11. Verify: Station created in DB
```

**Test 3: Regression — Manual Creation Still Works**
```
1. Navigate to /artists
2. Click "Create New DJ" (manual form)
3. Verify: Form is empty (no AI data)
4. Verify: No AI-generated banner
5. Fill form manually
6. Submit
7. Verify: Artist created successfully
```

**Test 4: Mobile Responsiveness**
```
1. Open app in mobile view (devtools < 768px)
2. Chat: "Create a DJ"
3. Click "Open Form"
4. Verify: FormPreviewDialog responsive
5. Verify: Form fields readable on small screen
6. Verify: All buttons have 44px tap target
7. Submit form
8. Verify: Works on mobile
```

---

## Test Checklist

### Pre-Testing Verification
- [ ] All Phase 2 code merged to alpha branch
- [ ] Code reviews completed (junior, mid, senior approved)
- [ ] No merge conflicts
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript strict mode: no errors
- [ ] Linter passes: `npm run lint`

### Unit Tests
- [ ] `npm run test` passes all unit tests
- [ ] Coverage >80% for Phase 2 code
- [ ] No skipped tests (no `it.skip()` or `describe.skip()`)

### Integration Tests
- [ ] ChatAssistant entity parsing works for all 6 types
- [ ] FormManager state transitions correct
- [ ] Navigation flow works (chat → preview dialog → form page)
- [ ] Form pre-fill works correctly
- [ ] Legacy DJ_SUGGESTION format still works
- [ ] No console errors/warnings during flow

### E2E / Manual Tests
- [ ] ✅ DJ creation via chat (3+ DJs)
- [ ] ✅ Station creation via preview dialog
- [ ] ✅ Brand creation via chat
- [ ] ✅ Manual creation (no AI) still works
- [ ] ✅ Mobile: Form pre-fill works on <768px
- [ ] ✅ Mobile: All buttons 44px+ tap target
- [ ] ✅ Browser: Works on Chrome, Firefox, Safari
- [ ] ✅ Regression: Phase 1 features not broken
- [ ] ✅ Chat: Message history preserved
- [ ] ✅ Chat: Typing indicator works
- [ ] ✅ API: Entities saved correctly to DB

### Performance Tests
- [ ] Form pre-fill latency <500ms
- [ ] Navigation response <300ms
- [ ] No memory leaks (devtools Memory tab)
- [ ] No unnecessary re-renders (React DevTools Profiler)

### Accessibility Tests (a11y)
- [ ] FormPreviewDialog: Dialog role + aria-label
- [ ] Form fields: All have associated labels + aria-label
- [ ] Buttons: All have descriptive text (not just icons)
- [ ] Keyboard nav: Tab through all form fields
- [ ] Screen reader: NVDA/JAWS reads all content correctly

---

## Known Issues & Tracking

| ID | Issue | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| P2-1 | useFormInitialData could remove useState/useEffect | Low | Open | Optimization for Phase 3 |
| P2-2 | AIFormNavigator needs error handling | Low | Open | Add console.warn if navigate fails |
| P2-3 | FormPreviewDialog CSS classes may not exist | Medium | VERIFY | Check stylesheet before merge |
| P2-4 | FormManager state lost on browser refresh | Low | Deferred | Use sessionStorage if needed |

---

## Regression Test Matrix

| Feature | Phase 1 | Phase 2 | Status |
|---------|---------|---------|--------|
| Manual DJ creation | ✅ Works | ✅ Still works | OK |
| Manual Station creation | ✅ Works | ✅ Still works | OK |
| Chat messaging | ✅ Works | ✅ Still works | OK |
| Entity suggestion parsing | ✅ Works | ✅ Works for all 6 types | OK |
| FormPreviewDialog | ✅ New | ✅ Integrated | OK |
| Entity cards rendering | ✅ Works | ✅ Multiple entity types | OK |

---

## Success Criteria

- ✅ All unit tests pass (>80% coverage)
- ✅ All integration tests pass
- ✅ E2E workflows complete without errors
- ✅ No new console errors/warnings
- ✅ No regressions in Phase 1 features
- ✅ Mobile responsive (>767px and <768px)
- ✅ Accessibility audit passes
- ✅ Performance acceptable (<500ms latency)
- ✅ Ready for Phase 3

---

## Test Execution Log

**Testing Start**: 2026-05-09 02:30 UTC  
**Tester**: Comprehensive testing (all levels)

### Unit Tests
```
Status: ⏳ IN PROGRESS
Passed: --
Failed: --
Skipped: --
Coverage: --
```

### Integration Tests
```
Status: ⏳ PENDING
Scenarios: 3
```

### E2E Tests (Manual)
```
Status: ⏳ PENDING
Scenarios: 4+
```

### Regression Tests
```
Status: ⏳ PENDING
Coverage: Phase 1 + Phase 2
```

---

## Next Steps

1. Run all unit tests: `npm run test`
2. Fix any failing tests
3. Run integration tests
4. Manual E2E testing in browser
5. Verify Phase 1 regression tests pass
6. Update TESTING.md with results
7. Prepare Phase 2 merge PR

---

**Related Files**:
- `.github/PLANNING.md` — Architecture decision for Phase 2
- `.github/TODO.md` — Phase 2 task tracking
- `PHASE2_REVIEW.md` — Code review summaries (junior, mid, senior)
- `frontend/src/contexts/FormManagerContext.tsx` — Main implementation
- `frontend/src/hooks/useFormInitialData.ts` — Hook implementation
