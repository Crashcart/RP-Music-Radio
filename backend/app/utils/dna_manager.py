"""
DNA Manager — the single source of truth for voice and style seeds.

How it works
────────────
  persona_db/
    dj-vance-rikard.json      ← PersonaDNA (voice_seed lives here)
    station-nebula-fm-99-8.json  ← StationStyle (style_seed lives here)

When a track is requested for "Vance Rikard" on "Nebula FM 99.8":
  1. DNAManager.get_or_create_persona("Vance Rikard")
     → Loads dj-vance-rikard.json if it exists, or creates it with a fresh UUID.
  2. DNAManager.get_or_create_station("Nebula FM 99.8")
     → Loads station-nebula-fm-99-8.json if it exists, or creates it.
  3. The returned voice_seed / style_seed are passed verbatim to Lyria / Nano.
     Because the UUID never changes, the voice and art style stay identical.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path

from app.models.persona import PersonaDNA, StationStyle

logger = logging.getLogger(__name__)

# Default persistence root — overridable via PERSONA_DB_PATH env var.
_DEFAULT_PERSONA_DIR = "/app/persistence"


def _slugify(name: str) -> str:
    """Convert a display name to a filesystem-safe kebab-case slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


class DNAManager:
    """
    Manages persona and station identity files on the host volume.

    Thread-safe for reads (each file is an atomic JSON blob).
    Writes use a temp-file + rename pattern for crash safety.
    """

    def __init__(self, base_dir: str | Path | None = None) -> None:
        self.base_dir = Path(
            base_dir or os.getenv("PERSONA_DB_PATH", _DEFAULT_PERSONA_DIR)
        )
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # ── Persona (Voice) ───────────────────────────────────────────────

    def _persona_path(self, slug: str) -> Path:
        return self.base_dir / f"dj-{slug}.json"

    def get_persona(self, artist_name: str) -> PersonaDNA | None:
        """Return an existing persona, or None."""
        path = self._persona_path(_slugify(artist_name))
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return PersonaDNA(**data)

    def get_or_create_persona(self, artist_name: str, **overrides) -> PersonaDNA:
        """
        Look up a DJ/Artist by name.  If the persona file already exists,
        return it (with the original voice_seed).  Otherwise create a new
        persona with a fresh UUID and persist it immediately.
        """
        existing = self.get_persona(artist_name)
        if existing is not None:
            logger.info("Loaded existing persona: %s (voice=%s)",
                        existing.persona_id, existing.voice_seed)
            return existing

        slug = _slugify(artist_name)
        persona = PersonaDNA(
            persona_id=f"dj-{slug}",
            display_name=artist_name,
            **overrides,
        )
        self._save_persona(persona)
        logger.info("Created new persona: %s (voice=%s)",
                     persona.persona_id, persona.voice_seed)
        return persona

    def update_persona(self, persona: PersonaDNA) -> None:
        """Persist changes (e.g. after a new track is generated)."""
        persona.touch()
        self._save_persona(persona)

    def list_personas(self) -> list[PersonaDNA]:
        """Return every persona on disk."""
        results: list[PersonaDNA] = []
        for path in sorted(self.base_dir.glob("dj-*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                results.append(PersonaDNA(**data))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Skipping corrupt persona file %s: %s", path, exc)
        return results

    def _save_persona(self, persona: PersonaDNA) -> None:
        path = self._persona_path(persona.persona_id.removeprefix("dj-"))
        tmp = path.with_suffix(".tmp")
        tmp.write_text(
            persona.model_dump_json(indent=2),
            encoding="utf-8",
        )
        tmp.replace(path)  # atomic on POSIX; near-atomic on Windows

    # ── Station (Style) ───────────────────────────────────────────────

    def _station_path(self, slug: str) -> Path:
        return self.base_dir / f"station-{slug}.json"

    def get_station(self, station_name: str) -> StationStyle | None:
        path = self._station_path(_slugify(station_name))
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return StationStyle(**data)

    def get_or_create_station(self, station_name: str, **overrides) -> StationStyle:
        """
        Same pattern as personas: reuse the existing style_seed if the
        station file exists, so Nano Banana 2 always renders art in the
        same palette.
        """
        existing = self.get_station(station_name)
        if existing is not None:
            logger.info("Loaded existing station: %s (style=%s)",
                        existing.station_id, existing.style_seed)
            return existing

        slug = _slugify(station_name)
        station = StationStyle(
            station_id=f"station-{slug}",
            display_name=station_name,
            **overrides,
        )
        self._save_station(station)
        logger.info("Created new station: %s (style=%s)",
                     station.station_id, station.style_seed)
        return station

    def update_station(self, station: StationStyle) -> None:
        station.touch()
        self._save_station(station)

    def list_stations(self) -> list[StationStyle]:
        results: list[StationStyle] = []
        for path in sorted(self.base_dir.glob("station-*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                results.append(StationStyle(**data))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Skipping corrupt station file %s: %s", path, exc)
        return results

    def _save_station(self, station: StationStyle) -> None:
        path = self._station_path(station.station_id.removeprefix("station-"))
        tmp = path.with_suffix(".tmp")
        tmp.write_text(
            station.model_dump_json(indent=2),
            encoding="utf-8",
        )
        tmp.replace(path)
