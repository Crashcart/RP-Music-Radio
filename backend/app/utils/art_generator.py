"""
Art Generator — creates album covers, DJ portraits, and station logos
using Google's Imagen API via the google-genai SDK.

Art types:
  1. Album Cover  — 1600×1600 for a specific track
  2. DJ Portrait  — Character art for a DJ/Artist persona
  3. Station Logo  — Branding art for an entire radio station

Style consistency is enforced by including the station's style_seed
and color palette in every prompt, so Imagen produces visually cohesive
results across an entire station's catalog.

Licensing:
  Google grants a royalty-free license for commercial use of images
  generated via their API.  We embed a LicenseInfo block into every
  generated image's metadata and into the Lore_Ledger to maintain
  a clear provenance chain.  See app/utils/licensing.py for details.
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from pathlib import Path

try:
    from google import genai  # type: ignore
    from google.genai import types  # type: ignore
except ImportError:
    pass

from app.models.persona import PersonaDNA, StationStyle
from app.utils.licensing import LicenseInfo, stamp_license_metadata

logger = logging.getLogger(__name__)


class ArtType(str, Enum):
    ALBUM_COVER = "album_cover"
    DJ_PORTRAIT = "dj_portrait"
    STATION_LOGO = "station_logo"
    BRAND_LOGO = "brand_logo"


# ── Prompt templates ──────────────────────────────────────────────────

_ALBUM_COVER_PROMPT = """
Create album cover art for a fictional radio station track.
Style seed reference: {style_seed}
Station: {station_name}
Artist/DJ: {artist_name}
Track title: {track_title}
Genre: {genre}
Mood: {mood}
Color palette: {colors}

Requirements:
- 1600×1600 square format
- No real-world logos, trademarks, or likenesses of real people
- Stylized, abstract or illustrative art appropriate for the genre
- Text elements should use fictional in-universe branding only
- Professional album cover quality
""".strip()

_DJ_PORTRAIT_PROMPT = """
Create a stylized character portrait for a fictional radio DJ.
Style seed reference: {style_seed}
DJ name: {artist_name}
Backstory: {backstory}
Personality traits: {habits}
Station: {station_name}
Genre: {genre}
Color palette: {colors}

Requirements:
- Stylized illustration, NOT photorealistic
- No likenesses of real people
- Character should feel unique and memorable
- Include subtle radio/broadcasting visual elements
- Professional quality character art
""".strip()

_STATION_LOGO_PROMPT = """
Create a logo and branding art for a fictional radio station.
Style seed reference: {style_seed}
Station name: {station_name}
Mood: {mood}
Genre: {genre}
Color palette: {colors}

Requirements:
- Clean, iconic design suitable for branding
- No real-world logos or trademarks
- Fictional in-universe typography and design language
- Should work as both a large banner and small icon
- Professional broadcast media quality
""".strip()

_BRAND_LOGO_PROMPT = """
Create a corporate logo for a fictional in-universe brand/company.
Brand name: {brand_name}
Slogan: {slogan}
Industry: {industry}
Tone: {tone}

Requirements:
- Corporate logo design for fictional company
- Clean, memorable, professional aesthetic
- No real-world logos or trademarks
- Fictional typography and design language
- Should work at any scale (large billboard to small icon)
- Convey brand personality and industry
""".strip()

_PROMPTS = {
    ArtType.ALBUM_COVER: _ALBUM_COVER_PROMPT,
    ArtType.DJ_PORTRAIT: _DJ_PORTRAIT_PROMPT,
    ArtType.STATION_LOGO: _STATION_LOGO_PROMPT,
    ArtType.BRAND_LOGO: _BRAND_LOGO_PROMPT,
}


class ArtGenerator:
    """
    Generates images via Google's Imagen API and saves them with
    licensing metadata to the host volume.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "imagen-3.0-generate-002",
        output_dir: str | Path = "/app/output/art",
    ) -> None:
        import json

        key = api_key or os.getenv("GOOGLE_API_KEY", "")
        if not key:
            for path in ["/app/data/settings.json", "../data/settings.json"]:
                if os.path.exists(path):
                    try:
                        with open(path, "r") as f:
                            key = json.load(f).get("GOOGLE_API_KEY", "")
                            if key:
                                break
                    except Exception:
                        pass
        self.api_key = key
        self.model = model
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Note: API key is optional at init; checked when actually making calls
        if self.api_key:
            logger.debug("Art generator initialized with API key")
        else:
            logger.debug(
                "Art generator initialized without API key (will be needed for image generation)"
            )

        self.client = genai.Client(api_key=self.api_key or "")

    def generate_brand_logo(
        self,
        brand_data: dict,
        brand_style: StationStyle,
    ) -> Path | None:
        """Generate a brand logo from brand metadata."""
        template = _BRAND_LOGO_PROMPT
        prompt = template.format(
            brand_name=brand_data.get("brand_name", "Unknown"),
            slogan=brand_data.get("slogan", ""),
            industry=brand_data.get("industry", ""),
            tone=brand_data.get("tone", ""),
        )

        try:
            response = self.client.models.generate_images(
                model=self.model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type="image/jpeg",
                ),
            )
        except Exception as exc:
            logger.error("Imagen API call failed: %s", exc, exc_info=True)
            return None

        if not response.generated_images:
            logger.error("Imagen returned no images", exc_info=True)
            return None

        image_bytes = response.generated_images[0].image.image_bytes

        # Determine filename
        import re

        safe = lambda s: re.sub(r"[^a-z0-9]+", "_", s.lower().strip()).strip("_")
        brand_slug = safe(brand_data.get("brand_name", "unknown"))
        filename = f"logo_brand_{brand_slug}.jpg"
        out_path = self.output_dir / filename

        out_path.write_bytes(image_bytes)
        logger.info("Saved brand logo: %s", out_path)

        # Stamp licensing metadata
        license_info = LicenseInfo.for_generated_art(
            art_type="brand_logo",
            station_name=brand_style.display_name,
            artist_name="",
            style_seed=brand_style.style_seed,
        )
        stamp_license_metadata(out_path, license_info)

        return out_path

    def generate(
        self,
        art_type: ArtType,
        *,
        station: StationStyle | None = None,
        persona: PersonaDNA | None = None,
        track_title: str = "",
        genre: str = "",
        brand: "BrandStyle" | None = None,
        slogan: str = "",
    ) -> Path | None:
        """
        Generate an image and save it to disk with licensing metadata.

        Returns the path to the saved JPEG, or None on failure.
        """
        prompt = self._build_prompt(
            art_type,
            station=station,
            persona=persona,
            track_title=track_title,
            genre=genre,
        )

        try:
            response = self.client.models.generate_images(
                model=self.model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type="image/jpeg",
                ),
            )
        except Exception as exc:
            logger.error("Imagen API call failed: %s", exc, exc_info=True)
            return None

        if not response.generated_images:
            logger.error("Imagen returned no images", exc_info=True)
            return None

        image_bytes = response.generated_images[0].image.image_bytes

        # ── Determine filename ────────────────────────────────────
        filename = self._make_filename(art_type, station, persona, track_title)
        out_path = self.output_dir / filename

        out_path.write_bytes(image_bytes)
        logger.info("Saved %s art: %s", art_type.value, out_path)

        # ── Stamp licensing metadata into the JPEG ────────────────
        license_info = LicenseInfo.for_generated_art(
            art_type=art_type.value,
            station_name=station.display_name,
            artist_name=persona.display_name if persona else "",
            style_seed=station.style_seed,
        )
        stamp_license_metadata(out_path, license_info)

        return out_path

    def _build_prompt(
        self,
        art_type: ArtType,
        *,
        station: StationStyle,
        persona: PersonaDNA | None,
        track_title: str,
        genre: str,
    ) -> str:
        template = _PROMPTS[art_type]
        colors = ", ".join(station.colors) if station.colors else "auto-select"
        return template.format(
            style_seed=station.style_seed,
            station_name=station.display_name,
            artist_name=persona.display_name if persona else "N/A",
            track_title=track_title or "N/A",
            genre=genre or station.mood or "varied",
            mood=station.mood or "energetic",
            colors=colors,
            backstory=persona.backstory if persona else "",
            habits=", ".join(persona.habits) if persona else "",
        )

    @staticmethod
    def _make_filename(
        art_type: ArtType,
        station: StationStyle,
        persona: PersonaDNA | None,
        track_title: str,
    ) -> str:
        import re

        safe = lambda s: re.sub(r"[^a-z0-9]+", "_", s.lower().strip()).strip("_")

        station_slug = safe(station.display_name)
        if art_type == ArtType.STATION_LOGO:
            return f"logo_{station_slug}.jpg"
        elif art_type == ArtType.DJ_PORTRAIT:
            dj_slug = safe(persona.display_name) if persona else "unknown"
            return f"dj_{dj_slug}_{station_slug}.jpg"
        else:
            dj_slug = safe(persona.display_name) if persona else "unknown"
            track_slug = safe(track_title) if track_title else "untitled"
            return f"cover_{station_slug}_{dj_slug}_{track_slug}.jpg"
