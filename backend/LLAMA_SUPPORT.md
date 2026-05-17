# Llama Support with Automatic Cloud Fallback

**Status**: ✅ ACTIVE  
**Last Updated**: 2026-05-17  
**Purpose**: Local Llama model support with transparent fallback to Google Gemini cloud

---

## Overview

AetherWave now features **Llama support** as the primary local AI model, with automatic fallback to Google Gemini cloud if Llama becomes unavailable.

**Key Guarantee**: If Llama goes down, system automatically switches to Gemini cloud without manual intervention.

---

## Llama Models Supported

| Model | Size | Speed | Quality | Recommended | Use Case |
|-------|------|-------|---------|-------------|----------|
| **llama2** | 3.8GB (7B) | Good | Excellent | ✅ YES | General purpose, high quality |
| **llama2:13b** | 7.3GB (13B) | Moderate | Excellent | ✅ YES | Best quality, higher resource usage |
| **neural-chat** | 4.1GB | Very Fast | Good | — | Real-time, speed-critical |
| **orca-mini** | 1.3GB | Extremely Fast | Fair | — | Very limited RAM (< 4GB) |
| **mistral** | 4.0GB | Fast | Good | — | Alternative to Llama |

**Recommended Configuration**: Use `llama2` for optimal balance of quality and speed.

---

## Installation & Setup

### Prerequisites

```bash
# Docker Compose with Ollama profile (includes Llama)
docker-compose --profile ollama up -d

# Or install Ollama standalone
# https://ollama.ai
```

### Configuration

**File**: `.env` (or `.env.example` as template)

```bash
# Enable Llama local processing
OLLAMA_ENABLED=true

# Automatic fallback to Gemini if Llama unavailable
OLLAMA_AUTO_FALLBACK=true

# Ollama API endpoint (default works for docker-compose)
OLLAMA_HOST=http://localhost:11434

# Which Llama model to use (see table above)
OLLAMA_MODEL=llama2

# Set your Google API key for cloud fallback
GOOGLE_API_KEY=your-actual-api-key-here

# Auto-detect best available model at startup
ENABLE_MODEL_DETECTION=true
```

### Startup Model Detection

When the API starts, it automatically:

1. **Tests** if configured Llama model is available
2. **Tries alternatives** if primary model fails
3. **Logs results** so you see what's happening
4. **Falls back to Gemini** if no local models work

Example startup log:

```
━━━ AI MODEL DETECTION & SYSTEM TEST ━━━
Running model detection to determine which AI will be used...
✅ Llama Model Ready: Using 'llama2' for local processing
   Benefits: Fast (local), cost-effective (no API calls), fully offline capable
━━━ MODEL DETECTION COMPLETE ━━━
```

---

## How It Works

### Normal Operation (Llama Available)

```
User Request
    ↓
Check Llama available? → YES
    ↓
Use Llama locally ✅
    ↓
Response to user
```

**Benefits**:
- ✅ **Fast**: No network latency, local processing
- ✅ **Cost-effective**: No API calls to Google
- ✅ **Offline-capable**: Can work without internet
- ✅ **Private**: Data stays on your machine

### Automatic Fallback (Llama Down)

```
User Request
    ↓
Check Llama available? → NO (Ollama crashed, ran out of memory, etc.)
    ↓
Automatically switch to Gemini ✅
    ↓
Response to user
```

**When this happens**:
- User sees a slight delay (network call to Google)
- Application continues working seamlessly
- Logging captures the fallback event
- No manual intervention needed

**Example log**:

```
WARNING: Ollama script generation failed: connection refused
         Falling back to Gemini.
INFO: Using Gemini for script generation (cloud)
```

---

## Resource Requirements

### Minimum for Llama

| Model | RAM Needed | Recommended System |
|-------|------------|-------------------|
| orca-mini (1.3GB) | 4GB available | Laptop, low-spec VPS |
| llama2 (3.8GB) | 6GB available | Standard laptop, VPS |
| llama2:13b (7.3GB) | 10GB available | Dev machine, production server |

**How to check available RAM**:

```bash
# Check current usage
free -h

# Or use the debug endpoint
curl http://localhost:8433/debug/ai | jq '.debug.system_resources'
```

---

## Monitoring & Debugging

### Health Check Endpoint

```bash
curl http://localhost:8433/health/ai
```

Shows:
- ✅ Is Llama available?
- ✅ Which Llama model is configured?
- ✅ Is Gemini available as fallback?
- ✅ Current system resources
- ✅ Recommended model size for hardware

### Debug Endpoint

```bash
curl http://localhost:8433/debug/ai | jq .
```

Returns:
- Active AI client (ollama or gemini)
- System resources (CPU, RAM, GPU)
- Model recommendations based on hardware
- Configuration state
- Ollama connectivity status

### View Logs

```bash
# If running in Docker
docker logs -f <api-container-name>

# Look for these messages:
# ✅ "Llama Model Ready"
# ⚠️  "Ollama unavailable" 
# ℹ️  "Falling back to Gemini"
```

---

## Troubleshooting

### "Llama not found" at Startup

**Problem**: Model detection logs show no Llama available

**Check**:

```bash
# Is Ollama running?
curl http://localhost:11434/api/status

# Does the model exist?
ollama list

# Pull the model if missing
ollama pull llama2
```

**Solution**:

```bash
# Start Ollama
ollama serve

# In another terminal, pull Llama
ollama pull llama2

# Restart API
docker-compose restart api
```

### "Falling back to Gemini" Repeatedly

**Problem**: Llama keeps crashing, system always uses Gemini

**Likely causes**:
- Insufficient RAM for configured model
- Ollama process crashes from OOM (Out of Memory)
- Ollama unstable on your system

**Solution**:

```bash
# 1. Check available RAM
free -h

# 2. Switch to smaller model
# Edit .env: OLLAMA_MODEL=orca-mini

# 3. Or disable Ollama and use Gemini only
# Edit .env: OLLAMA_ENABLED=false

# 4. Restart
docker-compose restart api
```

### "GOOGLE_API_KEY not set" Warning

**Problem**: System warns that cloud fallback unavailable

**Fix**:

```bash
# Get API key from Google Cloud Console
# https://console.cloud.google.com/apis/credentials

# Add to .env
GOOGLE_API_KEY=your-actual-key-here

# Restart API
docker-compose restart api
```

### Llama Slow to Respond

**Problem**: First request hangs for 30-60 seconds

**Explanation**: Ollama is loading the model into RAM (normal on first request)

**Solution**:
- This is expected on first startup
- Subsequent requests are fast (model stays in memory)
- Consider pre-loading model: `ollama pull llama2`

---

## Performance Notes

### Llama (Local)
- **First request**: 30-60 seconds (model loading)
- **Subsequent requests**: 2-5 seconds
- **Cost**: Free (no API calls)

### Gemini (Cloud Fallback)
- **All requests**: 1-3 seconds (network dependent)
- **Cost**: ~$0.50-5.00 per 1M tokens (check Google pricing)

### Recommendation

Use Llama for development, Gemini as emergency fallback.

---

## Configuration Examples

### Development (Llama + Cloud Backup)

```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=true
OLLAMA_MODEL=llama2
GOOGLE_API_KEY=your-key
AI_PREFER_CLOUD=false
ENABLE_MODEL_DETECTION=true
```

Result: Uses Llama, auto-switches to Gemini if Llama unavailable.

### Production (Llama Primary, Gemini Preferred)

```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=true
OLLAMA_MODEL=llama2:13b
GOOGLE_API_KEY=your-key
AI_PREFER_CLOUD=true
ENABLE_MODEL_DETECTION=true
```

Result: Prefers Gemini for quality, uses Llama if Gemini down.

### Llama Only (Offline)

```bash
OLLAMA_ENABLED=true
OLLAMA_AUTO_FALLBACK=false
OLLAMA_MODEL=llama2
ENABLE_MODEL_DETECTION=true
```

Result: Uses only Llama, fails if unavailable (no cloud fallback).

### Gemini Only (Cloud Only)

```bash
OLLAMA_ENABLED=false
GOOGLE_API_KEY=your-key
```

Result: Ignores Llama, always uses Gemini.

---

## System Resource Awareness

The system automatically detects available resources and recommends appropriate models:

```bash
# Check recommendations
curl http://localhost:8433/debug/ai | jq '.debug.model_recommendation'

# Example output:
{
  "recommended_size": "medium",
  "explanation": "Moderate RAM: good for medium models (4-7GB), e.g., mistral, llama2"
}
```

**Automatic selection logic**:
- < 2GB available → No Llama (use Gemini only)
- 2-4GB available → orca-mini or neural-chat only
- 4-8GB available → llama2 (7B) recommended
- 8-16GB available → llama2 or llama2:13b
- 16GB+ available → All models, optimal for quality

---

## FAQ

**Q: Will Llama go down?**  
A: Possibly (OOM, crash, etc.), but system auto-switches to Gemini. You won't lose service.

**Q: How much does Llama cost?**  
A: Free! It's fully local. Gemini (cloud fallback) costs when used.

**Q: Can I use Llama offline?**  
A: Yes, with `OLLAMA_AUTO_FALLBACK=false` and no `GOOGLE_API_KEY`. System fails gracefully if Llama unavailable.

**Q: Which Llama model should I use?**  
A: Start with `llama2` (good quality + speed). Use `llama2:13b` if you have the RAM and want best quality.

**Q: How do I know which model is being used?**  
A: Check logs at startup (model detection logs). Or call `/health/ai` endpoint.

**Q: Can I switch models without restarting?**  
A: Edit `.env`, restart API: `docker-compose restart api`

---

## Integration with AetherWave

All content generation tasks automatically use Llama when available:

- **Scripts**: Llama generates radio scripts locally
- **Image descriptions**: Llama creates detailed descriptions (then Gemini generates images)
- **Content brainstorming**: Llama generates ideas (fast local processing)
- **Fallback**: If Llama unavailable, seamlessly uses Gemini

No code changes needed — selection is automatic and transparent.

---

## Support

For issues with Llama or fallback:

1. **Check logs**: `docker logs -f <api-container-name>`
2. **Check health**: `curl http://localhost:8433/health/ai`
3. **Debug**: `curl http://localhost:8433/debug/ai`
4. **View startup messages**: Look for "AI MODEL DETECTION" section in logs

---

**Llama Support**: ✅ ACTIVE and AUTOMATIC  
**Cloud Fallback**: ✅ GUARANTEED (if API key configured)  
**User Experience**: ✅ SEAMLESS (automatic, no manual switching)
