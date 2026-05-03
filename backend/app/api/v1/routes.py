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
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import redis as redis_lib  # type: ignore
from fastapi import APIRouter, Depends, HTTPException, Query  # type: ignore
from pydantic import BaseModel  # type: ignore
from sqlalchemy.orm import Session  # type: ignore

from app.database import get_db
from app.models.database import (
    Artist,
    Brand,
    Draft,
    GenerationHistory,
    Jingle,
    Station,
    Universe,
)
from app.api.v1.schemas import (
    ApiKeyRequest,
    ApiKeyResponse,
    ArtistCreate,
    ArtistDraftCreate,
    ArtistDraftResponse,
    ArtistOut,
    ArtistUpdate,
    BrandCreate,
    BrandOut,
    BrandUpdate,
    BulkArtistIds,
    BulkRejectResponse,
    BulkUndoResponse,
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
    UniverseCreate,
    UniverseOut,
    UniverseResearchRequest,
    UniverseResearchResponse,
    UniverseUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["v1"])

# ── Redis-backed rate limiting ─────────────────────────────────────────
# Rate limit state lives in Redis so limits are shared across all worker
# processes and survive worker restarts.  Falls back gracefully when Redis
# is unavailable (best-effort: skips limiting rather than rejecting all traffic).
_RATE_LIMIT_PER_HOUR = int(os.getenv("AI_STAGE_RATE_PER_HOUR", "20"))
_RATE_LIMIT_CONCURRENT_PER_STATION = int(
    os.getenv("AI_STAGE_CONCURRENT_PER_STATION", "5")
)
_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Lazy singleton — initialised on first use so import doesn't fail when Redis
# is not available at boot time (e.g. running unit tests without Docker).
_redis_client: Optional[redis_lib.Redis] = None  # type: ignore[type-arg]


def _get_redis() -> Optional[redis_lib.Redis]:  # type: ignore[type-arg]
    """Return a cached Redis client, or None if Redis is unreachable."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis_lib.Redis.from_url(
                _REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1,
            )
            _redis_client.ping()
            logger.info("Rate-limit Redis connected: %s", _REDIS_URL)
        except Exception as exc:
            logger.warning(
                "Rate-limit Redis unavailable (%s) — rate limiting degraded to DB-only concurrent check",
                exc,
            )
            _redis_client = None  # reset so next call retries
    return _redis_client


def _check_hourly_rate_limit(requester_key: str) -> bool:
    """
    Increment the hourly counter for requester_key in Redis using an atomic
    pipeline (INCR + EXPIRE).  Returns True if the limit has been exceeded.

    Key format:  ratelimit:hourly:<requester_key>:<YYYY-MM-DD-HH>
    TTL: 3600 s (auto-expires the bucket after the hour rolls over)

    Security note: requester_key must come from a trusted source (session /
    server-side identity), NOT from the request body — callers must sanitise
    before passing here.

    Falls back to False (allow) when Redis is not available.
    """
    r = _get_redis()
    if r is None:
        return False  # degrade gracefully

    hour_bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    redis_key = f"ratelimit:hourly:{requester_key}:{hour_bucket}"

    try:
        pipe = r.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, 3600)
        results = pipe.execute()
        current_count: int = results[0]
        return current_count > _RATE_LIMIT_PER_HOUR
    except Exception as exc:
        logger.warning("Redis rate-limit check failed (%s) — allowing request", exc)
        return False  # degrade gracefully


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
def update_station(
    station_id: str, payload: StationUpdate, db: Session = Depends(get_db)
):
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
        logger.error("Station art generation failed: %s", exc, exc_info=True)
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
def list_artists(
    station_id: str | None = None,
    status: str | None = None,
    created_by: str | None = None,
    db: Session = Depends(get_db),
):
    """
    List artists with optional filters.

    When called without filters, returns only published artists (legacy behaviour).
    Pass status=draft to retrieve staged AI-generated DJs pending review.
    """
    query = db.query(Artist)
    if station_id:
        query = query.filter(Artist.station_id == station_id)
    if status:
        query = query.filter(Artist.status == status)
    else:
        # Default: hide drafts and pending_publish from the regular list
        query = query.filter(Artist.status == "published")
    if created_by:
        query = query.filter(Artist.created_by == created_by)
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


@router.post("/artists/staged", response_model=ArtistDraftResponse)
def stage_artist(payload: ArtistDraftCreate, db: Session = Depends(get_db)):
    """
    Stage an AI-generated DJ for user review.

    Validates all input via Pydantic before touching the database.
    Applies rate limiting:
      • 20 staged DJs per hour per requester (Redis-backed, cross-worker safe)
      • 5 concurrent drafts per station (DB query, always accurate)
    Returns 429 if either limit is exceeded.
    Draft expires automatically in 7 days if not approved.

    Security note: created_by is accepted from the payload only as an opaque
    audit label (future: replace with server-side session identity).  It is
    NEVER trusted as an authentication credential and is sanitised to a safe
    default when blank to prevent the empty-string bypass.
    """
    now = datetime.now(timezone.utc)

    # ── Security: sanitise requester key ─────────────────────────────
    # Use payload.created_by only as an audit label; fall back to "anon".
    # This prevents an attacker from bypassing per-user limits by submitting
    # a rotating sequence of unique created_by values *only* when the caller
    # is trusted (single-user local install).  In a multi-user deployment
    # created_by must come from an authenticated session, not the body.
    requester_key = (payload.created_by or "anon").strip() or "anon"

    # ── Hourly rate limit (Redis-backed, shared across all workers) ──
    if _check_hourly_rate_limit(requester_key):
        logger.warning(
            "Rate limit exceeded for requester=%s (hourly cap %d)",
            requester_key,
            _RATE_LIMIT_PER_HOUR,
        )
        raise HTTPException(
            status_code=429,
            detail={
                "error": f"Rate limit exceeded: max {_RATE_LIMIT_PER_HOUR} staged DJs per hour. Please wait before staging more.",
                "code": "rate_limit_hourly",
            },
        )

    # ── Concurrent draft limit per station (DB-authoritative) ───────
    if payload.station_id:
        concurrent = (
            db.query(Artist)
            .filter(Artist.station_id == payload.station_id, Artist.status == "draft")
            .count()
        )
        if concurrent >= _RATE_LIMIT_CONCURRENT_PER_STATION:
            logger.warning(
                "Concurrent draft limit reached for station=%s (%d drafts)",
                payload.station_id,
                concurrent,
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "error": f"Too many pending drafts for this station: max {_RATE_LIMIT_CONCURRENT_PER_STATION} concurrent. Approve or reject existing drafts first.",
                    "code": "rate_limit_concurrent",
                },
            )

    # ── Create the draft artist ──────────────────────────────────────
    artist_data = payload.model_dump()
    artist = Artist(
        **artist_data,
        status="draft",
        expires_at=now + timedelta(days=7),
    )
    db.add(artist)
    db.commit()
    db.refresh(artist)
    logger.info(
        "Staged AI DJ: id=%s name=%r station=%s created_by=%s",
        artist.id,
        artist.name,
        artist.station_id,
        artist.created_by,
        extra={"artist_id": artist.id},
    )
    return ArtistDraftResponse.model_validate(artist)


@router.post("/artists/{artist_id}/publish", response_model=ArtistDraftResponse)
def publish_artist(artist_id: str, db: Session = Depends(get_db)):
    """
    Initiate publish for a draft DJ.

    Moves status draft → pending_publish and starts a 30-second undo window.
    The Celery beat job auto-promotes pending_publish → published after the
    window expires. Users may call /undo within the window to revert.
    """
    correlation_id = str(uuid.uuid4())
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(404, {"error": "Artist not found", "code": "not_found"})
    if artist.status != "draft":
        raise HTTPException(
            409,
            {
                "error": f"Cannot publish artist with status '{artist.status}' (expected draft)",
                "code": "wrong_status",
            },
        )
    now = datetime.now(timezone.utc)
    artist.status = "pending_publish"
    artist.undo_expires_at = now + timedelta(seconds=30)
    artist.updated_at = now
    db.commit()
    db.refresh(artist)
    logger.info(
        "Publish initiated: id=%s correlation=%s undo_expires=%s",
        artist_id,
        correlation_id,
        artist.undo_expires_at.isoformat(),
    )
    return ArtistDraftResponse.model_validate(artist)


@router.post("/artists/{artist_id}/undo", response_model=ArtistDraftResponse)
def undo_publish(artist_id: str, db: Session = Depends(get_db)):
    """
    Revert a pending_publish DJ back to draft within the 30-second undo window.

    Uses SELECT … FOR UPDATE to lock the row, preventing a torn write when the
    autopublish Celery job races against this handler.  The lock is held until
    the UPDATE + COMMIT complete, so autopublish either sees status='draft'
    (undo won) or status='published' (autopublish won) — never a torn state.

    Returns 400 if the undo window has expired.
    Returns 409 if the artist is not in pending_publish status.
    """
    # Lock the row before reading so the autopublish Celery beat job cannot
    # concurrently read-then-write the same row between our read and our write.
    # SQLite does not support FOR UPDATE (it uses file-level locking), but the
    # with_for_update() call is a no-op there while being correct on Postgres.
    artist = db.query(Artist).filter(Artist.id == artist_id).with_for_update().first()
    if not artist:
        raise HTTPException(404, {"error": "Artist not found", "code": "not_found"})
    if artist.status != "pending_publish":
        raise HTTPException(
            409,
            {
                "error": f"Cannot undo: artist status is '{artist.status}' (expected pending_publish)",
                "code": "wrong_status",
            },
        )
    now = datetime.now(timezone.utc)
    undo_deadline = artist.undo_expires_at
    # Normalise to UTC for comparison even if stored without tzinfo
    if undo_deadline and undo_deadline.tzinfo is None:
        undo_deadline = undo_deadline.replace(tzinfo=timezone.utc)
    if undo_deadline is None or now > undo_deadline:
        raise HTTPException(
            400,
            {"error": "Undo window expired (30s)", "code": "undo_expired"},
        )
    artist.status = "draft"
    artist.undo_expires_at = None
    artist.updated_at = now
    db.commit()
    db.refresh(artist)
    logger.info("Publish undone: id=%s reverted to draft", artist_id)
    return ArtistDraftResponse.model_validate(artist)


@router.post("/artists/bulk-publish", response_model=list[ArtistDraftResponse])
def bulk_publish_artists(payload: BulkArtistIds, db: Session = Depends(get_db)):
    """
    Atomically move multiple draft DJs to pending_publish status.

    All artists in the list receive the same undo_expires_at timestamp so
    the frontend can show a single shared countdown. Artists with a status
    other than 'draft' are skipped with a warning (non-fatal).
    """
    now = datetime.now(timezone.utc)
    undo_at = now + timedelta(seconds=30)
    results: list[ArtistDraftResponse] = []

    for aid in payload.artist_ids:
        artist = db.query(Artist).filter(Artist.id == aid).first()
        if not artist:
            logger.warning("bulk_publish: artist %s not found, skipping", aid)
            continue
        if artist.status != "draft":
            logger.warning(
                "bulk_publish: artist %s has status=%s (not draft), skipping",
                aid,
                artist.status,
            )
            continue
        artist.status = "pending_publish"
        artist.undo_expires_at = undo_at
        artist.updated_at = now

    db.commit()

    # Refresh after commit to return current state
    for aid in payload.artist_ids:
        artist = db.query(Artist).filter(Artist.id == aid).first()
        if artist and artist.status == "pending_publish":
            db.refresh(artist)
            results.append(ArtistDraftResponse.model_validate(artist))

    logger.info(
        "bulk_publish: promoted %d artists, undo_expires=%s",
        len(results),
        undo_at.isoformat(),
    )
    return results


@router.post("/artists/bulk-undo", response_model=BulkUndoResponse)
def bulk_undo_artists(payload: BulkArtistIds, db: Session = Depends(get_db)):
    """
    Atomically revert multiple pending_publish DJs back to draft status.

    Only reverts artists that are BOTH:
      • In status='pending_publish'
      • Still within their undo window (undo_expires_at > now)

    Artists not meeting these conditions are silently skipped — the caller
    does not need to pre-filter.  Returns the count of actually reverted rows.

    Race-condition safety: each row is locked with SELECT … FOR UPDATE so
    the autopublish Celery job cannot promote a row while we are reverting it.
    """
    now = datetime.now(timezone.utc)
    reverted = 0

    for aid in payload.artist_ids:
        # Lock row to prevent autopublish race (no-op on SQLite, correct on Postgres)
        artist = db.query(Artist).filter(Artist.id == aid).with_for_update().first()
        if not artist:
            logger.warning("bulk_undo: artist %s not found, skipping", aid)
            continue
        if artist.status != "pending_publish":
            logger.warning(
                "bulk_undo: artist %s has status=%s (not pending_publish), skipping",
                aid,
                artist.status,
            )
            continue
        # Normalise undo_expires_at to UTC for safe comparison
        undo_deadline = artist.undo_expires_at
        if undo_deadline and undo_deadline.tzinfo is None:
            undo_deadline = undo_deadline.replace(tzinfo=timezone.utc)
        if undo_deadline is None or now > undo_deadline:
            logger.warning("bulk_undo: artist %s undo window expired, skipping", aid)
            continue
        artist.status = "draft"
        artist.undo_expires_at = None
        artist.updated_at = now
        reverted += 1

    db.commit()
    logger.info("bulk_undo: reverted %d artists to draft", reverted)
    return BulkUndoResponse(reverted_count=reverted)


@router.post("/artists/bulk-reject", response_model=BulkRejectResponse)
def bulk_reject_artists(payload: BulkArtistIds, db: Session = Depends(get_db)):
    """
    Hard-delete multiple draft DJs.

    Only deletes artists whose status is 'draft'. Artists with any other
    status are silently ignored so the caller doesn't need pre-filtering.
    Returns the count of actually deleted records.
    """
    deleted = 0
    for aid in payload.artist_ids:
        artist = db.query(Artist).filter(Artist.id == aid).first()
        if not artist:
            logger.warning("bulk_reject: artist %s not found, skipping", aid)
            continue
        if artist.status != "draft":
            logger.warning(
                "bulk_reject: artist %s has status=%s (not draft), skipping",
                aid,
                artist.status,
            )
            continue
        db.delete(artist)
        deleted += 1

    db.commit()
    logger.info("bulk_reject: deleted %d draft artists", deleted)
    return BulkRejectResponse(deleted_count=deleted)


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
            station_style = dna.get_or_create_station(
                station.name if station else "Independent"
            )
        else:
            station_style = dna.get_or_create_station("Independent")
        art_gen = ArtGenerator()
        art_path = art_gen.generate(
            ArtType.DJ_PORTRAIT,
            station=station_style,
            persona=persona,
            genre=artist.genre,
        )
        if art_path:
            artist.portrait_path = str(art_path)
            db.commit()
            return {"portrait_path": str(art_path)}
        raise HTTPException(500, "Portrait generation failed")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Portrait generation failed: %s", exc, exc_info=True)
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
    brand.updated_at = datetime.now(timezone.utc)
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


@router.post("/brands/{brand_id}/logo")
def generate_brand_logo(brand_id: str, db: Session = Depends(get_db)):
    """Generate an AI logo for a brand via Nano Banana 2."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    try:
        from app.utils.art_generator import ArtGenerator, ArtType
        from app.models.persona import StationStyle
        import uuid

        art_gen = ArtGenerator()
        # Use brand id as style seed for consistency
        brand_style = StationStyle(
            station_id=f"brand-{brand.id}",
            display_name=brand.name,
            style_seed=brand.id or str(uuid.uuid4()),
            colors=[brand.color_primary] if brand.color_primary else [],
        )
        # Create a simple dict for prompt formatting
        brand_data = {
            "brand_name": brand.name,
            "slogan": brand.slogan or "",
            "industry": brand.industry or "",
            "tone": brand.tone or "",
        }

        art_path = art_gen.generate_brand_logo(
            brand_data=brand_data,
            brand_style=brand_style,
        )
        if art_path:
            brand.logo_path = str(art_path)
            brand.updated_at = datetime.now(timezone.utc)
            db.commit()
            return {"logo_path": str(art_path)}
        raise HTTPException(500, "Logo generation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Brand logo generation failed for {brand_id}: {e}", exc_info=True)
        raise HTTPException(500, f"Logo generation error: {e}")


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
    jingles = (
        db.query(Jingle)
        .filter(Jingle.station_id == station_id)
        .order_by(Jingle.created_at.desc())
        .all()
    )
    return [JingleOut.model_validate(j) for j in jingles]


@router.delete("/jingles/{jingle_id}")
def delete_jingle(jingle_id: str, db: Session = Depends(get_db)):
    """Delete a jingle."""
    jingle = db.query(Jingle).filter(Jingle.id == jingle_id).first()
    if not jingle:
        raise HTTPException(404, "Jingle not found")
    db.delete(jingle)
    db.commit()
    return {"deleted": jingle_id}


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
        raise HTTPException(
            status_code=409, detail=f"Cannot edit draft in '{draft.status}' status"
        )
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)
    draft.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(draft)
    return DraftOut.model_validate(draft)


@router.delete("/drafts/{draft_id}")
def delete_draft(draft_id: str, db: Session = Depends(get_db)):
    """Delete a draft. Drafts that are actively generating cannot be deleted."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "generating":
        raise HTTPException(
            status_code=409, detail="Cannot delete a draft that is currently generating"
        )
    db.delete(draft)
    db.commit()
    logger.info("Deleted draft %s", draft_id)
    return {"deleted": draft_id}


@router.post("/drafts/{draft_id}/retry", response_model=DraftOut)
def retry_draft(draft_id: str, db: Session = Depends(get_db)):
    """Re-queue a failed or stuck draft for synthesis."""
    from app.tasks.synthesis import synthesize_track

    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status not in ("failed", "committed"):
        raise HTTPException(
            status_code=409,
            detail=f"Only failed or stuck drafts can be retried (current status: '{draft.status}')",
        )

    celery_task = synthesize_track.delay(draft_id)
    draft.status = "committed"
    draft.task_id = celery_task.id
    draft.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(draft)
    logger.info("Retried draft %s with task %s", draft_id, celery_task.id)
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
            raise HTTPException(
                status_code=409,
                detail=f"Draft {draft_id} already in '{draft.status}' state",
            )
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
        db.query(GenerationHistory).filter(GenerationHistory.task_id == task_id).first()
    )

    if history and history.status == "completed":
        return TaskStatus(
            task_id=task_id,
            draft_id=draft.id,
            status="completed",
            progress=100,
            output_file=history.output_path,
        )

    if history and history.status == "failed":
        return TaskStatus(
            task_id=task_id,
            draft_id=draft.id,
            status="failed",
            progress=0,
            error=history.error_message,
        )

    try:
        from app.tasks.synthesis import celery_app

        result = celery_app.AsyncResult(task_id)
        celery_state = result.state
        progress_map = {
            "PENDING": 0,
            "STARTED": 10,
            "SUCCESS": 100,
            "FAILURE": 0,
            "PROGRESS": (
                result.info.get("progress", 50) if isinstance(result.info, dict) else 50
            ),
        }
        status_map = {
            "PENDING": "queued",
            "STARTED": "generating_script",
            "SUCCESS": "completed",
            "FAILURE": "failed",
            "PROGRESS": (
                result.info.get("stage", "generating")
                if isinstance(result.info, dict)
                else "generating"
            ),
        }
        return TaskStatus(
            task_id=task_id,
            draft_id=draft.id,
            status=status_map.get(celery_state, "queued"),
            progress=progress_map.get(celery_state, 0),
            error=str(result.info) if celery_state == "FAILURE" else None,
        )
    except Exception:
        return TaskStatus(
            task_id=task_id, draft_id=draft.id, status=draft.status, progress=0
        )


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
        client.models.get(model="gemini-2.5-flash")

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
            logger.error("Failed to persist API key to disk: %s", e, exc_info=True)

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
            "generation_history": [
                to_dict(x) for x in db.query(GenerationHistory).all()
            ],
        },
    }
    return data


@router.get("/settings/logs")
def get_system_logs(lines: int = 500):
    """Retrieve the last N lines of the backend log for debugging."""
    try:
        import os

        log_path = "logs/backend.log"
        if not os.path.exists(log_path):
            return {
                "logs": "Log file not found. System is waiting for the first error or log entry."
            }

        # Read the last N lines safely
        with open(log_path, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            return {"logs": "".join(all_lines[-lines:])}
    except Exception as exc:
        logger.error("Failed to read logs: %s", exc, exc_info=True)
        return {"logs": f"Error reading logs: {exc}"}


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
Valid entities are "station", "brand", and "artist". Provide as much relevant data as possible (e.g. tagline, tone, personality, age, genre, frequency).

ENTITY RELATIONSHIP RULE (CRITICAL):
- DJs/Artists MUST be linked to stations (include a `station_id` field if known from context).
- All other entities (Brands, Stations) MUST NOT contain a `station_id` or attempt to be linked to specific stations.
This rule prevents data model corruption."""


# ═══════════════════════════════════════════════════════════════════
#  Universes / Game Worlds
# ═══════════════════════════════════════════════════════════════════


@router.post("/universes", response_model=UniverseOut)
def create_universe(payload: UniverseCreate, db: Session = Depends(get_db)):
    """Create a new universe (game world) for research."""
    universe = Universe(name=payload.name, status="draft")
    db.add(universe)
    db.commit()
    db.refresh(universe)
    logger.info("Created universe: %s", universe.name)
    return UniverseOut.model_validate(universe)


@router.get("/universes", response_model=list[UniverseOut])
def list_universes(status: str | None = None, db: Session = Depends(get_db)):
    """List all universes with optional status filter."""
    query = db.query(Universe)
    if status:
        query = query.filter(Universe.status == status)
    universes = query.order_by(Universe.created_at.desc()).all()
    return [UniverseOut.model_validate(u) for u in universes]


@router.get("/universes/{universe_id}", response_model=UniverseOut)
def get_universe(universe_id: str, db: Session = Depends(get_db)):
    """Get a single universe by ID."""
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(404, "Universe not found")
    return UniverseOut.model_validate(universe)


@router.patch("/universes/{universe_id}", response_model=UniverseOut)
def update_universe(
    universe_id: str, payload: UniverseUpdate, db: Session = Depends(get_db)
):
    """Update universe fields (user edits after research)."""
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(404, "Universe not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(universe, field, value)
    universe.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(universe)
    logger.info("Updated universe: %s", universe.name)
    return UniverseOut.model_validate(universe)


@router.delete("/universes/{universe_id}")
def delete_universe(universe_id: str, db: Session = Depends(get_db)):
    """Delete a universe."""
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(404, "Universe not found")
    db.delete(universe)
    db.commit()
    logger.info("Deleted universe: %s", universe.name)
    return {"deleted": universe_id}


@router.post(
    "/universes/{universe_id}/research", response_model=UniverseResearchResponse
)
def research_universe(
    universe_id: str, payload: UniverseResearchRequest, db: Session = Depends(get_db)
):
    """
    Research a universe via Google Search + Gemini.

    Extracts publisher, setting, lore, distinctive items, places to stay,
    factions, mood, genre, and atmosphere. Returns researched description
    that can be used to influence content generation.
    """
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(
            400,
            {
                "error": "Google API key not configured. Set it in Settings first.",
                "code": "missing_api_key",
            },
        )

    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(404, "Universe not found")

    # Mark as researching
    universe.status = "researching"
    db.commit()

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Research prompt for Gemini with Google Search grounding
        research_prompt = f"""
Research the video game or fictional universe: "{universe.name}"

Please provide detailed information about:
1. Publisher/Developer
2. Setting and atmosphere (medieval, futuristic, post-apocalyptic, etc.)
3. Key lore and storyline
4. Distinctive items, weapons, or technology
5. Places to stay (taverns, hotels, bases, settlements)
6. Factions, groups, or factions
7. Food and drink culture
8. Music and audio aesthetic (if applicable)
9. Genre and mood (dark, hopeful, mysterious, energetic, etc.)
10. Unique features that define this world

Format your response as a detailed description suitable for influencing radio content generation, DJ personalities, and advertisements.
Include a short summary (2-3 sentences) and full description.
"""

        # Use Gemini with Google Search grounding
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=research_prompt,
            config=genai.types.GenerateContentConfig(
                tools=[genai.Tool(google_search=genai.types.GoogleSearch())],
            ),
        )

        research_text = response.text if response.text else ""

        # Extract key information from the research
        # For now, use the full text as description
        universe.description = research_text
        universe.research_summary = research_text[:500]  # First 500 chars as summary
        universe.status = "reviewed"

        # Try to extract genre/mood hints (simple heuristic)
        text_lower = research_text.lower()
        genres = []
        moods = []

        genre_keywords = {
            "synthwave": ["synthwave", "neon", "retro-future", "80s"],
            "cyberpunk": ["cyberpunk", "futuristic", "high-tech"],
            "fantasy": ["fantasy", "medieval", "magic"],
            "horror": ["horror", "scary", "dark", "spooky"],
            "noir": ["noir", "detective", "crime", "mystery"],
            "ambient": ["ambient", "atmospheric", "ethereal"],
        }

        for genre, keywords in genre_keywords.items():
            if any(kw in text_lower for kw in keywords):
                genres.append(genre)

        mood_keywords = {
            "dark": ["dark", "grim", "somber", "ominous"],
            "mysterious": ["mysterious", "cryptic", "unknown"],
            "energetic": ["energetic", "fast-paced", "action"],
            "chill": ["chill", "relaxed", "peaceful"],
            "hopeful": ["hopeful", "inspiring", "uplifting"],
        }

        for mood, keywords in mood_keywords.items():
            if any(kw in text_lower for kw in keywords):
                moods.append(mood)

        if genres:
            universe.genre_hints = "|".join(genres)
        if moods:
            universe.mood_hints = "|".join(moods)

        universe.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(universe)

        logger.info(
            "Researched universe: %s genres=%s moods=%s",
            universe.name,
            genres,
            moods,
        )

        return UniverseResearchResponse.model_validate(universe)

    except Exception as exc:
        universe.status = "draft"
        db.commit()
        logger.error("Universe research failed: %s", exc, exc_info=True)
        raise HTTPException(
            500,
            {
                "error": f"Research failed: {exc}",
                "code": "research_failed",
            },
        )


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    system_prompt: Optional[str] = None


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
        return {
            "reply": "Please set your Google API key in Settings first. I need it to help you brainstorm!"
        }

    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore

        client = genai.Client(api_key=api_key)

        # Use the frontend-supplied system prompt when provided (station-aware context
        # injected by buildSystemPrompt()); fall back to the generic system prompt.
        effective_system = (
            payload.system_prompt.strip()
            if payload.system_prompt and payload.system_prompt.strip()
            else _CHAT_SYSTEM
        )

        # Build conversation history
        contents = [
            types.Content(role="user", parts=[types.Part(text=effective_system)])
        ]
        contents.append(
            types.Content(
                role="model",
                parts=[
                    types.Part(
                        text="Understood! I'm ready to help you build your radio universe. What would you like to create?"
                    )
                ],
            )
        )

        for msg in payload.history[-10:]:  # Keep last 10 messages for context
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(
                    role=role, parts=[types.Part(text=msg.get("content", ""))]
                )
            )

        contents.append(
            types.Content(role="user", parts=[types.Part(text=payload.message)])
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.9,
                max_output_tokens=2048,
            ),
        )

        reply_text = response.text
        proposal = None

        # Try to parse any trailing JSON block
        import re

        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", reply_text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                if parsed.get("action") == "propose":
                    proposal = parsed
                reply_text = reply_text[: match.start()].strip()
            except Exception as e:
                logger.warning("Failed to parse AI proposal: %s", e)

        return {"reply": reply_text, "proposal": proposal}

    except Exception as exc:
        logger.error("Chat failed: %s", exc, exc_info=True)
        return {
            "reply": f"Sorry, I hit an error: {exc}. Check your API key in Settings."
        }


# ── Logging / Diagnostics ────────────────────────────────────────────────────


@router.get("/logs/errors")
def get_logs_errors(hours: int = Query(24, ge=1, le=168)):
    """Get all ERROR/CRITICAL logs from the past N hours."""
    from app.log_analyzer import LogAnalyzer

    analyzer = LogAnalyzer()
    errors = analyzer.find_errors(hours=hours, limit=100)
    return {
        "total": len(errors),
        "hours": hours,
        "errors": [
            {
                "timestamp": e.timestamp,
                "component": e.component,
                "level": e.level,
                "message": e.message,
                "context": e.context,
            }
            for e in errors
        ],
    }


@router.get("/logs/summary")
def get_logs_summary(hours: int = Query(24, ge=1, le=168)):
    """Get error summary for the past N hours."""
    from app.log_analyzer import LogAnalyzer

    analyzer = LogAnalyzer()
    return analyzer.get_error_summary(hours=hours)


@router.get("/logs/search")
def search_logs(
    pattern: str = Query(..., min_length=1),
    hours: int = Query(24, ge=1, le=168),
):
    """Search logs by message pattern."""
    from app.log_analyzer import LogAnalyzer

    analyzer = LogAnalyzer()
    results = analyzer.find_pattern(pattern, hours=hours, limit=50)
    return {
        "pattern": pattern,
        "total": len(results),
        "hours": hours,
        "results": [
            {
                "timestamp": e.timestamp,
                "component": e.component,
                "level": e.level,
                "message": e.message,
            }
            for e in results
        ],
    }


@router.get("/debug/health-report")
def debug_health_report(hours: int = Query(24, ge=1, le=168)):
    """
    Comprehensive health report for debugging.

    Includes:
    - Error summary (count by level/component)
    - Recent errors
    - Recommendations
    """
    from app.log_analyzer import LogAnalyzer
    from datetime import datetime

    analyzer = LogAnalyzer()

    summary = analyzer.get_error_summary(hours=hours)
    errors = analyzer.find_errors(hours=hours, limit=20)

    # Build recommendations
    recommendations = []
    total_errors = summary.get("total_errors", 0)

    if total_errors > 50:
        recommendations.append(
            {
                "severity": "CRITICAL",
                "message": f"Very high error rate ({total_errors} in {hours}h)",
            }
        )
    elif total_errors > 10:
        recommendations.append(
            {
                "severity": "WARNING",
                "message": f"High error rate ({total_errors} in {hours}h)",
            }
        )

    if summary.get("by_level", {}).get("CRITICAL", 0) > 0:
        recommendations.append(
            {
                "severity": "CRITICAL",
                "message": f"CRITICAL errors detected: {summary['by_level']['CRITICAL']}",
            }
        )

    if not recommendations:
        recommendations.append({"severity": "OK", "message": "System healthy"})

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "hours": hours,
        "summary": summary,
        "recent_errors": [
            {
                "timestamp": e.timestamp,
                "component": e.component,
                "level": e.level,
                "message": e.message,
            }
            for e in errors
        ],
        "recommendations": recommendations,
    }


@router.get("/logs/patterns")
def get_error_patterns(hours: int = Query(24, ge=1, le=168)):
    """
    Detect recurring error patterns and suggest fixes.

    Returns patterns with:
    - Error message
    - Frequency (how many times)
    - Severity (CRITICAL, HIGH, MEDIUM)
    - Suggested fixes from fix catalog
    - Next steps to resolve
    """
    from app.log_analyzer import LogAnalyzer

    analyzer = LogAnalyzer()
    patterns = analyzer.detect_patterns(hours=hours)

    return {
        "total_patterns": len(patterns),
        "hours": hours,
        "patterns": patterns,
    }
