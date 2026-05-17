# Ollama Support — Local LLM Integration

**Status**: ✅ Implemented  
**Added**: 2026-05-17  
**Maintainer**: AI Integration Team

## Overview

AetherWave now supports **Ollama** as a local LLM alternative to Gemini. This enables:

- **Offline AI features** — script generation without external API calls
- **Development without API costs** — test ChatAssistant and synthesis locally
- **Flexible LLM choice** — run Mistral, Llama 2, Neural Chat, or any model Ollama supports
- **Hybrid setups** — prefer Ollama locally, fall back to Gemini in production

## Architecture

### AI Factory Pattern

The `ai_factory.py` module intelligently selects the best AI client:

```
┌─────────────────┐
│  AI Factory     │
│ get_ai_client() │
└────────┬────────┘
         │
    ┌────┴────────────┬──────────────────┐
    │                 │                  │
    ▼                 ▼                  ▼
┌─────────┐    ┌─────────────┐    ┌──────────┐
│ Gemini  │    │ Ollama      │    │ Fallback │
│ (Cloud) │    │ (Local)     │    │ (Gemini) │
└─────────┘    └─────────────┘    └──────────┘
```

**Selection Logic:**

1. If `OLLAMA_ENABLED=true` → Use Ollama
2. Else if `GEMINI_ENABLED=true` AND `GOOGLE_API_KEY` set → Use Gemini
3. Else → Fall back to Ollama

### Client Interfaces

Both `GeminiClient` and `OllamaClient` implement the same interface:

```python
ai_client = get_ai_client()

result = ai_client.generate_script(
    station_name="Nebula FM",
    artist_name="Vance Rikard",
    genre="synthwave",
    mood="mysterious",
    items="retro synthesizers",
    backstory="Former station operator...",
    habits=["Hums between segments", "Clicks pen"],
    filler_enabled=True,
)

# Result structure:
{
    "track_title": "Neon Dreams on Nebula FM",
    "script": "...",
    "backstory": "...",
    "market_research": "...",
    "ad_reads": ["..."],
    "personality_notes": ["..."]
}
```

## Setup

### Local Development (Ollama)

**Prerequisites:**
- Docker Desktop or Ollama CLI installed
- 8GB+ RAM available

**Option 1: Docker Compose (Recommended)**

```bash
cd rp-music-radio
docker-compose up ollama  # Starts Ollama service on port 11434
```

**Option 2: Direct Installation**

```bash
# Install Ollama from https://ollama.ai
ollama serve

# In another terminal, pull a model:
ollama pull mistral  # Or: llama2, neural-chat, etc.
```

**Configure Backend**

```bash
# Set environment variables
export OLLAMA_ENABLED=true
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=mistral

# Run backend
cd backend
python -m uvicorn app.main:app --reload
```

**Test Integration**

```bash
curl -X POST http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "Generate a 2-minute DJ script",
    "stream": false
  }'
```

### Production (Gemini with Ollama Fallback)

```bash
# .env or docker-compose.yml
GEMINI_ENABLED=true
GOOGLE_API_KEY=your-api-key-here
OLLAMA_ENABLED=false

# If Gemini fails, Ollama will automatically be used as fallback
```

### Hybrid Mode (Prefer Ollama, Fall Back to Gemini)

```bash
OLLAMA_ENABLED=true
OLLAMA_HOST=http://ollama-service:11434
OLLAMA_MODEL=mistral

GEMINI_ENABLED=true
GOOGLE_API_KEY=your-api-key-here
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_ENABLED` | `false` | Enable Ollama client |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `mistral` | Model to use (mistral, llama2, neural-chat, etc.) |
| `GEMINI_ENABLED` | `true` | Enable Gemini client |
| `GOOGLE_API_KEY` | _(none)_ | Gemini API key |

### Supported Ollama Models

- **mistral** (7B, recommended) — Fast, good quality
- **llama2** (7B/13B) — Strong reasoning, requires more VRAM
- **neural-chat** (7B) — Optimized for dialogue
- **dolphin-mixtral** (8x7B, MoE) — High quality, requires ~16GB RAM
- Custom models via `ollama pull <model-name>`

## Usage

### ChatAssistant (Web UI)

The ChatAssistant component automatically uses the configured AI client:

```typescript
// frontend/src/components/ChatAssistant.tsx
// No changes needed — it calls the backend API
// which now uses the AI factory
```

### Synthesis Pipeline

The synthesis task automatically uses Ollama if configured:

```python
# backend/app/tasks/synthesis.py
from app.integrations.ai_factory import get_ai_client

ai_client = get_ai_client()
script_result = ai_client.generate_script(...)
```

### Direct Integration

```python
from app.integrations.ai_factory import get_ai_client

ai_client = get_ai_client()
result = ai_client.generate_script(
    station_name="...",
    artist_name="...",
    genre="...",
    # ... other params
)
```

## CI/CD Support

### GitHub Actions

The test workflow includes an optional Ollama integration test:

```yaml
test-ollama-integration:
  runs-on: ubuntu-latest
  services:
    ollama:
      image: ollama/ollama:latest
      ports:
        - 11434:11434
  steps:
    - uses: actions/checkout@v4
    - name: Test Ollama integration
      env:
        OLLAMA_ENABLED: 'true'
        OLLAMA_HOST: 'http://localhost:11434'
      run: pytest -k "ollama" -v
```

### Docker Compose (Local Testing)

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ollama_data:
```

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama is running
curl -f http://localhost:11434/api/tags

# Start Ollama
ollama serve

# View logs
docker logs <ollama-container>
```

### Model Not Found

```bash
# List available models
ollama list

# Pull a model
ollama pull mistral

# Verify it's available
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"mistral","prompt":"test"}'
```

### Slow Response Times

- **Solution 1**: Switch to a smaller model (mistral < llama2)
- **Solution 2**: Increase available VRAM
- **Solution 3**: Use Gemini for production, Ollama for development

### Memory Issues

If running out of memory:

```bash
# Use a smaller model
ollama pull neural-chat  # Smaller than mistral

# Or allocate more resources
docker run -m 8g ollama/ollama:latest
```

## Performance Benchmarks

| Metric | Gemini | Ollama (Mistral) | Ollama (Llama2) |
|--------|--------|------------------|-----------------|
| Latency | 5-15s | 30-60s | 60-120s |
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | API charges | Free | Free |
| Offline | ❌ | ✅ | ✅ |

*Benchmarks on M1 Mac / 8GB RAM. Your results may vary.*

## Future Enhancements

- [ ] Model auto-download and caching
- [ ] Parallel model execution (use different models for different tasks)
- [ ] Model performance monitoring and auto-switching
- [ ] Support for other LLM providers (Claude API, LLaMA.cpp, etc.)
- [ ] Prompting optimization for local models (simpler prompts, few-shot examples)

## Contributing

To add a new AI client:

1. Create `backend/app/integrations/<provider>_client.py`
2. Implement the `generate_script()` interface
3. Update `ai_factory.py` to support the new provider
4. Add environment variable configuration
5. Write tests in `backend/tests/test_<provider>_integration.py`
6. Update this documentation

## References

- [Ollama Documentation](https://ollama.ai)
- [Ollama Model Library](https://ollama.ai/library)
- [google-genai SDK](https://github.com/googleapis/python-genai)
- [AI Factory Pattern](https://en.wikipedia.org/wiki/Factory_method_pattern)

---

**Last Updated**: 2026-05-17  
**Status**: Production Ready
