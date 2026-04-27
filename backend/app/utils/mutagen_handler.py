"""
Mutagen Handler — reads and writes Lore-Shard metadata into MP3 ID3v2.4 tags.

This is what makes every MP3 a self-contained database record:
if the file is copied to another machine, all provenance travels with it.

Tag layout follows the TDR spec (ARCHITECTURE.md §4):
  TPE1          → Artist / DJ name
  TPE2          → Album artist (station name for grouping)
  TALB          → Station name
  TIT2          → Track title
  TCON          → Genre
  TDRC          → Generation year/timestamp
  TRCK          → Track number (sequential per station)
  TBPM          → Estimated BPM
  TCOM          → Composer ("AetherWave AI")
  TPUB          → Publisher (station name)
  TCOP          → Copyright notice (AI license)
  TSSE          → Encoder info
  USLT          → Full script / lyrics
  APIC          → Album art (1600×1600 JPG from Nano Banana 2)
  COMM          → Provenance string
  TXXX:Lore_Ledger   → Full JSON blob (LoreLedger schema)
  TXXX:Station_ID    → Station UUID
  TXXX:Voice_Seed    → Persona voice seed
  TXXX:Style_Seed    → Station style seed
  WXXX          → Station/project URL
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from mutagen.id3 import (
    APIC,
    COMM,
    ID3,
    TALB,
    TBPM,
    TCOM,
    TCON,
    TCOP,
    TDRC,
    TIT2,
    TPE1,
    TPE2,
    TPUB,
    TRCK,
    TSSE,
    TXXX,
    USLT,
    WXXX,
)

from app.models.persona import LoreLedger

logger = logging.getLogger(__name__)

_PROVENANCE = "Synthesized via AetherWave Labs. Engines: Lyria-3/Gemini-3/Nano-2."
_ENCODER = "AetherWave v1.0.4 / Lyria-3 / Gemini-2.0-Flash"
_COPYRIGHT = "AI-generated content. Royalty-free license for commercial use via Google Cloud AI Platform."


def imprint(
    mp3_path: str | Path,
    *,
    artist_name: str,
    station_name: str,
    track_title: str,
    script_text: str,
    lore_ledger: LoreLedger,
    art_path: str | Path | None = None,
    genre: str = "",
    mood: str = "",
    track_number: int | None = None,
    bpm: int | None = None,
    station_id: str = "",
    voice_seed: str = "",
    style_seed: str = "",
    station_url: str = "",
) -> None:
    """
    Stamp a finished MP3 with all Lore-Shard metadata.

    This is called once at the end of the Celery synthesis pipeline,
    after Lyria has rendered the audio file.  Embeds 18+ ID3v2.4 tags
    for maximum metadata richness.
    """
    mp3_path = Path(mp3_path)
    if not mp3_path.exists():
        raise FileNotFoundError(f"MP3 not found: {mp3_path}")

    # Load or create ID3 header
    try:
        tags = ID3(str(mp3_path))
    except Exception:
        from mutagen.id3 import ID3 as _ID3
        tags = _ID3()

    now = datetime.now(timezone.utc)

    # ── Core identity tags ────────────────────────────────────────
    tags["TIT2"] = TIT2(encoding=3, text=[track_title])
    tags["TPE1"] = TPE1(encoding=3, text=[artist_name])
    tags["TALB"] = TALB(encoding=3, text=[station_name])
    tags["TPE2"] = TPE2(encoding=3, text=[station_name])  # Album artist for grouping

    # ── Classification ────────────────────────────────────────────
    if genre:
        tags["TCON"] = TCON(encoding=3, text=[genre])

    # ── Timestamps ────────────────────────────────────────────────
    tags["TDRC"] = TDRC(encoding=3, text=[now.strftime("%Y-%m-%dT%H:%M:%S")])

    # ── Track numbering ───────────────────────────────────────────
    if track_number is not None:
        tags["TRCK"] = TRCK(encoding=3, text=[str(track_number)])

    # ── BPM ───────────────────────────────────────────────────────
    if bpm is not None:
        tags["TBPM"] = TBPM(encoding=3, text=[str(bpm)])

    # ── Credits ───────────────────────────────────────────────────
    tags["TCOM"] = TCOM(encoding=3, text=["AetherWave AI"])
    tags["TPUB"] = TPUB(encoding=3, text=[station_name])
    tags["TCOP"] = TCOP(encoding=3, text=[f"© {now.year} {_COPYRIGHT}"])
    tags["TSSE"] = TSSE(encoding=3, text=[_ENCODER])

    # ── Script / Lyrics ───────────────────────────────────────────
    tags["USLT::eng"] = USLT(encoding=3, lang="eng", desc="", text=script_text)

    # ── Provenance ────────────────────────────────────────────────
    tags["COMM::eng"] = COMM(
        encoding=3, lang="eng", desc="", text=[_PROVENANCE]
    )

    # ── URL ───────────────────────────────────────────────────────
    if station_url:
        tags["WXXX:Station"] = WXXX(encoding=3, desc="Station", url=station_url)

    # ── Lore Ledger (the DNA payload) ─────────────────────────────
    ledger_json = lore_ledger.model_dump_json()
    tags["TXXX:Lore_Ledger"] = TXXX(
        encoding=3, desc="Lore_Ledger", text=[ledger_json]
    )

    # ── Extended TXXX metadata ────────────────────────────────────
    if station_id:
        tags["TXXX:Station_ID"] = TXXX(encoding=3, desc="Station_ID", text=[station_id])
    if voice_seed:
        tags["TXXX:Voice_Seed"] = TXXX(encoding=3, desc="Voice_Seed", text=[voice_seed])
    if style_seed:
        tags["TXXX:Style_Seed"] = TXXX(encoding=3, desc="Style_Seed", text=[style_seed])
    if mood:
        tags["TXXX:Mood"] = TXXX(encoding=3, desc="Mood", text=[mood])

    # ── Album art ─────────────────────────────────────────────────
    if art_path is not None:
        art_path = Path(art_path)
        if art_path.exists():
            tags["APIC:Cover"] = APIC(
                encoding=3,
                mime="image/jpeg",
                type=3,  # Cover (front)
                desc="Cover",
                data=art_path.read_bytes(),
            )
        else:
            logger.warning("Art file not found, skipping APIC: %s", art_path)

    tags.save(str(mp3_path), v2_version=4)
    logger.info("Imprinted %d Lore-Shard tags on %s", len(tags.keys()), mp3_path.name)


def read_lore_ledger(mp3_path: str | Path) -> Optional[LoreLedger]:
    """
    Extract the Lore_Ledger JSON from an existing MP3.

    Returns None if the tag is missing or corrupt.
    """
    mp3_path = Path(mp3_path)
    try:
        tags = ID3(str(mp3_path))
    except Exception:
        return None

    txxx = tags.get("TXXX:Lore_Ledger")
    if txxx is None:
        return None

    try:
        raw = txxx.text[0] if txxx.text else None
        if raw is None:
            return None
        data = json.loads(raw)
        return LoreLedger(**data)
    except Exception as exc:
        logger.warning("Corrupt Lore_Ledger in %s: %s", mp3_path, exc)
        return None
