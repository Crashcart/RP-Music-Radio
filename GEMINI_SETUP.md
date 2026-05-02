# Gemini API Setup for AetherWave

The chat assistant and AI DJ generation require a Google Cloud Gemini API key.

## Getting Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Get API Key"
3. Select or create a Google Cloud project
4. Copy the API key

## Activating Gemini in AetherWave

### Option 1: Environment Variable (Recommended for Docker)

```bash
export GOOGLE_API_KEY="your-key-here"
docker-compose up
```

Or in `.env`:
```
GOOGLE_API_KEY=your-key-here
```

### Option 2: Settings Page (Recommended for Web UI)

1. Start the application
2. Open Settings (gear icon)
3. Paste your API key in the "Google API Key" field
4. Click "Save"
5. The system validates and persists the key

### Option 3: Manual Persistent Storage

Create `/app/data/settings.json`:
```json
{
  "GOOGLE_API_KEY": "your-key-here"
}
```

## Verification

Once configured, the chat assistant will:
- ✅ Accept brainstorming requests
- ✅ Generate DJ proposals with context
- ✅ Create stations, brands, and artists
- ✅ Provide market research and backstories

If the key is missing, you'll see: _"Please set your Google API key in Settings first"_

## Cost & Rate Limits

- Gemini 2.0 Flash is cost-effective (~$0.075 per 1M input tokens)
- Default rate limit: 50 requests per minute
- Monitor usage in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
