# Phase 2: Brand Logos & Album Art Generation

**Status**: Planning  
**Branch**: `claude/brand-logos-album-art-w1KTY`  
**Last Updated**: 2026-05-02

---

## Overview

Phase 2 extends the art system to cover **Brand Logos** and **Album Art** with full generation, display, and regeneration workflows.

### Phase 1 Complete ✅
- Station art display + regeneration
- DJ portrait display + regeneration
- Mobile responsive UI (44px tap targets)
- Accessibility & keyboard navigation
- Governance documentation (PLANNING.md, UX_CHECKLIST.md, ART_SYSTEM.md)

### Phase 2 Scope 📋
1. **Brand Logo Generation**: `POST /api/v1/brands/{brand_id}/logo`
2. **Album Art in Synthesis**: Generate track covers during `POST /api/v1/drafts/{draft_id}/commit`
3. **Album Art Display**: GenerationQueue shows art thumbnails for in-progress & completed tracks
4. **Per-Track Regeneration**: Re-gen art without re-synthesizing audio

---

## Backend Tasks

### Brand Logo Endpoint

**File**: `backend/app/api/v1/routes.py`

```python
@router.post("/brands/{brand_id}/logo")
async def regenerate_brand_logo(brand_id: str, db: Session = Depends(get_db)):
    """Generate or regenerate brand logo via Nano Banana 2."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Call ArtGenerator with brand context
    art_gen = ArtGenerator(api_key=os.getenv("GOOGLE_API_KEY"))
    prompt = f"Logo for '{brand.name}' — {brand.industry}, {brand.tagline}"
    
    try:
        logo_path = await art_gen.generate_image(
            prompt=prompt,
            style_seed=brand.style_seed,
            dimensions="512x512"
        )
        brand.logo_path = logo_path
        brand.updated_at = datetime.utcnow()
        db.commit()
        return BrandResponse.from_orm(brand)
    except Exception as e:
        logger.error(f"Brand logo generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

**Database**: Extend Brand model with `logo_path: str = None`

### Album Art in Synthesis Pipeline

**File**: `backend/app/tasks/synthesis.py`

Modify the synthesis task to generate album art after audio synthesis:

```python
@celery_app.task(name="synthesis_task", bind=True)
def synthesis_task(self, draft_id: str, ...):
    # ... existing audio synthesis code ...
    
    # After audio synthesis succeeds:
    art_gen = ArtGenerator(api_key=os.getenv("GOOGLE_API_KEY"))
    prompt = f"Album cover for '{track.title}' by {artist.name}, {track.genre}"
    
    try:
        album_art_path = await art_gen.generate_image(
            prompt=prompt,
            style_seed=artist.voice_seed,
            dimensions="500x500"
        )
        # Store in GenerationHistory
        gen_history.art_path = album_art_path
        db.commit()
    except Exception as e:
        logger.warning(f"Album art generation failed, continuing: {e}")
        # Don't fail synthesis if art fails
```

### Database Schema

**Brand Model Update**:
```python
class Brand(Base):
    # ... existing fields ...
    logo_path: str = Column(String, nullable=True)
```

**GenerationHistory Model Update**:
```python
class GenerationHistory(Base):
    # ... existing fields ...
    art_path: str = Column(String, nullable=True)
```

---

## Frontend Tasks

### Brand Logo Display

**File**: `frontend/src/pages/Artists.tsx`

Update Brand cards with logo display and regenerate button:

```tsx
{brands.map(brand => (
  <div key={brand.id} className="card">
    {/* Logo Display */}
    <div className="card-image-wrapper">
      {brand.logo_path ? (
        <img src={brand.logo_path} alt={`${brand.name} logo`} />
      ) : (
        <div className="placeholder">🏢</div>
      )}
      
      {/* Regenerate Button (Hover) */}
      <button
        className="card-image-button"
        onClick={() => handleGenerateLogo(brand.id)}
        disabled={generatingLogo === brand.id}
        title="Regenerate logo"
      >
        {generatingLogo === brand.id ? "⏳" : "🔄"}
      </button>
    </div>
    
    {/* Brand Info */}
    <div className="card-content">
      <h3>{brand.name}</h3>
      <p>{brand.industry}</p>
    </div>
  </div>
))}
```

### Album Art in GenerationQueue

**File**: `frontend/src/pages/GenerationQueue.tsx`

Update queue display to show art thumbnails:

```tsx
{queueItems.map(item => (
  <div key={item.id} className="queue-item">
    {/* Album Art Thumbnail */}
    <div className="queue-item-art">
      {item.art_path ? (
        <img src={item.art_path} alt="Album art" style={{width: '80px', height: '80px'}} />
      ) : item.status === 'completed' ? (
        <div className="placeholder">💿</div>
      ) : (
        <div className="placeholder loading">⏳</div>
      )}
    </div>
    
    {/* Progress & Info */}
    <div className="queue-item-details">
      <h4>{item.title}</h4>
      <p>{item.artist}</p>
      
      {item.status === 'completed' && (
        <button onClick={() => handleRegenerateArt(item.id)}>
          Regenerate Art
        </button>
      )}
    </div>
  </div>
))}
```

---

## API Endpoints

### Brand Logo Generation
```
POST /api/v1/brands/{brand_id}/logo

Response:
{
  "id": "brand-123",
  "name": "Nebula Corp",
  "logo_path": "/art/brands/brand-123.png",
  "updated_at": "2026-05-02T14:30:00Z"
}
```

### Album Art Per-Track Regeneration
```
POST /api/v1/drafts/{draft_id}/art/{track_index}

Response:
{
  "draft_id": "draft-456",
  "track_index": 0,
  "title": "Synthwave Dreams",
  "art_path": "/art/tracks/draft-456/0.png"
}
```

---

## Rate Limiting & Cost Ceiling

- **Brand logo**: 5 regenerations per station per day
- **Album art**: 10 regenerations per draft per day
- **Daily cost ceiling**: Enforced via `AI_COST_CEILING_CENTS` env var
- **Return 429** if daily limit exceeded

---

## Testing Checklist

### Brand Logo
- [ ] Logo generation triggers without error
- [ ] Logo displays in brand card
- [ ] Regenerate button works (loading state, then refresh)
- [ ] Error handling (e.g., API down) shows user message
- [ ] Mobile layout: logo scales to fit 2-4 column grid
- [ ] Keyboard nav: Tab to button, Enter to regenerate
- [ ] Screen reader: Announces "Regenerate logo"

### Album Art
- [ ] Album art generated during synthesis (synthesis completes OK)
- [ ] Art displays in GenerationQueue for completed tracks
- [ ] Per-track regenerate works (re-gen art without audio)
- [ ] Thumbnail (80x80) displays without layout shift
- [ ] Fallback emoji (💿) shows when missing/generating
- [ ] Mobile: queue items stack vertically with thumbnails
- [ ] Keyboard nav: all buttons focusable
- [ ] Screen reader: announces progress and art updates

### Accessibility
- [ ] Keyboard-only navigation (no mouse)
- [ ] Screen reader test (VoiceOver/NVDA)
- [ ] Color contrast: Check with Lighthouse
- [ ] Mobile tap targets: All ≥44px

---

## Documentation Updates

- [ ] Update ART_SYSTEM.md (add brand logo + album art endpoints)
- [ ] Update UX_CHECKLIST.md (completed tracks gallery)
- [ ] Update PLANNING.md (Phase 2 architecture decisions)
- [ ] Update TODO.md (mark Phase 2 tasks)

---

## Success Criteria (Must Complete)

✅ **Core Functionality**
- Brand logo generation via `POST /api/v1/brands/{brand_id}/logo`
- Album art generation during synthesis pipeline
- Album art display in GenerationQueue with 80x80 thumbnails
- Per-track regeneration without re-synthesizing

✅ **UX & Accessibility**
- Brand logo regenerate button (hover-over 🔄)
- Loading states (⏳) during generation
- Error messages (user-friendly, actionable)
- Mobile responsive (<768px, ≥768px)
- Keyboard navigation (Tab, Enter)
- Screen reader support (aria-label, aria-live)

✅ **Rate Limiting & Safety**
- Rate limiting enforced (5/day brands, 10/day tracks)
- Cost ceiling checked on each request
- 429 response when limits exceeded

✅ **Documentation & Governance**
- All changes documented in `.github/` files
- PLANNING.md updated with Phase 2 decisions
- TODO.md updated with completion status

---

**Owner**: Frontend + Backend teams  
**Estimated Duration**: 2-3 days  
**Depends On**: Phase 1 (completed ✅)
