# Art System — AetherWave UI & API

**Status**: UI Complete, API endpoints implemented (regeneration ready)

---

## Art Display Hierarchy

### 1. **Station Art** 🎨
- **Display**: Prominent card on Station Detail page
- **Field**: `Station.art_path`
- **Generation**: `POST /api/v1/stations/{station_id}/art`
- **Regeneration**: ✅ Implemented — "🔄 Regenerate" button with loading state
- **Placeholder**: Shows "No station art yet. Click Regenerate to create one."

### 2. **DJ/Artist Portrait** 🎙️
- **Display**: Card view on Station Detail, DJ gallery
- **Field**: `Artist.portrait_path`
- **Generation**: `POST /api/v1/artists/{artist_id}/portrait`
- **Regeneration**: ✅ Implemented — Hover-over 🔄 button on portrait
- **Placeholder**: Shows 🎙️ emoji when no portrait exists

### 3. **Brand Logo** 🏢
- **Display**: Brands gallery (Artists.tsx)
- **Field**: `Brand.logo_path`
- **Generation**: Endpoint needed — `POST /api/v1/brands/{brand_id}/logo`
- **Status**: UI placeholder ready, API pending

### 4. **Album Art / Track Cover** 💿
- **Display**: GenerationQueue completed tracks section
- **Field**: `GenerationHistory.art_path`
- **Generation**: Endpoint needed — `POST /api/v1/drafts/{draft_id}/commit` (includes art gen)
- **Status**: UI framework ready, API integration pending

---

## API Endpoints Status

### ✅ Implemented
```bash
POST /api/v1/stations/{station_id}/art
  → Generates station logo/art via Nano Banana 2

POST /api/v1/artists/{artist_id}/portrait
  → Generates DJ/artist portrait via Nano Banana 2
```

### 📋 Pending (To Be Implemented)
```bash
POST /api/v1/brands/{brand_id}/logo
  → Generate brand logo

POST /api/v1/drafts/{draft_id}/art
  → Generate album art for track during synthesis

POST /api/v1/artists/{artist_id}/portrait/regenerate
  → Force regenerate without changing artist

POST /api/v1/stations/{station_id}/art/regenerate
  → Force regenerate without changing station
```

---

## Frontend Components Updated

### Stations.tsx
- **Station Art Card**: Prominent display + regenerate button
- **DJ Portraits**: Hover-over regenerate button on each DJ card
- **State Management**: 
  - `generatingPortrait` — tracks which DJ is being rendered
  - `genArt` — tracks station art generation

### Artists.tsx (Next)
- **Brand Logo Display**: Similar card layout to DJs
- **Regeneration**: Hover-over button (pending Brand API)

### GenerationQueue.tsx (Next)
- **Album Art Display**: Show generated track cover alongside progress
- **Completed Tracks**: Display output file + album art thumbnail

---

## User Workflow

### Current ✅
1. Create Station → Station Art card shows → Click "🔄 Regenerate" to create art
2. Create/Approve DJ → DJ card shows portrait → Hover and click 🔄 to regenerate
3. System generates art via Google Nano Banana 2 API

### Next (Pending API)
1. Commit draft for track generation → Synthesis pipeline includes art generation
2. View GenerationQueue → See album art thumbnail for each track
3. Click regenerate on track → Re-gen art without re-generating audio

---

## Art Generation Parameters

### Station Art
```python
ArtGenerator(
  prompt=f"Station logo for '{station.name}' — {station.genre} radio, {station.style_seed}",
  style_seed=station.style_seed,
  dimensions="1024x1024"
)
```

### DJ Portrait
```python
ArtGenerator(
  prompt=f"Portrait of {artist.name}: {artist.appearance}, {artist.personality}",
  style_seed=artist.voice_seed,  # Consistent seed for visual identity
  dimensions="512x512"
)
```

### Album Art (Pending)
```python
ArtGenerator(
  prompt=f"Album cover for '{track_title}' by {artist.name}, {genre} style",
  style_seed=artist.voice_seed,
  dimensions="500x500"
)
```

---

## File Storage

Art is saved to:
- **Local**: `/app/output/art/` (Docker volume)
- **Paths Stored**: In DB (Station.art_path, Artist.portrait_path, Brand.logo_path)
- **URLs**: Served via FastAPI static file routes (when configured)

---

## Next Steps

1. **Implement Brand Logo Generation**
   - Add endpoint: `POST /api/v1/brands/{brand_id}/logo`
   - Update Brands.tsx UI with regenerate buttons

2. **Implement Album Art Generation**
   - Add endpoint: `POST /api/v1/drafts/{draft_id}/commit` (include art in synthesis)
   - Update GenerationQueue.tsx to display art thumbnails
   - Create completed tracks gallery

3. **Art Customization (Future)**
   - Allow users to upload custom art
   - Manual art editing before publication
   - Art style selection (cyberpunk, realistic, watercolor, etc.)

4. **Batch Art Operations**
   - Regenerate all art for a station
   - Bulk portrait generation for multiple DJs
   - Consistent style across station (shared style_seed)

---

## Testing Art Generation

To test locally (requires GOOGLE_API_KEY):

```bash
# 1. Set API key in Settings
# 2. Create a station
# 3. Click "🔄 Regenerate" on Station Art card
# 4. Wait for Nano Banana 2 to generate (~5-10 seconds)
# 5. Check browser DevTools → Network tab for `/api/v1/stations/{id}/art` POST
# 6. Verify response includes art_path URL
# 7. Station art should display in card

# Repeat for DJs:
# 8. Hover over DJ card portrait
# 9. Click 🔄 button
# 10. Portrait should regenerate
```

---

**Last Updated**: 2026-05-02  
**Owner**: UI/Frontend Team  
**Tracked in**: `.github/TODO.md`
