"""
AI Factory — intelligently selects between Ollama (local) and Gemini (cloud).

Strategy:
1. Try Ollama first if OLLAMA_ENABLED=true (fast local processing)
2. If Ollama is unavailable, automatically fallback to Gemini (cloud)
3. If OLLAMA_ENABLED=false, use Gemini directly
4. Automatic health checking and fallback detection
5. Task-aware selection: choose best AI for specific task type

Supported modes:
- HYBRID (default): Try Ollama → fallback to Gemini on failure
- OLLAMA_ONLY: Use Ollama exclusively (fails if unavailable)
- GEMINI_ONLY: Use Gemini exclusively (ignore Ollama)
- CLOUD_FALLBACK: Use Ollama with automatic cloud fallback

Task types:
- image_generation: Generate images (may prefer speed or quality)
- script_generation: Generate scripts/stories
- synthesis: Audio/media synthesis
- brainstorm: Creative ideation

This enables:
✓ Fast local processing when Ollama is running
✓ Automatic cloud failover if Ollama goes down
✓ Task-aware selection of best available AI
✓ No manual switching needed
✓ Transparent to application code
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from typing import Union

from app.integrations.gemini_client import GeminiClient
from app.integrations.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

AIClient = Union[GeminiClient, OllamaClient]


class TaskType(Enum):
    """Task categories for intelligent AI selection."""

    IMAGE_GENERATION = "image_generation"
    SCRIPT_GENERATION = "script_generation"
    SYNTHESIS = "synthesis"
    BRAINSTORM = "brainstorm"
    TRANSCRIPTION = "transcription"
    GENERIC = "generic"


class TaskPreference:
    """Preferences for task-aware AI selection."""

    def __init__(
        self,
        task_type: TaskType,
        prefer_speed: bool = False,
        prefer_quality: bool = False,
        prefer_offline: bool = False,
    ):
        """
        Initialize task preference.

        Args:
            task_type: Type of task
            prefer_speed: Prefer faster response (usually Ollama)
            prefer_quality: Prefer higher quality output (usually Gemini)
            prefer_offline: Strongly prefer local Ollama (fail rather than use cloud)
        """
        self.task_type = task_type
        self.prefer_speed = prefer_speed
        self.prefer_quality = prefer_quality
        self.prefer_offline = prefer_offline

    @staticmethod
    def for_image_generation(prefer_speed: bool = False) -> TaskPreference:
        """Create preference for image generation."""
        return TaskPreference(
            TaskType.IMAGE_GENERATION,
            prefer_speed=prefer_speed,
            prefer_quality=not prefer_speed,
        )

    @staticmethod
    def for_script_generation(prefer_quality: bool = True) -> TaskPreference:
        """Create preference for script generation."""
        return TaskPreference(
            TaskType.SCRIPT_GENERATION,
            prefer_quality=prefer_quality,
        )

    @staticmethod
    def for_synthesis(prefer_offline: bool = False) -> TaskPreference:
        """Create preference for synthesis/media tasks."""
        return TaskPreference(
            TaskType.SYNTHESIS,
            prefer_offline=prefer_offline,
        )


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

    def select_best_client(self, preference: TaskPreference | None = None) -> str:
        """
        Select the best available AI client based on task preference.

        Intelligent selection prioritizes:
        1. Task-specific preferences (speed, quality, offline)
        2. Service availability
        3. Fallback chain (prefer_ollama → auto_fallback → gemini)

        Args:
            preference: Task preference (None uses default strategy)

        Returns:
            Name of selected client: "ollama" or "gemini"
        """
        if preference is None:
            # Default: use standard preference logic
            if self.prefer_ollama and self._check_ollama_available():
                return "ollama"
            elif self._check_ollama_available():
                return "ollama"
            elif self.auto_fallback:
                return "gemini"
            else:
                return "ollama"  # Fail on Ollama if no fallback

        # Task-aware selection
        ollama_available = self._check_ollama_available()
        gemini_available = True  # Assume Gemini available if key is set

        # Strong offline preference: must use Ollama
        if preference.prefer_offline:
            if not ollama_available:
                logger.warning(
                    "Offline preference set but Ollama unavailable for %s",
                    preference.task_type.value,
                )
            return "ollama"

        # Quality preference: prefer Gemini, fallback to Ollama if unavailable
        if preference.prefer_quality:
            if gemini_available:
                return "gemini"
            elif ollama_available:
                logger.info(
                    "Quality preference set, but Gemini unavailable, using Ollama"
                )
                return "ollama"
            else:
                return "gemini"  # Fail if both unavailable

        # Speed preference: prefer Ollama, fallback to Gemini if unavailable
        if preference.prefer_speed:
            if ollama_available:
                return "ollama"
            elif gemini_available and self.auto_fallback:
                logger.info(
                    "Speed preference set, but Ollama unavailable, using Gemini"
                )
                return "gemini"
            else:
                return "ollama"

        # Default: use standard strategy
        if self.prefer_ollama and ollama_available:
            return "ollama"
        elif gemini_available and self.auto_fallback:
            return "gemini"
        else:
            return "ollama"

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

    Intelligently selects best available AI based on task type:
    - image_generation: Prefer Gemini for quality, fallback to Ollama for speed
    - script_generation: Prefer Gemini for quality/accuracy
    - synthesis: Prefer Ollama for speed, fallback to Gemini
    - brainstorm: Default hybrid (speed + quality balanced)

    Args:
        task_name: Name of the task (e.g., "image_generation", "script_generation", "synthesis")

    Returns:
        HybridAIClient with task-aware selection, or specific client instance
    """
    # Get base client (hybrid if available)
    client = get_ai_client()

    # If it's not a hybrid client, return as-is
    if not isinstance(client, HybridAIClient):
        return client

    # Task-specific preferences
    task_lower = task_name.lower().strip()

    if "image" in task_lower or "art" in task_lower:
        # Image generation: quality is important, accept fallback to Ollama for speed
        pref = TaskPreference.for_image_generation(prefer_speed=False)
        best_client_name = client.select_best_client(pref)
    elif "script" in task_lower or "story" in task_lower or "content" in task_lower:
        # Script/content generation: quality and consistency matter
        pref = TaskPreference.for_script_generation(prefer_quality=True)
        best_client_name = client.select_best_client(pref)
    elif "synthesis" in task_lower or "audio" in task_lower or "media" in task_lower:
        # Synthesis: speed matters more, but quality acceptable
        pref = TaskPreference.for_synthesis(prefer_offline=False)
        best_client_name = client.select_best_client(pref)
    else:
        # Default: use default hybrid behavior
        best_client_name = client.select_best_client()

    # Log selection for debugging
    logger.info(
        "Task-aware AI selection: task=%s → client=%s",
        task_name,
        best_client_name,
    )

    # Return the actual client instance
    if best_client_name == "ollama":
        return client._ollama_client
    else:
        return client._gemini_client
