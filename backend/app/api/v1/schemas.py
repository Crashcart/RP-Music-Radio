"""
Pydantic request/response schemas for the v1 API.

These are the shapes that flow over HTTP — distinct from the ORM models
(which represent database rows) and the domain models in persona.py
(which represent flat-file JSON on disk).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════
#  Station
# ═══════════════════════════════════════════════════════════════════

class StationCreate(BaseModel):
    name: str
    tagline: str = ""
    description: str = ""
    frequency: str = ""
    genre: str = ""
    sub_genres: str = ""
    mood: str = ""
    era: str = ""
    broadcast_style: str = ""
    color_palette: str = ""
    location: str = ""
    founded_year: str = ""
    owner: str = ""
    lore_notes: str = ""


class StationUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    genre: Optional[str] = None
    sub_genres: Optional[str] = None
    mood: Optional[str] = None
    era: Optional[str] = None
    broadcast_style: Optional[str] = None
    color_palette: Optional[str] = None
    location: Optional[str] = None
    founded_year: Optional[str] = None
    owner: Optional[str] = None
    lore_notes: Optional[str] = None


class StationOut(BaseModel):
    id: str
    name: str
    tagline: str
    description: str
    frequency: str
    genre: str
    sub_genres: str
    mood: str
    era: str
    broadcast_style: str
    color_palette: str
    art_path: Optional[str] = None
    style_seed: str
    location: str
    founded_year: str
    owner: str
    lore_notes: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  Artist / DJ
# ═══════════════════════════════════════════════════════════════════

class ArtistCreate(BaseModel):
    name: str
    display_name: str = ""
    artist_type: str = "dj"
    station_id: Optional[str] = None
    bio: str = ""
    personality: str = ""
    catchphrases: str = ""
    quirks: str = ""
    speaking_style: str = ""
    accent: str = ""
    age: str = ""
    gender: str = ""
    voice_description: str = ""
    appearance: str = ""
    genre: str = ""
    influences: str = ""
    signature_sound: str = ""
    rivals: str = ""
    allies: str = ""


class ArtistUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    artist_type: Optional[str] = None
    station_id: Optional[str] = None
    bio: Optional[str] = None
    personality: Optional[str] = None
    catchphrases: Optional[str] = None
    quirks: Optional[str] = None
    speaking_style: Optional[str] = None
    accent: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    voice_description: Optional[str] = None
    appearance: Optional[str] = None
    genre: Optional[str] = None
    influences: Optional[str] = None
    signature_sound: Optional[str] = None
    rivals: Optional[str] = None
    allies: Optional[str] = None


class ArtistOut(BaseModel):
    id: str
    name: str
    display_name: str
    artist_type: str
    station_id: Optional[str] = None
    bio: str
    personality: str
    catchphrases: str
    quirks: str
    speaking_style: str
    accent: str
    age: str
    gender: str
    voice_seed: str
    voice_description: str
    portrait_path: Optional[str] = None
    appearance: str
    genre: str
    influences: str
    signature_sound: str
    rivals: str
    allies: str
    total_tracks: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  Brand
# ═══════════════════════════════════════════════════════════════════

class BrandCreate(BaseModel):
    name: str
    slogan: str = ""
    industry: str = ""
    description: str = ""
    tone: str = ""
    target_audience: str = ""
    ad_style: str = ""
    products: str = ""
    product_descriptions: str = ""
    color_primary: str = ""
    color_secondary: str = ""
    founded_year: str = ""
    headquarters: str = ""
    reputation: str = ""
    controversies: str = ""
    lore_notes: str = ""


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    slogan: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    tone: Optional[str] = None
    target_audience: Optional[str] = None
    ad_style: Optional[str] = None
    products: Optional[str] = None
    product_descriptions: Optional[str] = None
    color_primary: Optional[str] = None
    color_secondary: Optional[str] = None
    founded_year: Optional[str] = None
    headquarters: Optional[str] = None
    reputation: Optional[str] = None
    controversies: Optional[str] = None
    lore_notes: Optional[str] = None


class BrandOut(BaseModel):
    id: str
    name: str
    slogan: str
    industry: str
    description: str
    tone: str
    target_audience: str
    ad_style: str
    products: str
    product_descriptions: str
    logo_path: Optional[str] = None
    color_primary: str
    color_secondary: str
    founded_year: str
    headquarters: str
    reputation: str
    controversies: str
    lore_notes: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  Jingle
# ═══════════════════════════════════════════════════════════════════

class JingleCreate(BaseModel):
    station_id: str
    name: str
    jingle_type: str = "bumper"
    description: str = ""


class JingleOut(BaseModel):
    id: str
    station_id: str
    name: str
    jingle_type: str
    description: str
    audio_path: Optional[str] = None
    duration_seconds: Optional[float] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  Ingest (legacy — still works for quick seed upload)
# ═══════════════════════════════════════════════════════════════════

class IngestRow(BaseModel):
    """A single seed row from a CSV or manual form."""
    station_name: str
    artist_name: str
    genre: str = ""
    mood: str = ""
    items: str = ""  # pipe-delimited: "Fusion Core|Med-Kit|Ammo"
    station_id: Optional[str] = None
    artist_id: Optional[str] = None
    brand_id: Optional[str] = None


class IngestRequest(BaseModel):
    """Payload for POST /api/v1/ingest."""
    rows: list[IngestRow]


class IngestResponse(BaseModel):
    """Response after ingesting seed data."""
    created: int
    draft_ids: list[str]


# ═══════════════════════════════════════════════════════════════════
#  Drafts
# ═══════════════════════════════════════════════════════════════════

class DraftOut(BaseModel):
    """A draft row as returned by the API."""
    id: str
    station_id: Optional[str] = None
    artist_id: Optional[str] = None
    brand_id: Optional[str] = None
    station_name: str
    artist_name: str
    genre: str
    mood: str
    items: str
    script: str
    backstory: str
    market_research: str
    filler_protocol: bool
    status: str
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DraftUpdate(BaseModel):
    """Partial update payload for PATCH /api/v1/drafts/{id}."""
    station_id: Optional[str] = None
    artist_id: Optional[str] = None
    brand_id: Optional[str] = None
    station_name: Optional[str] = None
    artist_name: Optional[str] = None
    genre: Optional[str] = None
    mood: Optional[str] = None
    items: Optional[str] = None
    script: Optional[str] = None
    backstory: Optional[str] = None
    market_research: Optional[str] = None
    filler_protocol: Optional[bool] = None


class DraftListResponse(BaseModel):
    """Response for GET /api/v1/drafts."""
    total: int
    drafts: list[DraftOut]


# ═══════════════════════════════════════════════════════════════════
#  Commit
# ═══════════════════════════════════════════════════════════════════

class CommitRequest(BaseModel):
    """Payload for POST /api/v1/commit."""
    draft_ids: list[str]


class CommitResponse(BaseModel):
    """Response after committing drafts to the synthesis queue."""
    queued: int
    tasks: list[dict]  # [{draft_id, task_id}, ...]


# ═══════════════════════════════════════════════════════════════════
#  Tasks / Status
# ═══════════════════════════════════════════════════════════════════

class TaskStatus(BaseModel):
    """Status of a generation task."""
    task_id: str
    draft_id: str
    status: str
    progress: int = 0
    estimated_time_remaining: Optional[int] = None
    output_file: Optional[str] = None
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
#  Settings
# ═══════════════════════════════════════════════════════════════════

class ApiKeyRequest(BaseModel):
    api_key: str


class ApiKeyResponse(BaseModel):
    valid: bool
    message: str = ""
