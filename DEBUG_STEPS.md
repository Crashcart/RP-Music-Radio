# API Connectivity Debug Steps

## Current Issue
Frontend still shows "API Offline" despite VITE_API_URL being added to docker-compose.yml

## Root Cause
The frontend Docker image was built **before** VITE_API_URL was added. Environment variables in docker-compose need the image to be rebuilt.

## Fix Steps

### Step 1: Rebuild Frontend Container
```bash
cd /root/rp-music-radio
docker compose up -d --build aetherwave-frontend
```

This rebuilds the aetherwave-frontend image with the new VITE_API_URL=/api environment variable.

### Step 2: Verify Containers are Running
```bash
docker compose ps
```

All 5 containers should show "running":
- aetherwave_api (port 8000)
- aetherwave_frontend (port 5173)
- aetherwave_worker
- aetherwave_beat
- aetherwave_redis

### Step 3: Test Frontend
Open http://boris.local:8432 in browser

1. Navigate to Settings page
2. Check for "API Status: ✅ Online" (should appear within 10 seconds)
3. Try saving settings to verify API is responsive

### Step 4: Check Browser DevTools (if still failing)
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for requests to:
   - `/health` (should return 200)
   - `/api/v1/settings/api-key` (should return 200)

If requests show 404 or connection refused:
```bash
# Test from API container
docker exec aetherwave_api curl -v http://localhost:8000/health
```

If that fails, check API logs:
```bash
docker compose logs aetherwave-api --tail=100
```

## What Was Fixed
- ✅ VITE_API_URL=/api added to frontend environment (docker-compose.yml line 47)
- ✅ Vite proxy configured to route /api/* to http://aetherwave-api:8000
- ✅ All backend endpoints exist and are CORS-enabled
- ⏳ **PENDING**: Rebuild frontend container to apply environment variable

The rebuild is the final piece needed.
