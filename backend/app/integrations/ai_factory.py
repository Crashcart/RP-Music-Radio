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
from dataclasses import dataclass
from enum import Enum
from typing import Union

try:
    import psutil
except ImportError:
    psutil = None

from app.integrations.gemini_client import GeminiClient
from app.integrations.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

AIClient = Union[GeminiClient, OllamaClient]


class ModelDetector:
    """
    Detects available Llama models at startup and tests system compatibility.

    Llama models supported:
    - llama2 (7B/13B): Excellent quality, good speed, recommended
    - neural-chat (4.1GB): Fast, good for real-time
    - orca-mini (1.3GB): Low-resource option
    """

    RECOMMENDED_MODELS = ["llama2", "llama2:13b", "neural-chat", "orca-mini", "mistral"]

    @staticmethod
    def detect_available_model(ollama_client: OllamaClient | None = None) -> str | None:
        """
        Detect which Llama model is available and can run with current resources.

        Returns:
            Llama model name if available, None if no models found or Ollama unavailable
        """
        if ollama_client is None:
            ollama_client = OllamaClient()

        # Check if Ollama is available
        if not ollama_client._is_available():
            logger.info("Model detection: Ollama unavailable, will use Gemini cloud")
            return None

        # Get current configuration
        configured_model = os.getenv("OLLAMA_MODEL", "llama2")
        logger.info(
            f"Model detection: Testing configured model '{configured_model}'..."
        )

        # Test configured model
        try:
            # Try to ping the model with a simple request
            result = ollama_client.generate_script(
                character="test",
                setting="test",
                genre="test",
                script_style="short",
                timeout_seconds=5,
            )
            if result:
                logger.info(
                    f"✓ Model detection SUCCESS: '{configured_model}' is available and working"
                )
                return configured_model
        except Exception as exc:
            logger.warning(
                f"Model detection: '{configured_model}' test failed: {exc}. Trying alternatives..."
            )

        # Try recommended models in order
        for model in ModelDetector.RECOMMENDED_MODELS:
            if model == configured_model:
                continue  # Already tried this one

            logger.info(f"Model detection: Testing '{model}'...")
            try:
                # Update client model temporarily
                original_model = ollama_client.model
                ollama_client.model = model

                result = ollama_client.generate_script(
                    character="test",
                    setting="test",
                    genre="test",
                    script_style="short",
                    timeout_seconds=5,
                )

                if result:
                    logger.info(
                        f"✓ Model detection SUCCESS: Found working model '{model}'"
                    )
                    return model

            except Exception as exc:
                logger.debug(f"Model detection: '{model}' not available: {exc}")
            finally:
                ollama_client.model = original_model

        logger.warning(
            "Model detection: No Llama models available locally. System will use Gemini cloud with automatic fallback."
        )
        return None

    @staticmethod
    def get_model_info(model_name: str) -> dict:
        """Get information about a specific model."""
        model_info = {
            "llama2": {
                "description": "Meta Llama 2 (7B or 13B)",
                "recommended": True,
                "size_gb": 3.8,  # 7B variant
                "speed": "good",
                "quality": "excellent",
                "use_case": "General purpose, high quality",
            },
            "llama2:13b": {
                "description": "Meta Llama 2 (13B)",
                "recommended": True,
                "size_gb": 7.3,
                "speed": "moderate",
                "quality": "excellent",
                "use_case": "Best quality, requires more RAM",
            },
            "neural-chat": {
                "description": "Intel Neural Chat",
                "recommended": False,
                "size_gb": 4.1,
                "speed": "very fast",
                "quality": "good",
                "use_case": "Real-time applications",
            },
            "orca-mini": {
                "description": "Orca Mini (low resource)",
                "recommended": False,
                "size_gb": 1.3,
                "speed": "extremely fast",
                "quality": "fair",
                "use_case": "Very limited RAM environments",
            },
            "mistral": {
                "description": "Mistral (7B)",
                "recommended": False,
                "size_gb": 4.0,
                "speed": "fast",
                "quality": "good",
                "use_case": "Speed over quality",
            },
        }
        return model_info.get(model_name, {})


@dataclass
class SystemResources:
    """System resource information for model selection."""

    cpu_count: int  # Number of CPU cores
    cpu_percent: float  # Current CPU usage (0-100)
    memory_total_gb: float  # Total RAM in GB
    memory_available_gb: float  # Available RAM in GB
    memory_percent: float  # Memory usage (0-100)
    gpu_available: bool  # Whether GPU is detected
    gpu_memory_gb: float  # GPU memory in GB (0 if not available)

    @staticmethod
    def get_current() -> SystemResources:
        """Get current system resource information."""
        if psutil is None:
            # Fallback if psutil not available
            return SystemResources(
                cpu_count=1,
                cpu_percent=0,
                memory_total_gb=8,
                memory_available_gb=4,
                memory_percent=50,
                gpu_available=False,
                gpu_memory_gb=0,
            )

        try:
            cpu_count = psutil.cpu_count(logical=True) or 1
            cpu_percent = psutil.cpu_percent(interval=0.1)
            mem_info = psutil.virtual_memory()
            memory_total_gb = mem_info.total / (1024**3)
            memory_available_gb = mem_info.available / (1024**3)
            memory_percent = mem_info.percent

            # GPU detection (check for NVIDIA CUDA capability)
            gpu_available = False
            gpu_memory_gb = 0
            try:
                import subprocess

                result = subprocess.run(
                    [
                        "nvidia-smi",
                        "--query-gpu=memory.total",
                        "--format=csv,noheader,nounits",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if result.returncode == 0:
                    gpu_memory_mb = int(result.stdout.strip().split()[0])
                    gpu_available = gpu_memory_mb > 0
                    gpu_memory_gb = gpu_memory_mb / 1024
            except (
                ImportError,
                FileNotFoundError,
                subprocess.TimeoutExpired,
                Exception,
            ):
                # GPU detection failed; that's okay
                pass

            return SystemResources(
                cpu_count=cpu_count,
                cpu_percent=cpu_percent,
                memory_total_gb=memory_total_gb,
                memory_available_gb=memory_available_gb,
                memory_percent=memory_percent,
                gpu_available=gpu_available,
                gpu_memory_gb=gpu_memory_gb,
            )
        except Exception as exc:
            logger.warning("Failed to get system resources: %s", exc)
            return SystemResources(
                cpu_count=1,
                cpu_percent=0,
                memory_total_gb=8,
                memory_available_gb=4,
                memory_percent=50,
                gpu_available=False,
                gpu_memory_gb=0,
            )

    def can_fit_model(self, model_size_gb: float, buffer_gb: float = 2) -> bool:
        """Check if a model can fit in available memory with safety buffer."""
        required_gb = model_size_gb + buffer_gb
        return self.memory_available_gb >= required_gb

    def recommended_model_size(self) -> str:
        """Recommend model size based on available resources."""
        available = self.memory_available_gb
        if available < 2:
            return "tiny"  # Sub-1GB models (tiny, minimal)
        elif available < 4:
            return "small"  # 1-3GB models
        elif available < 8:
            return "medium"  # 4-7GB models (mistral: 4GB, llama2: 3.8GB)
        elif available < 16:
            return "large"  # 8-13GB models (neural-chat: 4.1GB, orca-mini: 1.3GB)
        else:
            return "xlarge"  # 13GB+ models (neural-chat: 4.1GB, larger variants)

    def __str__(self) -> str:
        """Human-readable resource summary."""
        gpu_str = f", GPU: {self.gpu_memory_gb:.1f}GB" if self.gpu_available else ""
        return (
            f"CPU: {self.cpu_count} cores ({self.cpu_percent:.1f}% used), "
            f"RAM: {self.memory_available_gb:.1f}GB / {self.memory_total_gb:.1f}GB"
            f"{gpu_str}"
        )


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
        self._system_resources = None  # Cache system resources
        self._resources_cache_time = None  # Time of last resources check

    def get_system_resources(self) -> SystemResources:
        """Get current system resources, with caching."""
        resources = SystemResources.get_current()
        self._system_resources = resources
        return resources

    def get_recommended_model(self) -> str:
        """
        Get recommended Ollama model based on available system resources.

        Returns:
            Recommended model size: "tiny", "small", "medium", "large", or "xlarge"
        """
        resources = self.get_system_resources()
        recommended = resources.recommended_model_size()
        logger.info(
            "Resource-aware model selection: %s → recommended=%s",
            resources,
            recommended,
        )
        return recommended

    def can_run_ollama(self) -> bool:
        """Check if Ollama can run with current system resources."""
        resources = self.get_system_resources()
        # Ollama + small model needs ~2-4GB; large models need 8GB+
        # Be conservative and require at least 2GB available
        return resources.memory_available_gb >= 2

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

    def get_debug_info(self) -> dict:
        """Get comprehensive debugging information about AI selection and resources."""
        resources = self.get_system_resources()
        ollama_ok = self._ollama_client._is_available()

        return {
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "active_client": self.get_active_client_name(),
            "prefer_ollama": self.prefer_ollama,
            "auto_fallback_enabled": self.auto_fallback,
            "ollama_available": ollama_ok,
            "ollama_host": self._ollama_client.host,
            "ollama_model": self._ollama_client.model,
            "ollama_can_run": self.can_run_ollama(),
            "system_resources": {
                "cpu_count": resources.cpu_count,
                "cpu_percent": resources.cpu_percent,
                "memory_available_gb": round(resources.memory_available_gb, 2),
                "memory_total_gb": round(resources.memory_total_gb, 2),
                "memory_percent": resources.memory_percent,
                "gpu_available": resources.gpu_available,
                "gpu_memory_gb": round(resources.gpu_memory_gb, 2),
            },
            "model_recommendation": {
                "recommended_size": resources.recommended_model_size(),
                "explanation": self._get_model_recommendation_explanation(resources),
            },
            "configuration": {
                "OLLAMA_ENABLED": os.getenv("OLLAMA_ENABLED", "true"),
                "OLLAMA_AUTO_FALLBACK": os.getenv("OLLAMA_AUTO_FALLBACK", "true"),
                "AI_PREFER_CLOUD": os.getenv("AI_PREFER_CLOUD", "false"),
            },
        }

    def _get_model_recommendation_explanation(self, resources: SystemResources) -> str:
        """Get human-readable explanation of model recommendation."""
        available = resources.memory_available_gb
        if available < 2:
            return "Very limited RAM: can only run tiny models (sub-1GB)"
        elif available < 4:
            return "Limited RAM: recommended for small models (1-3GB), e.g., orca-mini"
        elif available < 8:
            return "Moderate RAM: good for medium models (4-7GB), e.g., mistral, llama2"
        elif available < 16:
            return "Good RAM: can run larger models (8-13GB), e.g., neural-chat, larger variants"
        else:
            return (
                "Excellent RAM: can run very large models (13GB+), optimal for quality"
            )

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
        """Check health of both AI services and system resources."""
        ollama_ok = self._ollama_client._is_available()
        gemini_ok = (
            self._gemini_client._is_available()
            if hasattr(self._gemini_client, "_is_available")
            else True
        )

        resources = self.get_system_resources()
        recommended_model = resources.recommended_model_size()

        return {
            "ollama": {
                "available": ollama_ok,
                "host": self._ollama_client.host,
                "model": self._ollama_client.model,
                "can_run": self.can_run_ollama(),
            },
            "gemini": {
                "available": gemini_ok,
                "configured": bool(os.getenv("GOOGLE_API_KEY", "").strip()),
            },
            "system_resources": {
                "cpu_cores": resources.cpu_count,
                "cpu_percent": resources.cpu_percent,
                "memory_available_gb": resources.memory_available_gb,
                "memory_total_gb": resources.memory_total_gb,
                "memory_percent": resources.memory_percent,
                "gpu_available": resources.gpu_available,
                "gpu_memory_gb": resources.gpu_memory_gb,
                "recommended_model_size": recommended_model,
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
