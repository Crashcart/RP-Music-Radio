# Intelligent AI Selection Strategy

**Last Updated**: 2026-05-17  
**Status**: ✅ ACTIVE  
**Purpose**: Automatic selection of best-available AI for different task types

---

## Overview

The AetherWave system now intelligently selects between Ollama (local) and Gemini (cloud) based on the type of task being performed. Rather than always using the same AI service, the system evaluates task requirements and available resources to choose the best option.

## Task Types & Selection Strategy

### Image Generation
```
Task Type: IMAGE_GENERATION
Preference: Quality > Speed
Selection Logic:
  1. If Gemini available → Use Gemini (higher quality images)
  2. If only Ollama available → Use Ollama (graceful fallback)
  3. If neither available → Fail with helpful error

Why: Visual quality matters more than speed for user-facing artwork.
Imaging uses Google Imagen API (always through Gemini), not Ollama.
```

### Script & Content Generation
```
Task Type: SCRIPT_GENERATION
Preference: Quality > Speed
Selection Logic:
  1. If Gemini available → Use Gemini (better accuracy, consistency)
  2. If only Ollama available → Use Ollama (local fallback)
  3. If neither available → Fail with helpful error

Why: Script quality affects entire user experience (lore, dialogue, descriptions).
Consistency matters across an episode.
```

### Audio Synthesis
```
Task Type: SYNTHESIS
Preference: Speed > Quality
Selection Logic:
  1. If Ollama available → Use Ollama (faster local processing)
  2. If only Gemini available → Use Gemini (cloud fallback)
  3. If neither available → Fail

Why: Synthesis is time-sensitive; users prefer fast feedback.
Quality is acceptable from either service.
```

### Brainstorming / Creative Tasks
```
Task Type: BRAINSTORM
Preference: Default Hybrid (balanced)
Selection Logic:
  1. Use global AI_PREFER_CLOUD setting (if set)
  2. Use OLLAMA_ENABLED default
  3. Fall through to available service
  4. Automatic fallback if preferred unavailable

Why: Both services are equally viable for creative work.
Uses system defaults unless overridden.
```

---

## Implementation Details

### TaskType Enum

```python
from app.integrations.ai_factory import TaskType, TaskPreference

class TaskType(Enum):
    IMAGE_GENERATION = "image_generation"
    SCRIPT_GENERATION = "script_generation"
    SYNTHESIS = "synthesis"
    BRAINSTORM = "brainstorm"
    TRANSCRIPTION = "transcription"
    GENERIC = "generic"
```

### TaskPreference Class

```python
class TaskPreference:
    def __init__(
        self,
        task_type: TaskType,
        prefer_speed: bool = False,
        prefer_quality: bool = False,
        prefer_offline: bool = False,
    ):
        pass

    # Convenience constructors
    @staticmethod
    def for_image_generation(prefer_speed: bool = False) -> TaskPreference: ...
    
    @staticmethod
    def for_script_generation(prefer_quality: bool = True) -> TaskPreference: ...
    
    @staticmethod
    def for_synthesis(prefer_offline: bool = False) -> TaskPreference: ...
```

### HybridAIClient Selection

```python
from app.integrations.ai_factory import HybridAIClient, TaskPreference

client = get_ai_client()  # Returns HybridAIClient in hybrid mode

# Choose best client for a task
best = client.select_best_client(
    TaskPreference.for_image_generation()
)
# Returns: "gemini" or "ollama"
```

### Task-Aware Client Selection

```python
from app.integrations.ai_factory import get_ai_client_for_task

# Automatically selects best client based on task
image_client = get_ai_client_for_task("image_generation")
script_client = get_ai_client_for_task("script_generation")
audio_client = get_ai_client_for_task("synthesis")

# Returns actual client instance (GeminiClient or OllamaClient)
```

---

## Usage Examples

### Example 1: Script Generation for Universe

```python
from app.integrations.ai_factory import get_ai_client_for_task

# System automatically chooses best available AI
client = get_ai_client_for_task("script_generation")

# If Gemini is available → Uses Gemini for quality
# If only Ollama available → Uses Ollama gracefully
# Logs selection: "Task-aware AI selection: task=script_generation → client=gemini"

result = client.generate_script(...)
```

### Example 2: Image Generation with Quality Preference

```python
from app.integrations.ai_factory import get_ai_client, TaskPreference

# Get hybrid client, then query for best option
client = get_ai_client()

# Check what's best for image generation
best_client_name = client.select_best_client(
    TaskPreference.for_image_generation()
)

# Use the result in your image generation pipeline
# Note: ArtGenerator uses Google Imagen API (Gemini path)
```

### Example 3: Offline-Only Synthesis

```python
from app.integrations.ai_factory import get_ai_client, TaskPreference

# Create preference for offline-only synthesis
pref = TaskPreference.for_synthesis(prefer_offline=True)

client = get_ai_client()
best = client.select_best_client(pref)

# Will return "ollama" and warn if Ollama unavailable
# Will fail on synthesis if Ollama not running
```

---

## Environment Variables

All task-aware selection respects global environment configuration:

| Variable | Default | Effect |
|----------|---------|--------|
| `OLLAMA_ENABLED` | `true` | Enable/disable Ollama local processing |
| `OLLAMA_AUTO_FALLBACK` | `true` | Auto-switch to Gemini if Ollama fails |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `mistral` | Model to use in Ollama |
| `GOOGLE_API_KEY` | (required) | Gemini API key for cloud fallback |
| `AI_PREFER_CLOUD` | `false` | Override to prefer Gemini over Ollama |

### Configuration Combinations

**Development (Local + Cloud Backup)**
```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=true
GOOGLE_API_KEY=your-key
AI_PREFER_CLOUD=false  # Use Ollama first
```

**Production (Cloud + Local Cache)**
```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=true
GOOGLE_API_KEY=your-key
AI_PREFER_CLOUD=true   # Use Gemini first for quality
```

**Offline Only (Development)**
```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=false
# No GOOGLE_API_KEY needed
```

**Cloud Only**
```bash
OLLAMA_ENABLED=false
GOOGLE_API_KEY=your-key
```

---

## Monitoring & Debugging

### Health Check Endpoint

```bash
curl http://localhost:8433/health/ai
```

Response shows:
- Ollama availability (host, model, status)
- Gemini availability (API key present)
- Currently active client
- Auto-fallback status

```json
{
  "status": "ok",
  "service": "AI Services",
  "ai_health": {
    "ollama": {
      "available": true,
      "host": "http://localhost:11434",
      "model": "mistral"
    },
    "gemini": {
      "available": true,
      "configured": true
    },
    "active_client": "ollama",
    "auto_fallback_enabled": true
  }
}
```

### Logging

Task-aware selection is logged at INFO level:

```
INFO: Task-aware AI selection: task=script_generation → client=gemini
INFO: Task-aware AI selection: task=synthesis → client=ollama
```

Fallback events logged at WARNING level:

```
WARNING: Quality preference set, but Gemini unavailable, using Ollama
WARNING: Speed preference set, but Ollama unavailable, using Gemini
```

### Resource Awareness & Model Selection

The system is **resource-aware**: it monitors available CPU, RAM, and GPU to determine what models can run.

#### Get System Resource Status

```bash
curl http://localhost:8433/health/ai
```

Response includes system resources:

```json
{
  "status": "ok",
  "service": "AI Services",
  "ai_health": {
    "ollama": {
      "available": true,
      "host": "http://localhost:11434",
      "model": "mistral",
      "can_run": true
    },
    "gemini": {
      "available": true,
      "configured": true
    },
    "system_resources": {
      "cpu_cores": 8,
      "cpu_percent": 25.5,
      "memory_available_gb": 6.4,
      "memory_total_gb": 16.0,
      "memory_percent": 60.0,
      "gpu_available": true,
      "gpu_memory_gb": 8.0,
      "recommended_model_size": "large"
    },
    "active_client": "ollama",
    "auto_fallback_enabled": true
  }
}
```

#### Model Size Recommendations

Based on available RAM, the system recommends appropriate models:

| Available RAM | Recommended Model | Examples | Use Case |
|---|---|---|---|
| < 2GB | `tiny` | sub-1GB models | Extremely limited environments |
| 2-4GB | `small` | orca-mini (1.3GB), neural-chat (4.1GB) | Development, low-resource VPS |
| 4-8GB | `medium` | mistral (4GB), llama2 (3.8GB) | Standard development, local |
| 8-16GB | `large` | neural-chat (4.1GB), larger variants | Good quality + speed |
| 16GB+ | `xlarge` | large language models (13GB+) | Production, high-quality output |

#### Debug Endpoint

```bash
curl http://localhost:8433/debug/ai
```

Returns comprehensive debugging information:

```json
{
  "status": "ok",
  "service": "AI Debug Info",
  "debug": {
    "timestamp": "2026-05-17T14:30:45.123456",
    "active_client": "ollama",
    "prefer_ollama": true,
    "auto_fallback_enabled": true,
    "ollama_available": true,
    "ollama_host": "http://localhost:11434",
    "ollama_model": "mistral",
    "ollama_can_run": true,
    "system_resources": {
      "cpu_count": 8,
      "cpu_percent": 25.5,
      "memory_available_gb": 6.4,
      "memory_total_gb": 16.0,
      "memory_percent": 60.0,
      "gpu_available": true,
      "gpu_memory_gb": 8.0
    },
    "model_recommendation": {
      "recommended_size": "large",
      "explanation": "Good RAM: can run larger models (8-13GB), e.g., neural-chat, larger variants"
    },
    "configuration": {
      "OLLAMA_ENABLED": "true",
      "OLLAMA_AUTO_FALLBACK": "true",
      "AI_PREFER_CLOUD": "false"
    }
  }
}
```

Use the debug endpoint to:
- Verify Ollama availability and connectivity
- Check current system resource usage
- Get model recommendations for your hardware
- Troubleshoot AI service selection issues
- Monitor CPU, memory, and GPU availability

---

## Design Principles

### 1. **Quality Over Speed for Creative Content**
User-facing content (scripts, descriptions, artwork) prioritizes quality. If both services are available, prefer the one with better results, even if slightly slower.

### 2. **Speed for Synthesis**
Audio synthesis and real-time operations prioritize responsiveness. Local Ollama is preferred for minimal latency.

### 3. **Graceful Degradation**
System continues operating even if preferred service is unavailable. Fallback chain ensures at least one path forward (unless both services fail).

### 4. **Cost Optimization**
When both services meet requirements, prefer local Ollama to reduce cloud API costs.

### 5. **Transparency**
All selections are logged for monitoring and debugging. Administrators can see which AI service handled each task.

### 6. **Resource Awareness**
The system is aware of available CPU, RAM, and GPU resources. Model selection respects hardware constraints:
- Large models run only when sufficient RAM is available
- System recommends model sizes based on available resources
- Gracefully falls back to smaller models or cloud Gemini if local models won't fit
- Prevents out-of-memory errors through proactive resource checking

---

## Currently Implemented Features

### ✅ Resource Awareness (NEW)
- **System monitoring**: Detects available CPU cores, RAM, and GPU
- **Model recommendations**: Suggests appropriate model sizes based on hardware
- **Resource constraints**: Prevents Ollama from running if insufficient RAM
- **GPU detection**: Automatically detects NVIDIA CUDA capability
- **Health checks**: `/health/ai` includes resource information
- **Debug endpoint**: `/debug/ai` provides comprehensive resource diagnostics

## Future Enhancements

### Per-Task Configuration
```python
# Future: Allow tasks to specify exact preferences
class TaskConfig:
    prefer_model: Literal["ollama", "gemini", "auto"] = "auto"
    timeout_seconds: int = 30
    retry_on_failure: bool = True
```

### Dynamic Model Downloading
```python
# Automatically download/install models based on available resources
# Example: Large model available (16GB RAM) → download llama2-13b
```

### Latency Tracking
```python
# Track which service is faster for different task types
# Dynamically adjust preferences based on observed performance
```

### Cost Tracking
```python
# Monitor Gemini API costs
# Alert when costs exceed threshold
# Auto-switch to Ollama if costs too high
```

### Model-Specific Tuning
```python
# Different Ollama models (mistral, llama, etc.)
# Choose model based on task requirements
# Example: mistral for speed, llama for quality
```

### Adaptive Model Selection
```python
# Query Ollama for installed models
# Select largest/best model that fits available resources
# Automatically use remaining models if preferred fails
```

---

## Troubleshooting

### "Ollama unavailable but OLLAMA_AUTO_FALLBACK=false"
**Problem**: Task requires offline processing, but Ollama isn't running.

**Solution**:
1. Start Ollama: `docker-compose --profile ollama up ollama`
2. Wait for health check: `curl http://localhost:11434/api/status`
3. Set `OLLAMA_AUTO_FALLBACK=true` if cloud fallback acceptable

### "Quality preference set but Gemini unavailable"
**Problem**: Task prefers Gemini, but API key not configured.

**Solution**:
1. Obtain Gemini API key from Google Cloud Console
2. Set `GOOGLE_API_KEY=your-key`
3. System will fall back to Ollama if available

### Task always uses same service despite preference
**Problem**: Task preference not being applied.

**Solution**:
1. Verify using `get_ai_client_for_task()`, not `get_ai_client()`
2. Check logs for "Task-aware AI selection" messages
3. Verify environment variables are set correctly

---

**For questions or issues**: Refer to logs and health check endpoint for real-time status.
