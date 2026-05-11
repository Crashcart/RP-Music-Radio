"""
SQLAlchemy ORM models for AetherWave.

These are the relational models stored in SQLite.  They complement the
Pydantic schemas in persona.py (which handle flat-file JSON persistence
and API serialization).

Tables:
  stations            — Radio stations with branding, genre, mood
  artists             — Independent artists/DJs with voice DNA (status workflow)
  brands              — Fictional in-universe companies/sponsors
  jingles             — Short audio clips tied to stations
  drafts              — User-staged content awaiting commitment
  generation_history  — Completed synthesis runs with metadata

Artist Status Workflow (added for AI DJ staging):
  draft            → AI-generated, pending user review (expires in 7 days)
  pending_publish  → Approved, in 30-second undo window
  published        → Live, visible to end-users (default for manual creation)

Migration note (for DevOps):
  ALTER TABLE artists ADD COLUMN status VARCHAR DEFAULT 'published';
  ALTER TABLE artists ADD COLUMN created_by VARCHAR;
  ALTER TABLE artists ADD COLUMN expires_at DATETIME;
  (created_at already exists)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════
#  Station
# ═══════════════════════════════════════════════════════════════════


class Station(Base):
    """
    A fictional radio station — the top-level container.
    DJs are nested under stations. Each station has its own art, jingles,
    genre identity, and broadcast personality.

    Status lifecycle for AI-generated stations:
      draft            — AI-created, pending user review; expires after 7 days
      pending_publish  — User approved, in 30-second undo window
      published        — Live and visible; default for manually created stations
    """

    __tablename__ = "stations"

    id = Column(String, primary_key=True, default=_new_uuid)

    # Identity
    name = Column(String, nullable=False, unique=True)
    tagline = Column(String, default="")  # "The sound of tomorrow"
    description = Column(Text, default="")  # Full station lore
    frequency = Column(String, default="")  # "99.8 FM" or "Channel 7"

    # Style
    genre = Column(String, default="")  # Primary genre
    sub_genres = Column(Text, default="")  # Pipe-separated sub-genres
    mood = Column(String, default="")  # energetic, chill, dark, etc.
    era = Column(String, default="")  # retro-future, post-apocalyptic, etc.
    broadcast_style = Column(
        String, default=""
    )  # professional, pirate, underground, corporate
    color_palette = Column(Text, default="")  # Pipe-separated hex colors

    # Art
    art_path = Column(String, nullable=True)  # Station logo/art
    style_seed = Column(String, default=_new_uuid)  # For consistent art generation

    # Lore
    location = Column(String, default="")  # "Orbital Platform Sigma-7"
    founded_year = Column(String, default="")  # In-universe founding date
    owner = Column(String, default="")  # In-universe owner/corp
    lore_notes = Column(Text, default="")  # Additional worldbuilding

    # Universe link — which game world this station belongs to (nullable for legacy rows)
    universe_id = Column(String, ForeignKey("universes.id"), nullable=True)

    # AI staging workflow — added for AI station generation feature
    # Values: "published" (default/manual), "draft" (AI-staged), "pending_publish" (in undo window)
    status = Column(String, default="published")
    # Nullable: set by AI generation flow; None for manually created stations
    created_by = Column(String, nullable=True)
    # TTL for draft records — drafts expire 7 days after creation
    expires_at = Column(DateTime, nullable=True)
    # Set when status moves to pending_publish; used to enforce the 30s undo window
    undo_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ═══════════════════════════════════════════════════════════════════
#  Artist / DJ
# ═══════════════════════════════════════════════════════════════════


class Artist(Base):
    """
    A DJ or artist persona with persistent voice DNA, always linked to a station.

    Per governance rules (copilot-instructions.md), DJs/Artists MUST be linked
    to stations via the station_id foreign key. All artists belong to exactly
    one station.

    Status lifecycle for AI-generated DJs:
      draft            — AI-created, pending user review; expires after 7 days
      pending_publish  — User approved, in 30-second undo window
      published        — Live and visible; default for manually created artists

    Migration note: If upgrading from earlier schema with nullable station_id,
    run: UPDATE artists SET station_id = '<station-id>' WHERE station_id IS NULL
    before altering the column to NOT NULL.
    """

    __tablename__ = "artists"

    id = Column(String, primary_key=True, default=_new_uuid)

    # Identity
    name = Column(String, nullable=False)
    display_name = Column(String, default="")  # On-air name if different
    artist_type = Column(String, default="dj")  # dj, musician, narrator, host

    # Station link (NOT NULL — all artists must be linked to a station per governance)
    station_id = Column(String, ForeignKey("stations.id"), nullable=False)

    # Bio & personality
    bio = Column(Text, default="")  # Full character backstory
    personality = Column(Text, default="")  # Personality description
    catchphrases = Column(Text, default="")  # Pipe-separated catchphrases
    quirks = Column(Text, default="")  # Pipe-separated quirks/habits
    speaking_style = Column(String, default="")  # fast, drawling, whispered, etc.
    accent = Column(String, default="")  # British, Southern, robotic, etc.
    age = Column(String, default="")  # Character age or range
    gender = Column(String, default="")  # For voice generation
    announcement_script = Column(Text, default="")  # AI-generated 30-second intro

    # Voice DNA
    voice_seed = Column(String, default=_new_uuid)  # Persistent voice consistency
    voice_description = Column(Text, default="")  # "deep baritone with gravel"

    # Visual
    portrait_path = Column(String, nullable=True)  # AI-generated portrait
    appearance = Column(Text, default="")  # Physical description for art gen

    # Music taste / style
    genre = Column(String, default="")
    influences = Column(Text, default="")  # Pipe-separated influences
    signature_sound = Column(String, default="")  # What makes them unique

    # Relationships
    rivals = Column(Text, default="")  # Pipe-separated rival names
    allies = Column(Text, default="")  # Pipe-separated ally names

    # Stats
    total_tracks = Column(Integer, default=0)

    # AI staging workflow — added for AI DJ generation feature
    # Values: "published" (default/manual), "draft" (AI-staged), "pending_publish" (in undo window)
    status = Column(String, default="published")
    # Nullable: set by AI generation flow; None for manually created artists
    created_by = Column(
        String, nullable=True
    )  # Future multi-user: who initiated the AI generation
    # TTL for draft records — drafts expire 7 days after creation
    expires_at = Column(DateTime, nullable=True)
    # Set when status moves to pending_publish; used to enforce the 30s undo window
    undo_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ═══════════════════════════════════════════════════════════════════
#  Brand (fictional in-universe sponsor/company)
# ═══════════════════════════════════════════════════════════════════


class Brand(Base):
    """
    A fictional in-universe brand/company that sponsors stations.
    Brands generate ad copy, jingles, and product placements.

    Status lifecycle for AI-generated brands:
      draft            — AI-created, pending user review; expires after 7 days
      pending_publish  — User approved, in 30-second undo window
      published        — Live and visible; default for manually created brands
    """

    __tablename__ = "brands"

    id = Column(String, primary_key=True, default=_new_uuid)

    # Identity
    name = Column(String, nullable=False)
    slogan = Column(String, default="")  # "Taste the Nebula"
    industry = Column(String, default="")  # food, weapons, medicine, tech, etc.
    description = Column(Text, default="")  # What does this brand do?

    # Brand voice
    tone = Column(String, default="")  # corporate, quirky, sinister, wholesome
    target_audience = Column(String, default="")  # "space truckers", "corporate drones"
    ad_style = Column(String, default="")  # infomercial, testimonial, jingle, PSA

    # Products (pipe-separated)
    products = Column(Text, default="")  # "Fusion Core|Med-Kit|Plasma Ammo"
    product_descriptions = Column(Text, default="")  # JSON array of {name, desc, price}

    # Visual
    logo_path = Column(String, nullable=True)
    color_primary = Column(String, default="")  # Brand color hex
    color_secondary = Column(String, default="")

    # Lore
    founded_year = Column(String, default="")
    headquarters = Column(String, default="")
    reputation = Column(String, default="")  # trusted, shady, cult-like, etc.
    controversies = Column(Text, default="")  # In-universe scandals
    lore_notes = Column(Text, default="")

    # AI staging workflow — added for AI brand generation feature
    # Values: "published" (default/manual), "draft" (AI-staged), "pending_publish" (in undo window)
    status = Column(String, default="published")
    # Nullable: set by AI generation flow; None for manually created brands
    created_by = Column(String, nullable=True)
    # TTL for draft records — drafts expire 7 days after creation
    expires_at = Column(DateTime, nullable=True)
    # Set when status moves to pending_publish; used to enforce the 30s undo window
    undo_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ═══════════════════════════════════════════════════════════════════
#  Jingle
# ═══════════════════════════════════════════════════════════════════


class Jingle(Base):
    """
    A short audio clip tied to a station.
    Types: intro, outro, bumper, sting, ad-bed.
    """

    __tablename__ = "jingles"

    id = Column(String, primary_key=True, default=_new_uuid)
    station_id = Column(String, ForeignKey("stations.id"), nullable=False)

    name = Column(String, nullable=False)
    jingle_type = Column(
        String, default="bumper"
    )  # intro, outro, bumper, sting, ad-bed
    description = Column(String, default="")
    audio_path = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    status = Column(String, default="pending")  # pending, generating, completed, failed

    created_at = Column(DateTime, default=_utcnow)


# ═══════════════════════════════════════════════════════════════════
#  Draft (modified — now links to station/artist/brand)
# ═══════════════════════════════════════════════════════════════════


class Draft(Base):
    """
    A staged content entry in the Drafting Table.

    Users upload seeds (CSV rows, manual input) which become Draft rows.
    The AI "flesh-out" step populates the expanded fields.  Once the user
    is satisfied, they click Commit → the draft moves to the Celery queue.
    """

    __tablename__ = "drafts"

    id = Column(String, primary_key=True, default=_new_uuid)

    # Links (all optional for backward compat)
    station_id = Column(String, ForeignKey("stations.id"), nullable=True)
    artist_id = Column(String, ForeignKey("artists.id"), nullable=True)
    brand_id = Column(String, ForeignKey("brands.id"), nullable=True)

    # Legacy fields (still used for quick ingest)
    station_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    genre = Column(String, default="")
    mood = Column(String, default="")
    items = Column(Text, default="")  # pipe-delimited item list
    script = Column(Text, default="")  # AI-generated or user-edited script
    backstory = Column(Text, default="")
    market_research = Column(Text, default="")
    filler_protocol = Column(Boolean, default=False)

    # Status: draft | fleshed_out | committed | generating | completed | failed
    status = Column(String, default="draft")
    task_id = Column(String, nullable=True)  # Celery task ID once committed

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ═══════════════════════════════════════════════════════════════════
#  Generation History
# ═══════════════════════════════════════════════════════════════════


class GenerationHistory(Base):
    """
    Tracks every completed (or failed) synthesis run.

    Stores the output file path, duration, cost estimate, and a snapshot
    of the generation parameters so runs can be audited or replayed.
    """

    __tablename__ = "generation_history"

    id = Column(String, primary_key=True, default=_new_uuid)
    draft_id = Column(String, nullable=False)
    task_id = Column(String, nullable=False)

    station_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    track_title = Column(String, default="")
    genre = Column(String, default="")

    # Output
    output_path = Column(String, nullable=True)
    art_path = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Status: generating | completed | failed
    status = Column(String, default="generating")
    error_message = Column(Text, nullable=True)

    # Seeds used (for reproducibility)
    voice_seed = Column(String, nullable=True)
    style_seed = Column(String, nullable=True)

    created_at = Column(DateTime, default=_utcnow)
    completed_at = Column(DateTime, nullable=True)


# ═══════════════════════════════════════════════════════════════════
#  Universe / Game World
# ═══════════════════════════════════════════════════════════════════


class Universe(Base):
    """
    A game world or fictional universe for radio content generation.

    Users provide a game/world name, and the system researches it via Google
    Search + Gemini to extract publisher, setting, lore, distinctive items,
    places to stay, factions, etc. The description is then used to influence
    all content generation (DJs, stations, jingles, ads) to match the world's
    atmosphere and aesthetic.

    Research Status Workflow:
      draft        — User entered name, awaiting research
      researching  — AI research in progress
      reviewed     — Research complete, user reviewing/editing
      published    — Approved and ready for content generation
    """

    __tablename__ = "universes"

    id = Column(String, primary_key=True, default=_new_uuid)

    # Identity
    name = Column(
        String, nullable=False, unique=True
    )  # e.g. "The Witcher 3", "Cyberpunk 2077"
    description = Column(Text, default="")  # Full AI-researched description

    # Research metadata
    publisher = Column(String, default="")  # e.g. "CD Projekt Red"
    key_features = Column(Text, default="")  # Pipe-separated keywords/tags
    research_links = Column(Text, default="")  # JSON array of {title, url}

    # Research workflow
    status = Column(String, default="draft")  # draft, researching, reviewed, published
    research_summary = Column(
        Text, default=""
    )  # Short version for quick reference (lore, atmosphere)

    # Content generation context
    genre_hints = Column(
        String, default=""
    )  # Pipe-separated: "synthwave|cyberpunk|atmospheric"
    mood_hints = Column(
        String, default=""
    )  # Pipe-separated: "dark|mysterious|energetic"
    setting = Column(String, default="")  # "futuristic city", "medieval kingdom", etc.
    era = Column(
        String, default=""
    )  # "futuristic", "medieval", "post-apocalyptic", etc.

    # Admin/audit
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
