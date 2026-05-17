"""
AI Factory — intelligently selects between Gemini and Ollama for script generation.

Strategy:
1. If GEMINI_ENABLED=false or GOOGLE_API_KEY not set, use Ollama
2. If OLLAMA_ENABLED=true and OLLAMA_HOST is set, try Ollama first, then Gemini as fallback
3. Default to Gemini if API key is available
4. Fall back to Ollama as last resort

This allows local development with Ollama, production with Gemini, or hybrid setups.
"""

from __future__ import annotations

import logging
import os
from typing import Union

from app.integrations.gemini_client import GeminiClient
from app.integrations.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

AIClient = Union[GeminiClient, OllamaClient]


def get_ai_client() -> AIClient:
    """
    Get the configured AI client based on environment variables.

    Environment variables:
    - GEMINI_ENABLED: "true"/"false" (default: true if GOOGLE_API_KEY set)
    - OLLAMA_ENABLED: "true"/"false" (default: false)
    - OLLAMA_HOST: Ollama API endpoint (default: http://localhost:11434)
    - OLLAMA_MODEL: Model to use (default: mistral)
    - GOOGLE_API_KEY: Gemini API key

    Returns:
        GeminiClient or OllamaClient instance
    """
    use_gemini = os.getenv("GEMINI_ENABLED", "true").lower() == "true"
    use_ollama = os.getenv("OLLAMA_ENABLED", "false").lower() == "true"
    has_gemini_key = bool(os.getenv("GOOGLE_API_KEY", "").strip())

    # Strategy 1: Ollama is explicitly enabled
    if use_ollama:
        logger.info("AI Client: Using Ollama (OLLAMA_ENABLED=true)")
        return OllamaClient()

    # Strategy 2: Gemini is available and not disabled
    if use_gemini and has_gemini_key:
        logger.info("AI Client: Using Gemini (GOOGLE_API_KEY present)")
        return GeminiClient()

    # Strategy 3: Gemini disabled or no key, fall back to Ollama
    if not use_gemini or not has_gemini_key:
        logger.info("AI Client: Falling back to Ollama (Gemini disabled or no API key)")
        return OllamaClient()

    # This shouldn't be reached, but just in case
    logger.warning(
        "AI Client: No AI service configured, returning Ollama as last resort"
    )
    return OllamaClient()


def get_ai_client_for_task(task_name: str) -> AIClient:
    """
    Get AI client with task-specific configuration.

    Some tasks may prefer Ollama (fast local scripts) vs Gemini (high-quality).

    Args:
        task_name: Name of the task (e.g., "synthesis", "research", "brainstorm")

    Returns:
        Appropriate AI client for the task
    """
    # For now, just use the default client
    # In the future, could route different tasks to different models
    return get_ai_client()
