# AetherWave Development Roadmap

## Features in Progress

### ✅ Chat-to-Form Entity Creation Workflow
- Stage endpoints for universes, stations, artists, brands, jingles, drafts
- Form pre-fill from AI-generated suggestions via FormManagerContext
- Data-field tagging per CLAUDE.md contract for AI-targeting
- AI-review banners and visual feedback for staged entities
- **Status**: Core infrastructure complete, integration testing pending

## Upcoming Features

### 🎨 Artwork History & Refresh Management
**Priority**: High  
**Description**: Implement artwork refresh capability with history tracking

**Requirements**:
- Add recycle icon (🔄) to refresh buttons on all artwork (Stations, Artists, Brands, Universes)
- Keep history of up to 10 generated artwork images
- Allow users to revert to previous artwork versions from history
- When reaching 10th image limit:
  - Warn user that oldest image will be deleted
  - Remove oldest image from history (FIFO tourniquet)
  - Allow selecting from remaining 9 + new image
- Implement across all entities with artwork:
  - **Station**: Station art
  - **Universe**: Universe art
  - **Artist**: Artist portrait
  - **Brand**: Brand artwork (if applicable)

**Implementation Plan**:
1. Add `art_history` JSON field to Station, Artist, Brand, Universe models
   - Store up to 10 paths: `[{path: "...", created_at: "..."}, ...]`
2. Create API endpoints:
   - `GET /api/v1/{entity}/{id}/art-history` - List artwork history
   - `POST /api/v1/{entity}/{id}/art/revert/{index}` - Revert to previous art
   - Update `POST /api/v1/{entity}/{id}/art/regenerate` to append to history
3. Update frontend components:
   - Add history dropdown/carousel in art display sections
   - Show "Image 3 of 10" counter when history exists
   - Warn user when reaching 10th image limit
   - Add revert buttons to browse and select from history

**Database Impact**:
- Migration needed to add `art_history` JSON column to Station, Artist, Brand, Universe
- Default to empty array for existing records

**UI Changes**:
- Show history count: "🖼️ 3/10" badge on art sections
- Add back/forward navigation buttons when history exists
- Visual timeline or list of previous artwork

---

## Completed Features

### ✅ Form Field AI-Targeting Contract
- All form fields tagged with `data-field`, `data-section`, `data-type` attributes
- Support for pre-filling forms from AI suggestions
- Proper form validation and error handling
- AI-review banners for user confirmation

### ✅ Stage Endpoints
- Universe staging: `/api/v1/universes/staged`
- Station staging: `/api/v1/stations/staged`
- Artist staging: `/api/v1/artists/staged`
- Brand staging: `/api/v1/brands/staged`
- Jingle staging: `/api/v1/jingles/staged`
- Draft staging: `/api/v1/drafts/staged`

### ✅ Rate Limiting
- Redis-backed rate limiting on stage operations
- 20 entities per hour per requester
- Proper 429 error handling on frontend

---

## Known Issues & Gaps

- Draft UI: No form component exists for reviewing and confirming staged drafts
  - Currently only simple CSV upload and inline table editing
  - Need dedicated draft creation/review form
  
---

## Testing Checklist

- [ ] End-to-end chat-to-form workflow (chat → stage → form pre-fill → submit → entity visible)
- [ ] Art history tracking persists correctly
- [ ] Revert to previous art works without data loss
- [ ] 10-image limit warning appears and oldest image is purged
- [ ] Forms show AI-generated data with review banner
- [ ] Data-field mapping works for all entity types
- [ ] Rate limiting properly blocks excess requests

