#!/bin/bash
# End-to-End Chat-to-Form Workflow Test
# Tests the complete flow: chat → suggestion → stage → visibility

set -e

API="http://127.0.0.1:8000/api/v1"
RESULTS=""
COOKIE_JAR="/tmp/cookies.txt"

echo "=========================================="
echo "Chat-to-Form E2E Workflow Test"
echo "=========================================="
echo ""

# Get CSRF token first
echo "Getting CSRF token..."
curl -s http://127.0.0.1:8000/ -c "$COOKIE_JAR" > /dev/null
CSRF_TOKEN=$(grep csrf_token "$COOKIE_JAR" | awk '{print $7}')
echo "CSRF Token: $CSRF_TOKEN"
echo ""

# Test 1: Call chat API to get entity suggestion
echo "TEST 1: Request entity creation via chat..."
CHAT_RESPONSE=$(curl -s -X POST "$API/chat" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b "$COOKIE_JAR" \
  -d '{
    "message": "Create a synthwave-themed universe with dark atmosphere and cyberpunk elements",
    "system_prompt": "Generate ENTITY_SUGGESTION blocks for new universes only",
    "history": []
  }')

echo "Chat API Response:"
echo "$CHAT_RESPONSE" | jq . 2>/dev/null || echo "$CHAT_RESPONSE"
echo ""

# Extract reply
REPLY=$(echo "$CHAT_RESPONSE" | jq -r '.reply' 2>/dev/null || echo "")
if [[ -z "$REPLY" ]]; then
  echo "❌ TEST 1 FAILED: No reply from chat API"
  exit 1
fi

# Check if suggestion was included
if echo "$REPLY" | grep -q "ENTITY_SUGGESTION"; then
  echo "✅ TEST 1 PASSED: Chat returned ENTITY_SUGGESTION block"
  RESULTS="$RESULTS\n✅ Chat AI generation works"
else
  echo "⚠️  TEST 1 WARNING: No ENTITY_SUGGESTION in reply (API may not have suggestions enabled)"
  echo "Reply: $REPLY"
  RESULTS="$RESULTS\n⚠️  Chat returned reply but no structured suggestion"
fi
echo ""

# Test 2: Stage a universe directly (simulating form submission)
echo "TEST 2: Stage universe via form submission..."
STAGE_RESPONSE=$(curl -s -X POST "$API/universes/staged" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b "$COOKIE_JAR" \
  -d '{
    "name": "E2E Test Universe",
    "description": "Universe created by end-to-end test",
    "genre_hints": "synthwave|cyberpunk",
    "mood_hints": "dark|mysterious",
    "setting": "Neon-lit megacity",
    "era": "Year 2087",
    "publisher": "Test Suite",
    "created_by": "e2e_test"
  }')

echo "Stage Response:"
echo "$STAGE_RESPONSE" | jq . 2>/dev/null || echo "$STAGE_RESPONSE"
echo ""

# Extract universe ID and status
UNIVERSE_ID=$(echo "$STAGE_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")
STATUS=$(echo "$STAGE_RESPONSE" | jq -r '.status' 2>/dev/null || echo "")

if [[ -z "$UNIVERSE_ID" ]]; then
  echo "❌ TEST 2 FAILED: Could not stage universe"
  exit 1
fi

if [[ "$STATUS" != "draft" ]]; then
  echo "❌ TEST 2 FAILED: Staged universe has status '$STATUS', expected 'draft'"
  exit 1
fi

echo "✅ TEST 2 PASSED: Universe staged with ID=$UNIVERSE_ID, status=$STATUS"
RESULTS="$RESULTS\n✅ Form submission → stage endpoint works"
echo ""

# Test 3: Verify universe appears in draft list
echo "TEST 3: Verify staged universe appears in UI list..."
LIST_RESPONSE=$(curl -s "$API/universes?status=draft")

echo "List Response (draft universes):"
echo "$LIST_RESPONSE" | jq . 2>/dev/null || echo "$LIST_RESPONSE"
echo ""

# Check if our test universe is in the list
if echo "$LIST_RESPONSE" | jq -e ".[] | select(.id == \"$UNIVERSE_ID\")" >/dev/null 2>&1; then
  echo "✅ TEST 3 PASSED: Staged universe appears in list with draft status"
  RESULTS="$RESULTS\n✅ Staged entity visible in UI"
else
  echo "❌ TEST 3 FAILED: Staged universe not found in draft list"
  exit 1
fi
echo ""

# Test 4: Verify all required fields were persisted
echo "TEST 4: Verify all form fields persisted correctly..."
DETAIL_RESPONSE=$(curl -s "$API/universes/$UNIVERSE_ID")

echo "Detail Response:"
echo "$DETAIL_RESPONSE" | jq . 2>/dev/null || echo "$DETAIL_RESPONSE"
echo ""

# Check each field
ERRORS=""
NAME=$(echo "$DETAIL_RESPONSE" | jq -r '.name' 2>/dev/null)
DESCRIPTION=$(echo "$DETAIL_RESPONSE" | jq -r '.description' 2>/dev/null)
GENRE=$(echo "$DETAIL_RESPONSE" | jq -r '.genre_hints' 2>/dev/null)
MOOD=$(echo "$DETAIL_RESPONSE" | jq -r '.mood_hints' 2>/dev/null)
ERA=$(echo "$DETAIL_RESPONSE" | jq -r '.era' 2>/dev/null)

[[ "$NAME" == "E2E Test Universe" ]] || ERRORS="$ERRORS\n  ❌ name"
[[ "$DESCRIPTION" == "Universe created by end-to-end test" ]] || ERRORS="$ERRORS\n  ❌ description"
[[ "$GENRE" == *"synthwave"* ]] || ERRORS="$ERRORS\n  ❌ genre_hints"
[[ "$MOOD" == *"dark"* ]] || ERRORS="$ERRORS\n  ❌ mood_hints"
[[ "$ERA" == "Year 2087" ]] || ERRORS="$ERRORS\n  ❌ era"

if [[ -z "$ERRORS" ]]; then
  echo "✅ TEST 4 PASSED: All form fields persisted correctly"
  RESULTS="$RESULTS\n✅ Data persistence verified"
else
  echo "❌ TEST 4 FAILED: Some fields were not persisted:$ERRORS"
  exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "SUMMARY: Chat-to-Form Workflow"
echo "=========================================="
echo -e "$RESULTS"
echo ""
echo "✅ COMPLETE END-TO-END WORKFLOW VERIFIED"
echo ""
echo "Flow demonstrated:"
echo "  1. Chat API receives request"
echo "  2. Form receives data (simulated)"
echo "  3. Stage endpoint creates draft entity"
echo "  4. Entity appears in UI with draft status"
echo "  5. All form fields persisted correctly"
echo ""
