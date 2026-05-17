"""
Gemini Client — the "Director" that generates scripts, lore, and market research.

Uses Google's Gemini 3 Flash model via the google-genai SDK to:
  1. Expand user seeds into full DJ scripts with dialogue and ad reads
  2. Generate backstories and character development
  3. Create market research ads (Simple, Flavor, and Filler modes)
  4. Apply the Filler Protocol when data is sparse

The output is a structured dict that feeds into the Celery synthesis pipeline.
"""

from __future__ import annotations

import json
import logging
import os

from google import genai
from google.genai import types

from app.database import SessionLocal
from app.models.database import TokenUsageLog

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


class GeminiClient:
    """
    Generates scripts and lore via Google's Gemini API.

    The client is stateless — all context comes from the prompt parameters.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gemini-2.5-flash",
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

        # Note: API key is optional at init; checked when actually making calls
        if self.api_key:
            logger.debug("Gemini client initialized with API key")
        else:
            logger.debug(
                "Gemini client initialized without API key (will be needed for chat/generation)"
            )

        self.client = genai.Client(api_key=self.api_key or "")

    def _log_token_usage(
        self,
        endpoint: str,
        prompt_tokens: int,
        completion_tokens: int,
        task_id: str | None = None,
    ) -> None:
        try:
            db = SessionLocal()
            log = TokenUsageLog(
                endpoint=endpoint,
                model=self.model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                task_id=task_id,
            )
            db.add(log)
            db.commit()
        except Exception as exc:
            logger.error("Failed to log token usage: %s", exc)
        finally:
            db.close()

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
        Generate a complete script package for a radio track.

        Returns a dict with keys: track_title, script, backstory,
        market_research, ad_reads, personality_notes.
        """
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
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.85,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                ),
            )

            # Extract and log token usage
            try:
                usage = response.usage_metadata
                prompt_tokens = usage.prompt_token_count if usage else 0
                completion_tokens = usage.candidates_token_count if usage else 0
                self._log_token_usage(
                    "generate_script", prompt_tokens, completion_tokens
                )
            except Exception as exc:
                logger.warning("Could not extract token usage: %s", exc)

            # Parse the JSON response
            raw_text = response.text.strip()
            result = json.loads(raw_text)

            logger.info(
                "Gemini generated script for %s on %s: '%s'",
                artist_name,
                station_name,
                result.get("track_title", "untitled"),
            )

            return result

        except json.JSONDecodeError as exc:
            logger.error("Gemini returned invalid JSON: %s", exc, exc_info=True)
            # Return a minimal fallback
            return {
                "track_title": f"{station_name} - {artist_name}",
                "script": response.text if "response" in dir() else "",
                "backstory": backstory,
                "market_research": "",
                "ad_reads": [],
                "personality_notes": [],
            }

        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc, exc_info=True)
            return {
                "track_title": f"{station_name} - {artist_name}",
                "script": "",
                "backstory": backstory,
                "market_research": "",
                "ad_reads": [],
                "personality_notes": [],
            }
