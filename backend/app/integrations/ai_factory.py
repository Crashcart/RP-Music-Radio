"""
AI Factory — intelligently selects between Ollama (local) and Gemini (cloud).

Strategy:
1. Try Ollama first if OLLAMA_ENABLED=true (fast local processing)
2. If Ollama is unavailable, automatically fallback to Gemini (cloud)
3. If OLLAMA_ENABLED=false, use Gemini directly
4. Automatic health checking and fallback detection

Supported modes:
- HYBRID (default): Try Ollama → fallback to Gemini on failure
- OLLAMA_ONLY: Use Ollama exclusively (fails if unavailable)
- GEMINI_ONLY: Use Gemini exclusively (ignore Ollama)
- CLOUD_FALLBACK: Use Ollama with automatic cloud fallback

This enables:
✓ Fast local processing when Ollama is running
✓ Automatic cloud failover if Ollama goes down
✓ No manual switching needed
✓ Transparent to application code
"""

from __future__ import annotations

import logging
import os
from typing import Union

from app.integrations.gemini_client import GeminiClient
from app.integrations.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

AIClient = Union[GeminiClient, OllamaClient]


class HybridAIClient:
    """
    Hybrid AI client that tries Ollama first, then falls back to Gemini.

    Provides transparent failover: if Ollama goes down during operation,
    automatically switches to Gemini without interrupting the application.
    """

    def __init__(
        self,
        prefer_ollama: bool = True,
        auto_fallback: bool = True,
    ):
        """
        Initialize hybrid client.

        Args:
            prefer_ollama: If True, try Ollama first; if False, prefer Gemini
            auto_fallback: If True, automatically fallback to Gemini if Ollama unavailable
        """
        self.prefer_ollama = prefer_ollama
        self.auto_fallback = auto_fallback
        self._ollama_client = OllamaClient()
        self._gemini_client = GeminiClient()
        self._ollama_available = None  # Cache availability status
        self._active_client = None  # Track which client is actively being used

    def _check_ollama_available(self) -> bool:
        """Check if Ollama is available (with caching)."""
        if self._ollama_available is None:
            self._ollama_available = self._ollama_client._is_available()
        return self._ollama_available

    def _invalidate_cache(self) -> None:
        """Invalidate availability cache when a request fails."""
        self._ollama_available = None

    def generate_script(self, **kwargs) -> dict:
        """
        Generate script using best available AI service.

        If prefer_ollama=True and Ollama is available, uses Ollama.
        If Ollama fails or unavailable, falls back to Gemini.
        """
        if self.prefer_ollama and self._check_ollama_available():
            logger.info("Using Ollama for script generation (local)")
            try:
                result = self._ollama_client.generate_script(**kwargs)
                self._active_client = "ollama"
                return result
            except Exception as exc:
                logger.warning(
                    "Ollama script generation failed: %s. Falling back to Gemini.",
                    exc,
                    exc_info=True,
                )
                self._invalidate_cache()
                if not self.auto_fallback:
                    raise
                # Fall through to Gemini

        # Use Gemini as primary or fallback
        logger.info("Using Gemini for script generation (cloud)")
        try:
            result = self._gemini_client.generate_script(**kwargs)
            self._active_client = "gemini"
            return result
        except Exception as exc:
            logger.error("Gemini script generation failed: %s", exc, exc_info=True)
            raise

    def generate_system_prompt(self, **kwargs) -> dict:
        """Generate system prompt (if client supports it)."""
        if self.prefer_ollama and self._check_ollama_available():
            try:
                return self._ollama_client.generate_system_prompt(**kwargs)
            except Exception as exc:
                logger.warning("Ollama prompt generation failed: %s", exc)
                if not self.auto_fallback:
                    raise
        return self._gemini_client.generate_system_prompt(**kwargs)

    def is_ollama_active(self) -> bool:
        """Check if Ollama is currently the active client."""
        return self._active_client == "ollama"

    def is_gemini_active(self) -> bool:
        """Check if Gemini is currently the active client."""
        return self._active_client == "gemini"

    def get_active_client_name(self) -> str:
        """Return name of currently active client."""
        return self._active_client or ("ollama" if self.prefer_ollama else "gemini")

    def health_check(self) -> dict:
        """Check health of both AI services."""
        ollama_ok = self._ollama_client._is_available()
        gemini_ok = (
            self._gemini_client._is_available()
            if hasattr(self._gemini_client, "_is_available")
            else True
        )

        return {
            "ollama": {
                "available": ollama_ok,
                "host": self._ollama_client.host,
                "model": self._ollama_client.model,
            },
            "gemini": {
                "available": gemini_ok,
                "configured": bool(os.getenv("GOOGLE_API_KEY", "").strip()),
            },
            "active_client": self.get_active_client_name(),
            "auto_fallback_enabled": self.auto_fallback,
        }


def get_ai_client() -> AIClient:
    """
    Get the configured AI client based on environment variables.

    Environment variables:
    - OLLAMA_ENABLED: "true"/"false" (default: true)
    - OLLAMA_AUTO_FALLBACK: "true"/"false" (default: true)
    - OLLAMA_HOST: Ollama API endpoint (default: http://localhost:11434)
    - OLLAMA_MODEL: Model to use (default: mistral)
    - GOOGLE_API_KEY: Gemini API key (required for cloud fallback)
    - AI_PREFER_CLOUD: If "true", prefer Gemini over Ollama

    Modes:
    - Default (OLLAMA_ENABLED=true): Hybrid mode with automatic fallback
    - OLLAMA_ENABLED=false, GOOGLE_API_KEY set: Gemini only
    - OLLAMA_ENABLED=false, no API key: Ollama fallback only

    Returns:
        HybridAIClient or specific client instance
    """
    use_ollama = os.getenv("OLLAMA_ENABLED", "true").lower() == "true"
    auto_fallback = os.getenv("OLLAMA_AUTO_FALLBACK", "true").lower() == "true"
    prefer_cloud = os.getenv("AI_PREFER_CLOUD", "false").lower() == "true"
    has_gemini_key = bool(os.getenv("GOOGLE_API_KEY", "").strip())

    # Hybrid mode: try local Ollama first, fallback to cloud on failure
    if use_ollama and auto_fallback:
        logger.info("AI Client: Hybrid mode (try Ollama → fallback to Gemini)")
        return HybridAIClient(prefer_ollama=not prefer_cloud, auto_fallback=True)

    # Ollama only (no fallback)
    if use_ollama and not auto_fallback:
        logger.info("AI Client: Ollama only (no automatic fallback)")
        return OllamaClient()

    # Gemini only
    if not use_ollama and has_gemini_key:
        logger.info("AI Client: Gemini only")
        return GeminiClient()

    # Fallback cascade
    if not use_ollama and not has_gemini_key:
        logger.warning("AI Client: No cloud key, falling back to Ollama")
        return OllamaClient()

    # Default: Hybrid
    logger.info("AI Client: Hybrid mode (default)")
    return HybridAIClient(prefer_ollama=not prefer_cloud, auto_fallback=True)


def get_ai_client_for_task(task_name: str) -> AIClient:
    """
    Get AI client with task-specific configuration.

    For most tasks, the default client works fine. Some tasks could prefer:
    - "synthesis": Prefer Ollama for speed
    - "research": Prefer Gemini for quality
    - "brainstorm": Either, use default

    Args:
        task_name: Name of the task (e.g., "synthesis", "research", "brainstorm")

    Returns:
        Appropriate AI client for the task
    """
    # For now, just use the default client
    # In the future, could route different tasks to different models
    return get_ai_client()
