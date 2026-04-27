"""
Audio Generator — synthesizes music tracks and DJ voice segments
using Google's Lyria API via the google-genai SDK.

Voice consistency is enforced by passing the persona's voice_seed UUID
to every API call.  The same seed always produces the same vocal timbre.

Audio types:
  1. Full Track     — music + DJ dialogue + ad reads (~3-5 min)
  2. Voice Segment  — DJ-only dialogue for station bumpers
  3. Music Bed      — instrumental background for mixing

All generated audio carries a static, immutable SynthID watermark
applied by Google's API.  We additionally stamp licensing metadata
into the final MP3 via mutagen_handler.imprint().

Licensing:
  Google grants a royalty-free license for commercial use of audio
  generated via their API.  The LicenseInfo block is frozen into
  the MP3's Lore_Ledger at imprint time and cannot be modified
  after the fact (the Lore_Ledger is treated as append-only).
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types

from app.models.persona import PersonaDNA, StationStyle
from app.utils.licensing import LicenseInfo

logger = logging.getLogger(__name__)


class AudioType(str, Enum):
    FULL_TRACK = "full_track"
    VOICE_SEGMENT = "voice_segment"
    MUSIC_BED = "music_bed"


# ── Prompt templates ──────────────────────────────────────────────────

_FULL_TRACK_PROMPT = """
Generate a radio track for a fictional radio station.

Voice identity seed: {voice_seed}
Station: {station_name}
DJ/Artist: {artist_name}
Track title: {track_title}
Genre: {genre}
Mood: {mood}
Script/Dialogue:
{script}

Requirements:
- 3-5 minute track with intro, dialogue, music beds, and outro
- DJ voice must match the voice identity seed exactly
- Include natural radio elements: bumpers, transitions, ambient noise
- Music style must match the genre
- 48kHz stereo MP3
- Do NOT reproduce any copyrighted melodies or lyrics
- All content must be original and fictional
""".strip()

_VOICE_SEGMENT_PROMPT = """
Generate a short DJ voice segment for a fictional radio station.

Voice identity seed: {voice_seed}
Station: {station_name}
DJ/Artist: {artist_name}
Genre: {genre}
Script:
{script}

Requirements:
- 15-60 second spoken segment
- Voice must match the voice identity seed exactly
- Natural radio DJ cadence and delivery
- No background music (voice only)
- 48kHz stereo MP3
""".strip()

_MUSIC_BED_PROMPT = """
Generate an instrumental music bed for a fictional radio station.

Station: {station_name}
Genre: {genre}
Mood: {mood}
Duration: {duration} seconds

Requirements:
- Instrumental only, no vocals
- Suitable for playing under DJ dialogue
- Smooth transitions, loopable feel
- Must match the genre and mood
- 48kHz stereo MP3
- Original composition only, no copyrighted material
""".strip()

_AUDIO_PROMPTS = {
    AudioType.FULL_TRACK: _FULL_TRACK_PROMPT,
    AudioType.VOICE_SEGMENT: _VOICE_SEGMENT_PROMPT,
    AudioType.MUSIC_BED: _MUSIC_BED_PROMPT,
}


class AudioGenerator:
    """
    Generates audio via Google's Lyria API and saves to the host volume.

    The voice_seed from PersonaDNA is passed to every call for a given
    DJ, guaranteeing the same vocal timbre across all tracks.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "lyria-realtime-exp",
        output_dir: str | Path = "/app/output/audio",
    ) -> None:
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY", "")
        self.model = model
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not set — audio generation will fail")

        self.client = genai.Client(api_key=self.api_key)

    def generate(
        self,
        audio_type: AudioType,
        *,
        station: StationStyle,
        persona: PersonaDNA | None = None,
        track_title: str = "",
        genre: str = "",
        script: str = "",
        duration_seconds: int = 180,
    ) -> tuple[Path | None, LicenseInfo]:
        """
        Generate audio and save it to disk.

        Returns a tuple of (path_to_mp3, frozen_license_info).
        The LicenseInfo is static — it captures the exact generation
        parameters and cannot be modified after creation.
        """
        # Build the frozen license BEFORE generation so the timestamp
        # reflects the request time, not the completion time.
        license_info = LicenseInfo.for_generated_audio(
            station_name=station.display_name,
            artist_name=persona.display_name if persona else "",
            voice_seed=persona.voice_seed if persona else "",
        )

        prompt = self._build_prompt(
            audio_type,
            station=station,
            persona=persona,
            track_title=track_title,
            genre=genre,
            script=script,
            duration_seconds=duration_seconds,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=persona.voice_seed if persona else "default",
                            ),
                        ),
                    ),
                ),
            )
        except Exception as exc:
            logger.error("Lyria API call failed: %s", exc)
            return None, license_info

        # Extract audio data from the response
        audio_data = None
        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                    audio_data = part.inline_data.data
                    break

        if audio_data is None:
            logger.error("Lyria returned no audio data")
            return None, license_info

        # ── Save to disk ──────────────────────────────────────────
        filename = self._make_filename(audio_type, station, persona, track_title)
        out_path = self.output_dir / filename
        out_path.write_bytes(audio_data)
        logger.info("Saved %s audio: %s (%d bytes)",
                     audio_type.value, out_path, len(audio_data))

        return out_path, license_info

    def _build_prompt(
        self,
        audio_type: AudioType,
        *,
        station: StationStyle,
        persona: PersonaDNA | None,
        track_title: str,
        genre: str,
        script: str,
        duration_seconds: int,
    ) -> str:
        template = _AUDIO_PROMPTS[audio_type]
        return template.format(
            voice_seed=persona.voice_seed if persona else "N/A",
            station_name=station.display_name,
            artist_name=persona.display_name if persona else "N/A",
            track_title=track_title or "Untitled",
            genre=genre or station.mood or "varied",
            mood=station.mood or "energetic",
            script=script or "(improvise based on character)",
            duration=duration_seconds,
        )

    @staticmethod
    def _make_filename(
        audio_type: AudioType,
        station: StationStyle,
        persona: PersonaDNA | None,
        track_title: str,
    ) -> str:
        import re
        safe = lambda s: re.sub(r"[^a-z0-9]+", "_", s.lower().strip()).strip("_")

        station_slug = safe(station.display_name)
        dj_slug = safe(persona.display_name) if persona else "station"
        track_slug = safe(track_title) if track_title else "untitled"

        if audio_type == AudioType.MUSIC_BED:
            return f"bed_{station_slug}_{track_slug}.mp3"
        elif audio_type == AudioType.VOICE_SEGMENT:
            return f"voice_{station_slug}_{dj_slug}.mp3"
        else:
            return f"{station_slug}_{dj_slug}_{track_slug}.mp3"
