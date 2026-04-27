"""
Persona DNA & Lore Ledger schemas.

These Pydantic models define the exact shape of:
  1. persona_db/*.json  — flat-file persona records on the host volume
  2. TXXX:Lore_Ledger    — the JSON payload embedded inside every MP3
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional  # used by dependents (mutagen_handler, audio_generator)

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class EngineManifest(BaseModel):
    """Records which AI engine versions were used for a given generation."""
    lore: str = "Gemini 3 Flash"
    audio: str = "Lyria 3 Pro"
    art: str = "Nano Banana 2"


# ---------------------------------------------------------------------------
# Persona DNA  (stored in  persona_db/dj-<slug>.json)
# ---------------------------------------------------------------------------

class PersonaDNA(BaseModel):
    """
    The persistent identity card for a DJ or Artist.

    * voice_seed guarantees vocal consistency across Lyria calls.
    * habits / rivals / history let Gemini write scripts that reference
      the character's past, making the radio feel alive.
    """

    persona_id: str = Field(
        ...,
        description="Kebab-case slug, e.g. 'dj-vance-rikard'",
    )
    display_name: str = Field(
        ...,
        description="Human-readable name shown in the UI, e.g. 'Vance Rikard'",
    )
    voice_seed: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="UUID passed to Lyria for vocal consistency",
    )
    persona_type: str = Field(
        default="DJ",
        description="DJ | Artist | Narrator",
    )
    backstory: str = ""
    habits: list[str] = Field(default_factory=list)
    rivals: list[str] = Field(default_factory=list)
    history: list[str] = Field(default_factory=list)
    total_tracks_generated: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def touch(self) -> None:
        """Bump the last_updated timestamp."""
        self.last_updated = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Station Style  (stored in  persona_db/station-<slug>.json)
# ---------------------------------------------------------------------------

class StationStyle(BaseModel):
    """
    Visual identity for a radio station.

    * style_seed is passed to Nano Banana 2 so every album cover for a
      station shares the same colour palette, typography, and aesthetic.
    """

    station_id: str = Field(
        ...,
        description="Kebab-case slug, e.g. 'nebula-fm-99-8'",
    )
    display_name: str = Field(
        ...,
        description="Human-readable station name, e.g. 'Nebula FM 99.8'",
    )
    style_seed: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="UUID passed to Nano Banana 2 for visual consistency",
    )
    mood: str = ""
    colors: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def touch(self) -> None:
        self.last_updated = datetime.now(timezone.utc)


class LicenseRecord(BaseModel):
    """
    Static, immutable license provenance.

    Once created, this record is frozen — it captures the exact terms
    under which the content was generated and cannot be altered.
    """
    model_config = {"frozen": True}

    license_type: str = "Google Generative AI — Royalty-Free Commercial Use"
    license_url: str = "https://ai.google.dev/terms"
    generator: str = "AetherWave Labs"
    usage_rights: str = (
        "Royalty-free, non-exclusive license for commercial and "
        "non-commercial use per Google's Generative AI Terms of Service."
    )
    restrictions: str = (
        "No likenesses of real people. No real trademarks or logos. "
        "No deceptive or harmful content. AI-generated works may not "
        "be eligible for copyright registration in most jurisdictions."
    )


class LoreLedger(BaseModel):
    """
    The metadata payload baked into every Lore-Shard MP3.

    This is what makes the MP3 a self-contained database record:
    if the file is moved to another machine, all provenance travels with it.

    The license field is static — once set, it is never modified.
    """

    backstory: str = ""
    market_research: str = ""
    voice_id: str = Field(
        ...,
        description="The voice_seed UUID from the DJ's PersonaDNA",
    )
    style_seed: str = Field(
        ...,
        description="The style_seed UUID from the Station",
    )
    genre: str = ""
    station: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    engines: EngineManifest = Field(default_factory=EngineManifest)
    filler_protocol_applied: bool = False
    license: LicenseRecord = Field(
        default_factory=LicenseRecord,
        description="Static, immutable licensing provenance — never modify after creation",
    )

