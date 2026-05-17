"""
Pydantic request/response schemas for the v1 API.

These are the shapes that flow over HTTP — distinct from the ORM models
(which represent database rows) and the domain models in persona.py
(which represent flat-file JSON on disk).
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

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
    universe_id: Optional[str] = None


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
    universe_id: Optional[str] = None
    # AI staging workflow fields
    status: str = "published"
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StationDraftCreate(BaseModel):
    """
    Schema for staging an AI-generated station.

    Accepts partial data (AI may not fill all fields), but requires
    at minimum a name. All fields are validated before any database write
    to prevent malformed AI output from persisting.
    """

    name: str = Field(
        ..., min_length=1, max_length=200, description="Station name (required)"
    )
    tagline: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=5000)
    frequency: str = Field(default="", max_length=50)
    genre: str = Field(default="", max_length=200)
    sub_genres: str = Field(
        default="", max_length=500, description="Pipe-separated sub-genres"
    )
    mood: str = Field(default="", max_length=200)
    era: str = Field(default="", max_length=200)
    broadcast_style: str = Field(default="", max_length=200)
    color_palette: str = Field(
        default="", max_length=500, description="Pipe-separated hex colors"
    )
    location: str = Field(default="", max_length=500)
    founded_year: str = Field(default="", max_length=50)
    owner: str = Field(default="", max_length=200)
    lore_notes: str = Field(default="", max_length=3000)
    created_by: Optional[str] = Field(default=None, max_length=200)


class StationDraftResponse(BaseModel):
    """
    Response returned after successfully staging an AI-generated station.

    Extends StationOut with staging-specific metadata that the frontend
    needs to render the review UI and countdown timer.
    """

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
    status: str
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
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
    """Full artist response including staging workflow fields."""

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
    # AI staging workflow fields
    status: str = "published"
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  Artist Staging (AI DJ workflow)
# ═══════════════════════════════════════════════════════════════════

_VALID_ARTIST_TYPES = {"dj", "musician", "narrator", "host", "caller", "guest"}


class ArtistDraftCreate(BaseModel):
    """
    Schema for staging an AI-generated DJ.

    Accepts partial data (AI may not fill all fields), but requires
    at minimum a name and artist_type. All fields are validated before
    any database write to prevent malformed AI output from persisting.
    """

    name: str = Field(
        ..., min_length=1, max_length=200, description="DJ real name (required)"
    )
    display_name: str = Field(default="", max_length=200)
    artist_type: str = Field(default="dj")
    station_id: Optional[str] = Field(default=None)
    bio: str = Field(default="", max_length=5000)
    personality: str = Field(default="", max_length=3000)
    catchphrases: str = Field(
        default="", max_length=1000, description="Pipe-separated catchphrases"
    )
    quirks: str = Field(default="", max_length=1000)
    speaking_style: str = Field(default="", max_length=200)
    accent: str = Field(default="", max_length=200)
    age: str = Field(default="", max_length=50)
    gender: str = Field(default="", max_length=100)
    voice_description: str = Field(default="", max_length=2000)
    appearance: str = Field(default="", max_length=3000)
    genre: str = Field(default="", max_length=200)
    influences: str = Field(default="", max_length=500)
    signature_sound: str = Field(default="", max_length=500)
    rivals: str = Field(default="", max_length=500)
    allies: str = Field(default="", max_length=500)
    # Optional: caller identity for audit trail (future multi-user)
    created_by: Optional[str] = Field(default=None, max_length=200)

    @field_validator("artist_type")
    @classmethod
    def validate_artist_type(cls, v: str) -> str:
        """Reject unknown artist types to prevent garbage data."""
        if v not in _VALID_ARTIST_TYPES:
            raise ValueError(
                f"artist_type must be one of: {sorted(_VALID_ARTIST_TYPES)}"
            )
        return v

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        """Name must contain visible characters, not just whitespace."""
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v.strip()


class ArtistDraftResponse(BaseModel):
    """
    Response returned after successfully staging an AI-generated DJ.

    Extends ArtistOut with staging-specific metadata that the frontend
    needs to render the review UI and countdown timer.
    """

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
    status: str
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BulkArtistIds(BaseModel):
    """Request body for bulk publish/reject operations."""

    artist_ids: List[str] = Field(
        ..., min_length=1, description="List of artist IDs to act on"
    )

    @field_validator("artist_ids")
    @classmethod
    def validate_non_empty_ids(cls, v: List[str]) -> List[str]:
        """All provided IDs must be non-empty strings."""
        for aid in v:
            if not aid or not aid.strip():
                raise ValueError("artist_ids must not contain blank strings")
        return v


class BulkRejectResponse(BaseModel):
    """Response for bulk-reject operation."""

    deleted_count: int


class BulkUndoResponse(BaseModel):
    """Response for bulk-undo operation."""

    reverted_count: int


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
    # AI staging workflow fields
    status: str = "published"
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BrandDraftCreate(BaseModel):
    """
    Schema for staging an AI-generated brand.

    Accepts partial data (AI may not fill all fields), but requires
    at minimum a name. All fields are validated before any database write
    to prevent malformed AI output from persisting.
    """

    name: str = Field(
        ..., min_length=1, max_length=200, description="Brand name (required)"
    )
    slogan: str = Field(default="", max_length=500)
    industry: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=5000)
    tone: str = Field(default="", max_length=200)
    target_audience: str = Field(default="", max_length=500)
    ad_style: str = Field(default="", max_length=200)
    products: str = Field(
        default="", max_length=2000, description="Pipe-separated product list"
    )
    product_descriptions: str = Field(default="", max_length=3000)
    color_primary: str = Field(default="", max_length=100)
    color_secondary: str = Field(default="", max_length=100)
    founded_year: str = Field(default="", max_length=50)
    headquarters: str = Field(default="", max_length=500)
    reputation: str = Field(default="", max_length=500)
    controversies: str = Field(default="", max_length=2000)
    lore_notes: str = Field(default="", max_length=3000)
    created_by: Optional[str] = Field(default=None, max_length=200)


class BrandDraftResponse(BaseModel):
    """
    Response returned after successfully staging an AI-generated brand.

    Extends BrandOut with staging-specific metadata that the frontend
    needs to render the review UI and countdown timer.
    """

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
    status: str
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    undo_expires_at: Optional[datetime] = None
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
#  Universes / Game Worlds
# ═══════════════════════════════════════════════════════════════════


class ResearchLink(BaseModel):
    """A reference link for universe research."""

    title: str = Field(..., min_length=1, max_length=200)
    url: str = Field(..., min_length=5, max_length=500)


class UniverseCreate(BaseModel):
    """Create a new universe (initial game name only)."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Game/world name (e.g. 'Cyberpunk 2077')",
    )


class UniverseUpdate(BaseModel):
    """Update universe fields (user edits after research)."""

    description: Optional[str] = None
    publisher: Optional[str] = None
    key_features: Optional[str] = None
    research_links: Optional[str] = None  # JSON array
    research_summary: Optional[str] = None
    genre_hints: Optional[str] = None
    mood_hints: Optional[str] = None
    setting: Optional[str] = None
    era: Optional[str] = None
    status: Optional[str] = None  # draft, researching, reviewed, published


class UniverseOut(BaseModel):
    """Full universe response with all fields."""

    id: str
    name: str
    description: str
    publisher: str
    key_features: str
    research_links: str  # JSON array
    status: str
    research_summary: str
    art_path: str | None = None
    genre_hints: str
    mood_hints: str
    setting: str
    era: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UniverseResearchRequest(BaseModel):
    """Request to research a universe via Google Search + Gemini."""

    # No fields needed — research is triggered on the universe with the given name


class UniverseResearchResponse(BaseModel):
    """Response from AI research endpoint."""

    id: str
    name: str
    description: str
    publisher: str
    research_summary: str
    genre_hints: str
    mood_hints: str
    setting: str
    era: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UniverseDraftCreate(BaseModel):
    """Schema for staging an AI-generated universe."""

    name: str = Field(
        ..., min_length=1, max_length=200, description="Universe name (required)"
    )
    description: str = Field(default="", max_length=5000)
    publisher: str = Field(default="", max_length=500)
    key_features: str = Field(default="", max_length=2000)
    research_links: str = Field(default="", max_length=3000)
    research_summary: str = Field(default="", max_length=3000)
    genre_hints: str = Field(default="", max_length=500)
    mood_hints: str = Field(default="", max_length=500)
    setting: str = Field(default="", max_length=500)
    era: str = Field(default="", max_length=200)
    created_by: Optional[str] = Field(default=None, max_length=200)


class UniverseDraftResponse(BaseModel):
    """Response returned after successfully staging an AI-generated universe."""

    id: str
    name: str
    description: str
    publisher: str
    key_features: str
    research_links: str
    status: str
    research_summary: str
    art_path: Optional[str] = None
    genre_hints: str
    mood_hints: str
    setting: str
    era: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JingleDraftCreate(BaseModel):
    """Schema for staging an AI-generated jingle."""

    station_id: str
    name: str = Field(..., min_length=1, max_length=200)
    jingle_type: str = Field(default="bumper", max_length=50)
    description: str = Field(default="", max_length=1000)
    created_by: Optional[str] = Field(default=None, max_length=200)


class JingleDraftResponse(BaseModel):
    """Response returned after successfully staging an AI-generated jingle."""

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


class DraftDraftCreate(BaseModel):
    """Schema for staging a draft via AI generation."""

    station_id: Optional[str] = None
    artist_id: Optional[str] = None
    brand_id: Optional[str] = None
    station_name: str = Field(..., min_length=1, max_length=200)
    artist_name: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(default="", max_length=200)
    mood: str = Field(default="", max_length=200)
    items: str = Field(default="", max_length=2000)
    script: str = Field(default="", max_length=5000)
    backstory: str = Field(default="", max_length=3000)
    market_research: str = Field(default="", max_length=3000)
    filler_protocol: bool = False
    created_by: Optional[str] = Field(default=None, max_length=200)


class DraftDraftResponse(BaseModel):
    """Response returned after successfully staging a draft."""

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


# ═══════════════════════════════════════════════════════════════════
#  Settings
# ═══════════════════════════════════════════════════════════════════


class ApiKeyRequest(BaseModel):
    api_key: str


class ApiKeyResponse(BaseModel):
    valid: bool
    message: str = ""
