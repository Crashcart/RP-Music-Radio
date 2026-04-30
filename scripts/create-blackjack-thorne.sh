#!/usr/bin/env bash
# Creates the "Blackjack Thorne" trucker country musician via the API.
# Run this when the AetherWave stack is up (docker compose up).
#
# Usage:
#   ./scripts/create-blackjack-thorne.sh                  # uses default http://localhost:8433
#   API_URL=http://boris.local:8433 ./scripts/create-blackjack-thorne.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:8433}"
ENDPOINT="${API_URL}/api/v1/artists"

read -r -d '' PAYLOAD <<'JSON' || true
{
  "name": "Jackson 'Jax' Thorne",
  "display_name": "Blackjack Thorne",
  "artist_type": "musician",
  "age": "42",
  "gender": "male",
  "bio": "Born in the back of a rig somewhere between Earth and Mars, Jax spent his youth hauling freight and losing his paycheck in back-alley poker games. He started singing to pass the time during long hauls and eventually became the voice of the restless trucker.",
  "personality": "High-stakes gambler, hard drinker, and a heart of gold hidden under a rough exterior. He lives for the thrill of a blind bet and the hum of a heavy engine.",
  "speaking_style": "Raspy, rhythmic, and peppered with gambling slang.",
  "accent": "Deep-set Southern/Midwestern hybrid",
  "catchphrases": "Let it ride.|Double or nothing.|Another round for the road.",
  "quirks": "Always has a deck of cards in his pocket and a flask of 'engine oil' (whiskey) nearby.",
  "voice_description": "A gritty, smoke-strained baritone that sounds like gravel over velvet.",
  "appearance": "Broad-shouldered, wearing a tattered denim vest over a flight suit, with a permanent five-o'clock shadow and a deck-of-cards tattoo on his forearm.",
  "genre": "Trucker Country / Outlaw Honky-Tonk",
  "signature_sound": "Driving bass lines, aggressive acoustic strumming, and the occasional sound of a glass breaking.",
  "influences": "Merle Haggard, Jerry Reed, and the neon lights of a Vegas space-port."
}
JSON

echo "Posting artist to ${ENDPOINT}..."
HTTP_CODE=$(curl -s -o /tmp/artist_response.json -w "%{http_code}" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

if [[ "${HTTP_CODE}" == "200" || "${HTTP_CODE}" == "201" ]]; then
  echo "Artist created successfully (HTTP ${HTTP_CODE})."
  if command -v jq >/dev/null 2>&1; then
    jq -r '"  id: " + .id + "\n  name: " + .name + "\n  display_name: " + .display_name' /tmp/artist_response.json
  else
    cat /tmp/artist_response.json
  fi
else
  echo "Request failed (HTTP ${HTTP_CODE})." >&2
  cat /tmp/artist_response.json >&2
  exit 1
fi
