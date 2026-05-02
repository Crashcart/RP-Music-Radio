# UX Checklist — Art System & Feature Reviews

**Last Updated**: 2026-05-02  
**Focus Areas**: Station Art, DJ Portraits, Album Art, Regeneration UX

---

## Station Art UX ✅

### Display
- [x] Prominent card layout (not hidden in tabs)
- [x] Full-width image display
- [x] Minimum height for visual impact (200px)
- [x] Rounded corners for polish
- [x] Alt text for accessibility

### Regeneration
- [x] Clear "🔄 Regenerate" button
- [x] Loading state ("⏳ Generating...") during API call
- [x] Button disabled while generating (prevent double-clicks)
- [x] Success feedback (auto-refresh shows new art)
- [x] Error handling (user-friendly message)
- [x] Position: Right side of card header (easy to find)

### Empty State
- [x] Placeholder when no art exists
- [x] Clear guidance: "No station art yet. Click 'Regenerate' to create one."
- [x] Consistent with brand (same card styling)

---

## DJ Portrait UX ✅

### Display
- [x] Card grid layout (consistent with entity cards)
- [x] Portrait centered in card
- [x] Placeholder emoji (🎙️) when no portrait
- [x] Name and type displayed below
- [x] Tags for additional info (e.g., speaking style)

### Regeneration
- [x] Hover-over button (less intrusive than always-visible)
- [x] Icon-only button (🔄) with tooltip
- [x] Loading state (⏳) during generation
- [x] Semi-transparent background for visibility
- [x] Smooth fade-in on hover
- [x] Position: Top-right corner of portrait (standard)
- [x] Min height: 44px (accessible tap target on mobile)

### Interaction
- [x] One-click regeneration (no confirmation dialog needed for art)
- [x] Immediate visual feedback
- [x] Auto-refresh updates card with new portrait
- [x] Per-DJ state tracking (doesn't block other DJs)

---

## Brand Logo UX 📋

### Status
- [ ] API endpoint not yet implemented
- [ ] UI components ready (same as DJ cards)
- [ ] Regeneration button placeholder ready

### Next Implementation
- [ ] Add `POST /api/v1/brands/{brand_id}/logo` endpoint
- [ ] Wire up regeneration handler
- [ ] Test end-to-end

---

## Album Art UX 📋

### GenerationQueue Display
- [ ] Album art thumbnail next to progress bar
- [ ] Dimensions: ~80x80px (doesn't overwhelm UI)
- [ ] Fallback emoji (💿) when generating or missing
- [ ] Linked to completed track in radio vault

### Regeneration
- [ ] Per-track regenerate button (after completion)
- [ ] Opens modal/panel to view full cover + regenerate
- [ ] Re-gen without re-synthesizing audio

### Next Implementation
- [ ] Add album art to synthesis pipeline
- [ ] Update GenerationQueue to fetch and display art
- [ ] Create completed tracks gallery/archive

---

## Mobile UX ✅

### Responsive Layout
- [x] Station Art: Full-width responsive
- [x] DJ Portraits: Grid adapts to screen size (2-4 cols)
- [x] Buttons: Min 44px tap target (WCAG AA)
- [x] Touch-friendly spacing (var(--space-sm) gaps)

### Touch Interactions
- [x] Hover states still visible (browsers show on first tap)
- [x] No hover-only critical controls
- [x] Long-press not required (single tap to regenerate)

### Viewport Testing
- [ ] Small phone (375px): All cards visible, no truncation
- [ ] Tablet (768px): Grid layout shift
- [ ] Desktop (1024px+): Full multi-column layout

---

## Accessibility (A11y) ✅

### Semantic HTML
- [x] Card wrappers use `<div class="card">`
- [x] Buttons are `<button>` elements (not divs)
- [x] Images have alt text (e.g., alt="Station Name")
- [x] Section headers are `<h3>` (proper hierarchy)

### Keyboard Navigation
- [x] All buttons focusable (Tab key)
- [x] Regenerate buttons have visible focus ring
- [x] No keyboard traps
- [x] Enter/Space activates buttons

### Screen Readers
- [x] Button labels: "🔄 Regenerate", "Regenerate portrait"
- [x] Images: Descriptive alt text
- [x] Cards: Wrapped in sections with aria-label
- [x] Loading state: "⏳ Generating..." (conveyed to SR)

### Color Contrast
- [x] Station art card text: Black on white background
- [x] Regenerate button: White text on dark background (0.7 opacity)
- [x] Loading state emoji: High contrast (⏳)

---

## Error Handling UX ✅

### API Failures
- [x] User-friendly error messages (not technical)
- [x] Suggest action: "Check your API key in Settings"
- [x] Non-blocking (error doesn't crash page)
- [x] Button returns to normal state after error

### Timeout/Network Errors
- [ ] Implement retry logic (if API call times out)
- [ ] "Connection lost" message
- [ ] Retry button visible

---

## Feedback & Confirmation ✅

### Visual Feedback
- [x] Loading indicator (⏳) during generation
- [x] Button disabled state (prevents double-click)
- [x] Auto-refresh on success (instant visual update)
- [x] Error alert (clear message)

### No Unnecessary Confirmations
- [x] Regeneration doesn't need "Are you sure?" dialog
  - Reason: Non-destructive, reversible, quick
  - User can regenerate again if unhappy

---

## Design Polish ✅

### Spacing
- [x] Card margins: `var(--space-xl)` between sections
- [x] Internal padding: `var(--space-md)` within cards
- [x] Button gaps: `var(--space-sm)`
- [ ] Adjust if text overlaps images

### Typography
- [x] Section headers: Bold, larger font (h3)
- [x] Subheaders: Smaller, secondary color
- [x] Metadata: `.entity-card-sub` class for consistency

### Icons & Emojis
- [x] Station art: 🎨 (palette emoji)
- [x] Regenerate: 🔄 (circular arrows)
- [x] Loading: ⏳ (hourglass)
- [x] DJ: 🎙️ (microphone)
- [x] Album: 💿 (disc)
- [ ] Ensure emoji consistency across all browsers

### Transitions
- [x] Button hover: Opacity change (smooth)
- [x] Image loading: No jarring layout shift
- [ ] Add fade-in animation for newly loaded images?

---

## Performance UX

### Image Optimization
- [x] Art stored at appropriate resolution (1024x1024 for station, 512x512 for DJ)
- [x] Thumbnail generation for queue (80x80)
- [ ] Lazy loading for images below fold?
- [ ] WebP support (if browser allows)?

### Loading States
- [x] Button shows "⏳ Generating..." (not frozen)
- [x] UI remains responsive (non-blocking API calls)
- [x] Estimated time to completion? (Optional, not in scope)

---

## Future Enhancements

### Phase 2: Advanced Art UX
- [ ] Art style selector (cyberpunk, watercolor, realistic, etc.)
- [ ] Custom art upload (user brings own image)
- [ ] Art edit/crop tool
- [ ] Batch regenerate (all DJs at once)
- [ ] Undo/undo-history for art changes

### Phase 3: Social Sharing
- [ ] "Share station art" button
- [ ] Download art as image file
- [ ] Art gallery view (all generated art in one place)

### Phase 4: AI Art Customization
- [ ] "Adjust style" prompt (darker, brighter, more detailed, etc.)
- [ ] Gemini chat integration ("Make the DJ look more cyberpunk")
- [ ] Style consistency editor (ensure all art matches station theme)

---

## Summary

### ✅ Complete
- Station art display + regeneration
- DJ portrait display + regeneration
- Mobile responsive layout
- Accessibility & keyboard navigation
- Error handling & user feedback

### 📋 Pending (Lower Priority)
- Brand logo API + UI
- Album art in synthesis pipeline + queue display
- Retry logic for failed art generation
- Fade-in animation for images
- Style selector & custom uploads

### 🎯 Recommended Next
1. Test art generation end-to-end with real API key
2. Mobile testing on actual devices (not just DevTools)
3. Accessibility audit with WAVE or Axe tools
4. User feedback on regeneration button visibility/placement
5. Implement brand logo endpoint

---

**Status**: Ready for UAT (User Acceptance Testing)  
**Blockers**: None (API fallback to no-regenerate state)  
**User Ready**: Yes — Can create stations & DJs, regenerate art if key set
