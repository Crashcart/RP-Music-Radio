# AetherWave — Technical Design Reference (TDR)

**Version**: 1.0.4  
**Classification**: Development Blueprint / Lore-Shard Factory  
**Last Updated**: 2026-04-26  
**Target Environment**: Docker (Linux/Debian) on Synology DS918+ / Beelink S12 Pro  

---

## 1. Project Overview

**AetherWave** is a headless "Media Factory" designed to generate procedural, lore-heavy radio content for game environments. It transforms user-defined seeds (genres, item lists, station vibes) into self-contained **Lore-Shard MP3s**. These files are automatically saved to a host-mapped directory, complete with:
- Embedded album art
- Full lyrics and scripts
- Detailed backstories
- Persistent AI voice signatures
- Market research & brand information

**Key Innovation**: The MP3 file itself becomes the database. All metadata is baked into ID3v2.4 tags, ensuring portability and immutability.

---

## 2. System Architecture

The application is containerized using Docker to ensure easy installation and resource isolation on homelab hardware.

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Tailwind | Spreadsheet-style "Drafting Table" for staging/editing content |
| **Backend API** | FastAPI (Python) | Orchestrates AI calls, manages task queues, handles file I/O |
| **Task Queue** | Celery + Redis | Manages asynchronous generation of audio to prevent UI timeouts |
| **Database** | SQLite (Persistent) | Stores Drafts, Persona DNA (Voices), Lore History |
| **Meta Engine** | Mutagen (Python) | Injects ID3v2.4 tags and album art directly into MP3 binary |
| **I/O Handler** | Host-Volume Mapping | Instantly saves finished files to host machine's file system |

### Architecture Diagram (Conceptual)
```
┌─────────────────────────────────────────────────────────┐
│  USER (Web Browser)                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ React Frontend: "Drafting Table"                  │ │
│  │ - CSV upload / Seed input                         │ │
│  │ - AI flesh-out editing                            │ │
│  │ - Task queue monitor                              │ │
│  └───────────┬───────────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────────┘
               │ HTTP(S)
               ▼
      ┌────────────────┐
      │ FastAPI Server │
      │ (Port 8080)    │
      ├────────────────┤
      │ GET  /drafts   │
      │ POST /ingest   │
      │ PATCH /drafts  │
      │ POST /commit   │
      │ GET  /tasks    │
      └─────┬──────────┘
            │
      ┌─────┴──────┬──────────┬──────────┐
      ▼            ▼          ▼          ▼
   SQLite    Redis Queue  Gemini 3   [Google APIs]
   (Meta)    (Celery)    Lyria 3     Nano Banana 2
             │
             ▼
      ┌─────────────────┐
      │ Celery Worker   │
      │ (Synthesis)     │
      ├─────────────────┤
      │ 1. Call Gemini  │
      │ 2. Call Lyria   │
      │ 3. Call Nano    │
      │ 4. Mutagen tag  │
      │ 5. Save to host │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────────┐
      │ Host Volume Mapping │
      │ radio_vault/        │
      │ ├─ Track_001.mp3    │
      │ ├─ Track_002.mp3    │
      │ └─ ...              │
      └─────────────────────┘
```

---

## 3. AI API Specifications (Google 2026 Suite)

### A. Gemini 3 Flash (The Director) 🎬
**Role**: Lore generation, market research, scriptwriting, Filler Protocol

**Input**:
- User seed (genre, items, station name, mood)
- "Flesh-out" level (Simple → Flavor → Complex)

**Logic**:
- Ingests "Very Basic" user seeds and expands into "Complex" narratives
- Filler Protocol: If data is missing, injects "Procedural Quirks"
- Example quirks: DJ who eats on air, newscaster with speech impediment, etc.

**Market Agent**:
- Researches the utility of game items
- Writes authentic 15-second radio ads
- Examples:
  - Simple: "Buy a Med-Kit. It stops bleeding."
  - Flavor: "Patch-Me-Up 5000. Reliable, sterile, 20% off at the port."
  - Filler: "This station takeover brought to you by Internal Gravity Safety™"

**API Call**:
```python
response = gemini_client.generate_content(
    f"""
    Generate a radio DJ script for:
    Genre: {genre}
    DJ Name: {dj_name}
    Station: {station_name}
    Mood: {mood}
    Items to advertise: {items}
    
    Length: 2-3 minutes of dialogue
    Include backstory, personality quirks, and ad reads.
    """,
    generation_config=GenerationConfig(temperature=0.8)
)
```

---

### B. Lyria 3 Pro (The Musician) 🎵
**Role**: High-fidelity music and vocal synthesis

**Voice DNA (Latent Voice Vectors)**:
- First time a DJ or Artist is created, a "Voice Seed" (UUID string) is stored
- This seed is passed in all future API calls → **Perfect vocal consistency**
- Stored in `persona_db/` (host-mapped directory)

**Output**:
- 48kHz Stereo MP3 with native SynthID watermarking
- ~3-5 minute tracks with intro, dialogue, music beds, outro
- Emotion/inflection matches script context

**API Call**:
```python
response = lyria_client.generate_audio(
    script=dj_script,
    voice_seed=voice_uuid,  # "550e8400-e29b-41d4-a716-446655440000"
    genre=genre,
    tempo=tempo_bpm,
    output_format="mp3",
    sample_rate=48000,
    quality="high"
)
```

**Voice Persistence Example**:
```
Session 1: Create DJ "Vance Rikard"
  → voice_seed = "550e8400-e29b-41d4-a716-446655440000"
  → Generates Track 1 with Vance's voice
  → Stored in persona_db/dj-vance-rikard.json

Session 2: Create new track for Vance
  → Retrieve voice_seed from persona_db
  → Pass to Lyria with same seed
  → Generates Track 2 with IDENTICAL voice (listeners can't tell tracks apart)
```

---

### C. Nano Banana 2 (The Artist) 🎨
**Role**: Visual branding and album covers

**Batch DNA (Style Seed)**:
- Uses a shared "Style Seed" for an entire radio station batch
- Ensures all album art for a station shares:
  - Consistent colors and fonts
  - Shared aesthetic ("vibes")
  - Recognizable branding across all tracks

**Output**:
- 1600x1600 JPG images
- Metadata-embedded with style parameters

**API Call**:
```python
response = nano_client.generate_image(
    prompt=f"Album cover for '{track_title}' on {station_name}",
    style_seed=batch_style_seed,  # Shared for entire station
    mood=mood,
    colors=[color1, color2, color3],
    output_format="jpg",
    resolution="1600x1600"
)
```

---

## 4. The "Lore-Shard" MP3 Schema (ID3v2.4)

AetherWave uses the MP3 header as its primary database. If a file is moved, the lore stays with it.

### ID3v2.4 Tag Mapping

| Tag ID | Field | Content Example |
| :--- | :--- | :--- |
| **TPE1** | Artist/DJ | "Vance Rikard" or "Radio Rick" |
| **TALB** | Station | "Nebula FM 99.8" |
| **TIT2** | Track Title | "Asteroid Blues [Ad: Fusion Core]" |
| **USLT** | Script/Lyrics | Full AI-generated lyrics or the 15s ad script |
| **APIC** | Album Art | 1600x1600 JPG (Nano Banana 2 output) |
| **COMM** | Provenance | "Synthesized via AetherWave Labs. Engines: Lyria-3/Gemini-3/Nano-2." |
| **TXXX** | Lore_Ledger | JSON (see below) |

### Lore_Ledger JSON Schema (TXXX Frame)

```json
{
  "backstory": "Vance Rikard took over Nebula FM 99.8 after the previous DJ was lost to solar radiation...",
  "market_research": "Fusion Cores are essential power sources in the Outer Rim. Prevents reactor meltdown. 20% markup at spacedock.",
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "style_seed": "330e8400-e29b-41d4-a716-446655440000",
  "genre": "synthwave",
  "station": "Nebula FM 99.8",
  "generated_at": "2026-04-26T14:30:00Z",
  "engines": {
    "lore": "Gemini 3 Flash",
    "audio": "Lyria 3 Pro",
    "art": "Nano Banana 2"
  },
  "filler_protocol_applied": false
}
```

### Mutagen Implementation (Python)

```python
from mutagen.id3 import ID3, TIT2, TPE1, TALB, USLT, APIC, COMM, TXXX

# Load existing MP3 or create new tags
audio = ID3(mp3_path)

# Set basic tags
audio['TIT2'] = TIT2(text=[track_title])
audio['TPE1'] = TPE1(text=[artist_name])
audio['TALB'] = TALB(text=[station_name])

# Add lyrics/script
audio['USLT'] = USLT(lang='eng', desc='', text=script_text)

# Add album art
with open(art_path, 'rb') as f:
    audio['APIC'] = APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=f.read())

# Add provenance
audio['COMM'] = COMM(lang='eng', desc='', text=['Synthesized via AetherWave Labs...'])

# Add Lore_Ledger (TXXX frame)
audio['TXXX:Lore_Ledger'] = TXXX(encoding=3, desc='Lore_Ledger', text=[json.dumps(lore_ledger)])

# Save
audio.save(v2_version=4)
```

---

## 5. Core Workflow: Stage & Commit

### **Step 1: Batch Ingestion**
User uploads a CSV of items or a list of names.
- **Endpoint**: `POST /api/v1/ingest`
- **Action**: Populates the "Drafting Table" in the Web UI
- **Input Format**:
  ```csv
  station_name,artist_name,genre,items
  "Nebula FM 99.8","Vance Rikard","synthwave","Fusion Core|Med-Kit|Ammo"
  ```

### **Step 2: AI Flesh-Out (Drafting)**
The AI researches the genre and items, filling in the gaps.
- **Endpoint**: `GET /api/v1/drafts` / `PATCH /api/v1/drafts/{id}`
- **Logic**: 
  - If "None" or "Little" info is provided, Filler Protocol triggers
  - Adds procedural quirks and in-universe brand names
  - User sees results in spreadsheet-like table
- **Editable**: Every text field remains editable before commitment
- **Action**: User refines AI output if needed

### **Step 3: Commitment & Synthesis**
User clicks "Commit". The task is sent to the Celery worker.
- **Endpoint**: `POST /api/v1/commit`
- **Queue Task**:
  1. **Script Gen**: Gemini generates full DJ dialogue + ad reads
  2. **Audio Gen**: Lyria 3 synthesizes track with voice persistence
  3. **Image Gen**: Nano Banana 2 creates album art with batch consistency
  4. **Imprinting**: Mutagen bakes all Lore + Art into ID3 tags
  5. **Persistence**: File moved to mapped host volume (`radio_vault/`)
  6. **Metadata**: MP3 becomes self-contained "lore container"

### **Step 4: Status Monitoring**
User polls for generation status without blocking UI.
- **Endpoint**: `GET /api/v1/tasks/{task_id}`
- **Response**:
  ```json
  {
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "generating_audio",
    "progress": 65,
    "estimated_time_remaining": 120,
    "output_file": "Nebula_FM_99.8_Vance_Rikard_Asteroid_Blues.mp3"
  }
  ```

---

## 6. Docker Implementation

### `docker-compose.yml` (Complete)

```yaml
version: '3.8'

services:
  aetherwave-api:
    image: aetherwave/factory-core:latest
    container_name: aetherwave_api
    build:
      context: .
      dockerfile: Dockerfile.api
    volumes:
      - ./radio_vault:/app/output        # Host mount: generated MP3s
      - ./persona_db:/app/persistence    # Host mount: Voice DNA storage
      - ./market_ingest:/app/input       # Host mount: CSV uploads
      - ./data:/app/data                 # Host mount: SQLite database
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - DEVICE_TYPE=${DEVICE_TYPE:-INTEL_QUICKSYNC}
      - AUTO_NAME_FORMAT=${AUTO_NAME_FORMAT:-{STATION}_{ARTIST}_{TRACK}.mp3}
      - FILLER_ENABLED=${FILLER_ENABLED:-true}
      - REDIS_URL=${REDIS_URL:-redis://redis:6379/0}
      - DATABASE_URL=${DATABASE_URL:-sqlite:////app/data/aetherwave.db}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - API_PORT=${API_PORT:-8000}
      - API_HOST=${API_HOST:-0.0.0.0}
    ports:
      - "8080:8000"
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  aetherwave-worker:
    image: aetherwave/factory-worker:latest
    container_name: aetherwave_worker
    build:
      context: .
      dockerfile: Dockerfile.worker
    volumes:
      - ./radio_vault:/app/output
      - ./persona_db:/app/persistence
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - DEVICE_TYPE=${DEVICE_TYPE:-INTEL_QUICKSYNC}
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=sqlite:////app/data/aetherwave.db
      - LOG_LEVEL=INFO
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  redis:
    image: redis:7-alpine
    container_name: aetherwave_redis
    ports:
      - "6379:6379"
    volumes:
      - ./redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:

networks:
  default:
    name: aetherwave_network
```

### `.env.example`

```bash
# Google Cloud API
GOOGLE_API_KEY=your-api-key-here

# Hardware Configuration
# Options: INTEL_QUICKSYNC, NVIDIA_CUDA, CPU_ONLY
DEVICE_TYPE=INTEL_QUICKSYNC

# MP3 Naming Convention
AUTO_NAME_FORMAT={STATION}_{ARTIST}_{TRACK}.mp3

# Feature Flags
FILLER_ENABLED=true

# Redis & Database URLs
REDIS_URL=redis://redis:6379/0
DATABASE_URL=sqlite:////app/data/aetherwave.db

# Logging
LOG_LEVEL=INFO

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
```

---

## 7. Additional Logic Modules

### The "Market Research" Ad Logic

**Simple Mode**:
```
Input: "Med-Kit"
Output: "Buy a Med-Kit. It stops bleeding."
```

**Flavor Mode** (with in-universe branding):
```
Input: "Med-Kit"
Output: "The Patch-Me-Up 5000. Reliable, sterile, and 20% off at the port."
```

**Filler Mode** (when no item provided):
- "Internal Gravity Safety PSA" (random safety announcement)
- "Station Takeover" (DJ guest interview)
- "Sponsor Spotlight" (fictional brand promo)

### The Persistence Layer

DJs and Artists "Remember" their history.

**Memory Check Flow**:
```
1. Before script is written, Gemini reads persona_db
2. Retrieves: habits, rivals, history, previous themes
3. Incorporates into new script automatically

Example:
  Previous: "Vance always clicks his pen during silence"
  New Script: "...long pause... *click click click* ...sorry, bad habit"
```

**Persona Database** (persona_db/dj-vance-rikard.json):
```json
{
  "persona_id": "dj-vance-rikard",
  "voice_seed": "550e8400-e29b-41d4-a716-446655440000",
  "type": "DJ",
  "backstory": "Former asteroid miner, now Nebula FM host",
  "habits": [
    "clicks pen during silence",
    "laughs at own jokes (even bad ones)",
    "references previous tracks"
  ],
  "rivals": ["DJ Static"],
  "history": [
    "Track 001: Asteroid Blues",
    "Track 002: Solar Winds"
  ],
  "total_tracks_generated": 2,
  "created_at": "2026-04-20T10:00:00Z",
  "last_updated": "2026-04-26T14:30:00Z"
}
```

---

## 8. Setup Instructions for Creator

### Prerequisites
- Docker & Docker Compose installed
- Google Cloud API key (Gemini, Lyria, Nano access)
- 4-8 GB available RAM (recommended)
- 50 GB free disk space (for generated MP3s + model cache)

### Step 1: Clone & Configure
```bash
git clone https://github.com/crashcart/rp-music-radio.git
cd rp-music-radio
cp .env.example .env
# Edit .env with your Google API key
```

### Step 2: Create Host Volumes
```bash
mkdir -p radio_vault persona_db market_ingest
```

### Step 3: Launch Docker Stack
```bash
docker-compose up -d
# Wait for all services to become healthy
docker-compose ps
```

### Step 4: Verify API Health
```bash
curl http://localhost:8080/health
# Expected response: {"status": "healthy", "services": {...}}
```

### Step 5: Access Frontend
```
Open browser: http://localhost:8080
Upload first "Market Manifest" or "Station Seed"
```

### Step 6: Generate First MP3
1. Upload CSV or seed list
2. Review AI "flesh-out" in Drafting Table
3. Click "Commit"
4. Monitor generation in Task Queue
5. Finished MP3 appears in `radio_vault/` directory

---

## 9. Performance Metrics & Constraints

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **MP3 Generation Time** | 3-5 min | Includes AI synthesis (Gemini, Lyria, Nano) |
| **Memory Usage** | 2-4 GB | Worker process during synthesis |
| **API Rate Limit** | 60 req/min | Per Google Cloud project (configurable) |
| **MP3 File Size** | 8-15 MB | Depends on track length and quality |
| **Database Size** | <1 GB | Even with 1000+ tracks stored as metadata |
| **Concurrent Requests** | 1-5 (MVP) | Limited by API rate limits; scale with Redis queue |

---

## 10. Roadmap & Future Extensions

### MVP (Phase 1-5, June 2026)
- ✅ Single-user drafting & synthesis
- ✅ Persistent voice signatures
- ✅ Full Lore-Shard MP3 output
- ✅ Docker deployment

### Phase 6+ (Post-MVP)
- [ ] Multi-user authentication (OAuth + JWT)
- [ ] PostgreSQL for scaling
- [ ] Batch generation with scheduling
- [ ] Advanced voice fine-tuning UI
- [ ] Game engine integrations (direct file injection)
- [ ] Audio post-processing effects
- [ ] Advanced market research (longer commercials, jingles)
- [ ] Community content marketplace

---

## References & Attribution

- **ID3v2.4 Specification**: https://id3.org/id3v2.4.0-structure
- **Mutagen Documentation**: https://mutagen.readthedocs.io/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Celery**: https://docs.celeryproject.org/
- **Docker Compose**: https://docs.docker.com/compose/

---

## Questions, Feedback, Issues?

Post in the GitHub Issues tab or contact the development team via `.github/PLANNING.md`.

**TDR Document Status**: FINAL (v1.0.4)  
**Last Reviewed**: 2026-04-26
