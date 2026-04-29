"""
API v1 Router — all core endpoints.

Entities:
  Stations  — CRUD + art generation
  Artists   — CRUD + portrait generation
  Brands    — CRUD + logo generation
  Jingles   — CRUD + audio generation
  Drafts    — Ingest, list, edit, commit
  Tasks     — Poll generation status
  Settings  — API key configuration
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from sqlalchemy.orm import Session  # type: ignore

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.database import (
    Artist,
    Brand,
    Draft,
    GenerationHistory,
    Jingle,
    Station,
)
from app.api.v1.schemas import (
    ApiKeyRequest,
    ApiKeyResponse,
    ArtistCreate,
    ArtistOut,
    ArtistUpdate,
    BrandCreate,
    BrandOut,
    BrandUpdate,
    CommitRequest,
    CommitResponse,
    DraftListResponse,
    DraftOut,
    DraftUpdate,
    IngestRequest,
    IngestResponse,
    JingleCreate,
    JingleOut,
    StationCreate,
    StationOut,
    StationUpdate,
    TaskStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["v1"])


# ═══════════════════════════════════════════════════════════════════
#  Stations
# ═══════════════════════════════════════════════════════════════════

@router.post("/stations", response_model=StationOut)
def create_station(payload: StationCreate, db: Session = Depends(get_db)):
    """Create a new radio station."""
    station = Station(**payload.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    logger.info("Created station: %s", station.name)
    return StationOut.model_validate(station)


@router.get("/stations", response_model=list[StationOut])
def list_stations(db: Session = Depends(get_db)):
    """List all stations."""
    stations = db.query(Station).order_by(Station.created_at.desc()).all()
    return [StationOut.model_validate(s) for s in stations]


@router.get("/stations/{station_id}", response_model=StationOut)
def get_station(station_id: str, db: Session = Depends(get_db)):
    """Get a single station by ID."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(404, "Station not found")
    return StationOut.model_validate(station)


@router.patch("/stations/{station_id}", response_model=StationOut)
def update_station(station_id: str, payload: StationUpdate, db: Session = Depends(get_db)):
    """Update a station's details."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(404, "Station not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(station, field, value)
    station.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(station)
    return StationOut.model_validate(station)


@router.delete("/stations/{station_id}")
def delete_station(station_id: str, db: Session = Depends(get_db)):
    """Delete a station."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(404, "Station not found")
    db.delete(station)
    db.commit()
    return {"deleted": station_id}


@router.post("/stations/{station_id}/art")
def generate_station_art(station_id: str, db: Session = Depends(get_db)):
    """Generate station logo art via Imagen."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(404, "Station not found")
    try:
        from app.utils.art_generator import ArtGenerator, ArtType
        from app.utils.dna_manager import DNAManager
        dna = DNAManager()
        station_style = dna.get_or_create_station(station.name, mood=station.mood)
        art_gen = ArtGenerator()
        art_path = art_gen.generate(ArtType.STATION_LOGO, station=station_style)
        if art_path:
            station.art_path = str(art_path)
            db.commit()
            return {"art_path": str(art_path)}
        raise HTTPException(500, "Art generation failed")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Station art generation failed: %s", exc)
        raise HTTPException(500, f"Art generation error: {exc}")


# ═══════════════════════════════════════════════════════════════════
#  Artists / DJs
# ═══════════════════════════════════════════════════════════════════

@router.post("/artists", response_model=ArtistOut)
def create_artist(payload: ArtistCreate, db: Session = Depends(get_db)):
    """Create a new artist or DJ."""
    artist = Artist(**payload.model_dump())
    db.add(artist)
    db.commit()
    db.refresh(artist)
    logger.info("Created artist: %s", artist.name)
    return ArtistOut.model_validate(artist)


@router.get("/artists", response_model=list[ArtistOut])
def list_artists(station_id: str | None = None, db: Session = Depends(get_db)):
    """List all artists, optionally filtered by station."""
    query = db.query(Artist)
    if station_id:
        query = query.filter(Artist.station_id == station_id)
    artists = query.order_by(Artist.created_at.desc()).all()
    return [ArtistOut.model_validate(a) for a in artists]


@router.get("/artists/{artist_id}", response_model=ArtistOut)
def get_artist(artist_id: str, db: Session = Depends(get_db)):
    """Get a single artist by ID."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(404, "Artist not found")
    return ArtistOut.model_validate(artist)


@router.patch("/artists/{artist_id}", response_model=ArtistOut)
def update_artist(artist_id: str, payload: ArtistUpdate, db: Session = Depends(get_db)):
    """Update an artist's details."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(404, "Artist not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(artist, field, value)
    artist.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(artist)
    return ArtistOut.model_validate(artist)


@router.delete("/artists/{artist_id}")
def delete_artist(artist_id: str, db: Session = Depends(get_db)):
    """Delete an artist."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(404, "Artist not found")
    db.delete(artist)
    db.commit()
    return {"deleted": artist_id}


@router.post("/artists/{artist_id}/portrait")
def generate_artist_portrait(artist_id: str, db: Session = Depends(get_db)):
    """Generate an AI portrait from the artist's bio and appearance."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(404, "Artist not found")
    try:
        from app.utils.art_generator import ArtGenerator, ArtType
        from app.utils.dna_manager import DNAManager
        dna = DNAManager()
        persona = dna.get_or_create_persona(artist.name)
        persona.backstory = artist.bio
        persona.habits = artist.quirks.split("|") if artist.quirks else []
        # Use station style if linked, otherwise create a generic one
        if artist.station_id:
            station = db.query(Station).filter(Station.id == artist.station_id).first()
            station_style = dna.get_or_create_station(station.name if station else "Independent")
        else:
            station_style = dna.get_or_create_station("Independent")
        art_gen = ArtGenerator()
        art_path = art_gen.generate(ArtType.DJ_PORTRAIT, station=station_style, persona=persona, genre=artist.genre)
        if art_path:
            artist.portrait_path = str(art_path)
            db.commit()
            return {"portrait_path": str(art_path)}
        raise HTTPException(500, "Portrait generation failed")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Portrait generation failed: %s", exc)
        raise HTTPException(500, f"Portrait generation error: {exc}")


# ═══════════════════════════════════════════════════════════════════
#  Brands
# ═══════════════════════════════════════════════════════════════════

@router.post("/brands", response_model=BrandOut)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    """Create a new fictional brand."""
    brand = Brand(**payload.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    logger.info("Created brand: %s", brand.name)
    return BrandOut.model_validate(brand)


@router.get("/brands", response_model=list[BrandOut])
def list_brands(db: Session = Depends(get_db)):
    """List all brands."""
    brands = db.query(Brand).order_by(Brand.created_at.desc()).all()
    return [BrandOut.model_validate(b) for b in brands]


@router.get("/brands/{brand_id}", response_model=BrandOut)
def get_brand(brand_id: str, db: Session = Depends(get_db)):
    """Get a single brand by ID."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    return BrandOut.model_validate(brand)


@router.patch("/brands/{brand_id}", response_model=BrandOut)
def update_brand(brand_id: str, payload: BrandUpdate, db: Session = Depends(get_db)):
    """Update a brand's details."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return BrandOut.model_validate(brand)


@router.delete("/brands/{brand_id}")
def delete_brand(brand_id: str, db: Session = Depends(get_db)):
    """Delete a brand."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    db.delete(brand)
    db.commit()
    return {"deleted": brand_id}


# ═══════════════════════════════════════════════════════════════════
#  Jingles
# ═══════════════════════════════════════════════════════════════════

@router.post("/jingles", response_model=JingleOut)
def create_jingle(payload: JingleCreate, db: Session = Depends(get_db)):
    """Create a jingle entry (audio generated async)."""
    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        raise HTTPException(404, "Station not found")
    jingle = Jingle(**payload.model_dump())
    db.add(jingle)
    db.commit()
    db.refresh(jingle)
    return JingleOut.model_validate(jingle)


@router.get("/stations/{station_id}/jingles", response_model=list[JingleOut])
def list_jingles(station_id: str, db: Session = Depends(get_db)):
    """List jingles for a station."""
    jingles = db.query(Jingle).filter(Jingle.station_id == station_id).order_by(Jingle.created_at.desc()).all()
    return [JingleOut.model_validate(j) for j in jingles]


# ═══════════════════════════════════════════════════════════════════
#  Drafts (legacy ingest + CRUD)
# ═══════════════════════════════════════════════════════════════════

@router.post("/ingest", response_model=IngestResponse)
def ingest_seeds(payload: IngestRequest, db: Session = Depends(get_db)):
    """
    Upload seed data (CSV rows or manual input) to create Draft entries.
    Each row becomes one row in the Drafting Table.
    """
    created_ids: list[str] = []

    for row in payload.rows:
        draft = Draft(
            station_name=row.station_name,
            artist_name=row.artist_name,
            genre=row.genre,
            mood=row.mood,
            items=row.items,
            station_id=row.station_id,
            artist_id=row.artist_id,
            brand_id=row.brand_id,
        )
        db.add(draft)
        db.flush()
        created_ids.append(draft.id)

    db.commit()
    logger.info("Ingested %d seed rows", len(created_ids))

    return IngestResponse(created=len(created_ids), draft_ids=created_ids)


@router.get("/drafts", response_model=DraftListResponse)
def list_drafts(
    status: str | None = None,
    station_id: str | None = None,
    db: Session = Depends(get_db),
):
    """List all drafts, optionally filtered by status or station."""
    query = db.query(Draft)
    if status:
        query = query.filter(Draft.status == status)
    if station_id:
        query = query.filter(Draft.station_id == station_id)
    drafts = query.order_by(Draft.created_at.desc()).all()
    return DraftListResponse(
        total=len(drafts),
        drafts=[DraftOut.model_validate(d) for d in drafts],
    )


@router.patch("/drafts/{draft_id}", response_model=DraftOut)
def update_draft(
    draft_id: str,
    payload: DraftUpdate,
    db: Session = Depends(get_db),
):
    """Edit a draft before committing it to synthesis."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status in ("committed", "generating", "completed"):
        raise HTTPException(status_code=409, detail=f"Cannot edit draft in '{draft.status}' status")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)
    draft.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(draft)
    return DraftOut.model_validate(draft)


@router.post("/commit", response_model=CommitResponse)
def commit_drafts(payload: CommitRequest, db: Session = Depends(get_db)):
    """Submit drafts to the Celery synthesis queue."""
    from app.tasks.synthesis import synthesize_track

    tasks: list[dict] = []
    for draft_id in payload.draft_ids:
        draft = db.query(Draft).filter(Draft.id == draft_id).first()
        if draft is None:
            raise HTTPException(status_code=404, detail=f"Draft {draft_id} not found")
        if draft.status in ("committed", "generating", "completed"):
            raise HTTPException(status_code=409, detail=f"Draft {draft_id} already in '{draft.status}' state")
        celery_task = synthesize_track.delay(draft_id)
        draft.status = "committed"
        draft.task_id = celery_task.id
        tasks.append({"draft_id": draft_id, "task_id": celery_task.id})

    db.commit()
    logger.info("Committed %d drafts to synthesis queue", len(tasks))
    return CommitResponse(queued=len(tasks), tasks=tasks)


# ═══════════════════════════════════════════════════════════════════
#  Tasks
# ═══════════════════════════════════════════════════════════════════

@router.get("/tasks/{task_id}", response_model=TaskStatus)
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    """Poll the status of a generation task."""
    draft = db.query(Draft).filter(Draft.task_id == task_id).first()
    if draft is None:
        raise HTTPException(status_code=404, detail="Task not found")

    history = (
        db.query(GenerationHistory)
        .filter(GenerationHistory.task_id == task_id)
        .first()
    )

    if history and history.status == "completed":
        return TaskStatus(
            task_id=task_id, draft_id=draft.id, status="completed",
            progress=100, output_file=history.output_path,
        )

    if history and history.status == "failed":
        return TaskStatus(
            task_id=task_id, draft_id=draft.id, status="failed",
            progress=0, error=history.error_message,
        )

    try:
        from app.tasks.synthesis import celery_app
        result = celery_app.AsyncResult(task_id)
        celery_state = result.state
        progress_map = {
            "PENDING": 0, "STARTED": 10, "SUCCESS": 100, "FAILURE": 0,
            "PROGRESS": result.info.get("progress", 50) if isinstance(result.info, dict) else 50,
        }
        status_map = {
            "PENDING": "queued", "STARTED": "generating_script", "SUCCESS": "completed", "FAILURE": "failed",
            "PROGRESS": result.info.get("stage", "generating") if isinstance(result.info, dict) else "generating",
        }
        return TaskStatus(
            task_id=task_id, draft_id=draft.id,
            status=status_map.get(celery_state, "queued"),
            progress=progress_map.get(celery_state, 0),
            error=str(result.info) if celery_state == "FAILURE" else None,
        )
    except Exception:
        return TaskStatus(task_id=task_id, draft_id=draft.id, status=draft.status, progress=0)


# ═══════════════════════════════════════════════════════════════════
#  Settings
# ═══════════════════════════════════════════════════════════════════

@router.post("/settings/api-key", response_model=ApiKeyResponse)
def set_api_key(payload: ApiKeyRequest):
    """Validate and store the Google API key."""
    import json
    api_key = payload.api_key.strip()
    if not api_key:
        return ApiKeyResponse(valid=False, message="API key cannot be empty")
    try:
        from google import genai  # type: ignore
        client = genai.Client(api_key=api_key)
        # Lightweight validation call
        client.models.get(model="gemini-2.0-flash")
        
        # Save to memory and persistent storage
        os.environ["GOOGLE_API_KEY"] = api_key
        try:
            settings_path = "/app/data/settings.json"
            # Fallback to local testing path if not in docker
            if not os.path.exists("/app/data") and os.path.exists("../data"):
                settings_path = "../data/settings.json"
                
            os.makedirs(os.path.dirname(settings_path), exist_ok=True)
            with open(settings_path, "w") as f:
                json.dump({"GOOGLE_API_KEY": api_key}, f)
        except Exception as e:
            logger.error("Failed to persist API key to disk: %s", e)
            
        logger.info("Google API key validated and set")
        return ApiKeyResponse(valid=True, message="API key is valid")
    except Exception as exc:
        logger.warning("API key validation failed: %s", exc)
        return ApiKeyResponse(valid=False, message=str(exc))


@router.get("/settings/api-key")
def check_api_key():
    """Check if an API key is currently configured."""
    import json
    key = os.getenv("GOOGLE_API_KEY", "")
    
    # Check persistent storage if not in env
    if not key:
        for path in ["/app/data/settings.json", "../data/settings.json"]:
            if os.path.exists(path):
                try:
                    with open(path, "r") as f:
                        data = json.load(f)
                        key = data.get("GOOGLE_API_KEY", "")
                        if key:
                            os.environ["GOOGLE_API_KEY"] = key
                            break
                except Exception:
                    pass

    has_key = bool(key)
    masked = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else ("****" if key else "")
    return {"configured": has_key, "masked_key": masked}


@router.get("/settings/export")
def export_data(db: Session = Depends(get_db)):
    """Export all relational data to a JSON object."""
    def to_dict(obj):
        d = {}
        for c in obj.__table__.columns:
            val = getattr(obj, c.name)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            d[c.name] = val
        return d

    data = {
        "version": "1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "stations": [to_dict(x) for x in db.query(Station).all()],
            "artists": [to_dict(x) for x in db.query(Artist).all()],
            "brands": [to_dict(x) for x in db.query(Brand).all()],
            "jingles": [to_dict(x) for x in db.query(Jingle).all()],
            "drafts": [to_dict(x) for x in db.query(Draft).all()],
            "generation_history": [to_dict(x) for x in db.query(GenerationHistory).all()],
        }
    }
    return data


# ═══════════════════════════════════════════════════════════════════
#  Chat Assistant
# ═══════════════════════════════════════════════════════════════════

_CHAT_SYSTEM = """You are AetherWave AI, a creative assistant for building fictional radio stations.

You help users:
- Brainstorm station names, frequencies, taglines, and lore
- Create DJ/artist personas with backstories, quirks, and voice descriptions
- Design fictional brands/sponsors with products, slogans, and ad copy
- Generate in-universe worldbuilding details
- Suggest genres, moods, and aesthetic directions

Always stay in-universe. Be creative, specific, and give concrete suggestions.
When suggesting a DJ or station, include specific details the user can paste into their forms.
Format suggestions clearly with bullet points or sections.

CRITICAL INSTRUCTION: If the user explicitly agrees to create or finalize a new entity (Station, Brand, or Artist/DJ), you MUST append a JSON block at the very end of your response exactly like this:
```json
{"action": "propose", "entity": "station", "data": {"name": "Night City FM", "description": "...", "genre": "Synthwave"}}
```
Valid entities are "station", "brand", and "artist". Provide as much relevant data as possible (e.g. tagline, tone, personality, age, genre, frequency)."""


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/chat")
def chat_assistant(payload: ChatRequest):
    """AI chat assistant for brainstorming station content."""
    import json
    api_key = os.getenv("GOOGLE_API_KEY", "")
    
    # Check persistent storage if not in env
    if not api_key:
        for path in ["/app/data/settings.json", "../data/settings.json"]:
            if os.path.exists(path):
                try:
                    with open(path, "r") as f:
                        data = json.load(f)
                        api_key = data.get("GOOGLE_API_KEY", "")
                        if api_key:
                            os.environ["GOOGLE_API_KEY"] = api_key
                            break
                except Exception:
                    pass

    if not api_key:
        return {"reply": "Please set your Google API key in Settings first. I need it to help you brainstorm!"}

    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore

        client = genai.Client(api_key=api_key)

        # Build conversation history
        contents = [types.Content(role="user", parts=[types.Part(text=_CHAT_SYSTEM)])]
        contents.append(types.Content(role="model", parts=[types.Part(text="Understood! I'm ready to help you build your radio universe. What would you like to create?")]))

        for msg in payload.history[-10:]:  # Keep last 10 messages for context
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))

        contents.append(types.Content(role="user", parts=[types.Part(text=payload.message)]))

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.9,
                max_output_tokens=2048,
                tools=[{"google_search": {}}],
            ),
        )

        reply_text = response.text
        proposal = None
        
        # Try to parse any trailing JSON block
        import re
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', reply_text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                if parsed.get("action") == "propose":
                    proposal = parsed
                reply_text = reply_text[:match.start()].strip()
            except Exception as e:
                logger.warning("Failed to parse AI proposal: %s", e)

        return {"reply": reply_text, "proposal": proposal}

    except Exception as exc:
        logger.error("Chat failed: %s", exc)
        return {"reply": f"Sorry, I hit an error: {exc}. Check your API key in Settings."}

