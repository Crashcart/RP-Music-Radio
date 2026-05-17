"""
Ollama Client — local LLM alternative to Gemini for script generation.

Uses Ollama (https://ollama.ai) to run open-source models locally:
  1. Generate radio DJ scripts with dialogue and ad reads
  2. Generate backstories and character development
  3. Create market research ads (fallback when Gemini unavailable)
  4. Apply the Filler Protocol when data is sparse

Compatible with any model that supports text generation (llama2, mistral, neural-chat, etc).
"""

from __future__ import annotations

import json
import logging
import os
import requests
from typing import Optional

logger = logging.getLogger(__name__)

# ── Prompt template ──────────────────────────────────────────────────

_SCRIPT_PROMPT = """
You are the Director for AetherWave, a procedural radio content factory.
Generate a complete radio DJ script package for a fictional radio station.

## Input Seeds
- Station: {station_name}
- DJ/Artist: {artist_name}
- Genre: {genre}
- Mood: {mood}
- Items to advertise: {items}
- Existing backstory: {backstory}
- Known habits: {habits}
- Filler Protocol: {filler_enabled}

## Requirements
1. Write a 2-3 minute DJ dialogue script with natural radio cadence
2. Include at least one 15-second ad read for the items listed
3. Add personality quirks and character-consistent dialogue
4. If "Filler Protocol" is enabled and data is sparse, inject procedural quirks:
   - Random station PSAs ("Internal Gravity Safety Announcement")
   - DJ habits ("clicks pen during silence", "hums between segments")
   - Station takeover announcements
   - Fictional sponsor reads
5. Generate a compelling backstory if none exists
6. Create market research copy for any items listed

## Output Format
Return ONLY valid JSON with these fields:
{{
  "track_title": "string — creative track/episode title",
  "script": "string — full DJ dialogue script (2-3 min reading time)",
  "backstory": "string — character backstory (keep existing if provided, expand if sparse)",
  "market_research": "string — in-universe ad copy for the items",
  "ad_reads": ["list of 15-second ad scripts"],
  "personality_notes": ["list of character quirks used in this script"]
}}

IMPORTANT: Return ONLY the JSON object. No markdown, no code fences, no explanation.
All content must be fictional. No real people, brands, or trademarks.
""".strip()


class OllamaClient:
    """
    Generates scripts and lore via local Ollama instance.

    The client calls Ollama's /api/generate endpoint and parses JSON responses.
    Falls back gracefully if Ollama is unavailable.
    """

    def __init__(
        self,
        host: str | None = None,
        model: str | None = None,
    ) -> None:
        """
        Initialize Ollama client.

        Args:
            host: Ollama API endpoint (default: OLLAMA_HOST env var or http://localhost:11434)
            model: Model name to use (default: OLLAMA_MODEL env var or mistral)
        """
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "mistral")
        self.api_endpoint = f"{self.host}/api/generate"

        logger.debug(
            "Ollama client initialized: host=%s model=%s",
            self.host,
            self.model,
        )

    def _is_available(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            response = requests.get(
                f"{self.host}/api/tags",
                timeout=2,
            )
            return response.status_code == 200
        except Exception as e:
            logger.debug("Ollama availability check failed: %s", e)
            return False

    def generate_script(
        self,
        *,
        station_name: str,
        artist_name: str,
        genre: str = "",
        mood: str = "",
        items: str = "",
        backstory: str = "",
        habits: list[str] | None = None,
        filler_enabled: bool = True,
    ) -> dict:
        """
        Generate a complete script package for a radio track via Ollama.

        Returns a dict with keys: track_title, script, backstory,
        market_research, ad_reads, personality_notes.
        """
        if not self._is_available():
            logger.error("Ollama is not available at %s", self.host)
            return self._fallback_response(station_name, artist_name, backstory)

        prompt = _SCRIPT_PROMPT.format(
            station_name=station_name or "Unknown Station",
            artist_name=artist_name or "Unknown DJ",
            genre=genre or "varied",
            mood=mood or "energetic",
            items=items or "(none — use Filler Protocol)",
            backstory=backstory or "(generate new backstory)",
            habits=", ".join(habits) if habits else "(discover new habits)",
            filler_enabled="YES — inject procedural quirks" if filler_enabled else "NO",
        )

        try:
            response = requests.post(
                self.api_endpoint,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.85,
                        "num_predict": 4096,
                    },
                },
                timeout=120,
            )
            response.raise_for_status()

            data = response.json()
            raw_text = data.get("response", "").strip()

            if not raw_text:
                logger.error("Ollama returned empty response")
                return self._fallback_response(station_name, artist_name, backstory)

            # Try to parse JSON from response
            # Some models may wrap JSON in markdown, so strip those if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()

            result = json.loads(raw_text)

            logger.info(
                "Ollama generated script for %s on %s: '%s'",
                artist_name,
                station_name,
                result.get("track_title", "untitled"),
            )

            return result

        except json.JSONDecodeError as exc:
            logger.error("Ollama returned invalid JSON: %s", exc, exc_info=True)
            return self._fallback_response(station_name, artist_name, backstory)

        except requests.RequestException as exc:
            logger.error("Ollama API call failed: %s", exc, exc_info=True)
            return self._fallback_response(station_name, artist_name, backstory)

        except Exception as exc:
            logger.error("Unexpected error calling Ollama: %s", exc, exc_info=True)
            return self._fallback_response(station_name, artist_name, backstory)

    def _fallback_response(
        self, station_name: str, artist_name: str, backstory: str
    ) -> dict:
        """Return a minimal fallback response when Ollama is unavailable."""
        return {
            "track_title": f"{station_name} - {artist_name}",
            "script": f"DJ {artist_name} presents a show on {station_name}.",
            "backstory": backstory or f"An artist performing on {station_name}.",
            "market_research": "Supporting local talent and community radio.",
            "ad_reads": [
                f"This segment of {station_name} is brought to you by AetherWave."
            ],
            "personality_notes": ["Resilient and professional"],
        }
