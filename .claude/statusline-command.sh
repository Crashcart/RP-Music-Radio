#!/usr/bin/env bash
# Claude Code status line: token usage display
# Receives JSON via stdin from Claude Code

input=$(cat)

# ── Token counts ────────────────────────────────────────────────────────────
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
window_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Format a raw token count into a compact string: 1234 → 1.2K, 1200000 → 1.2M
fmt_tokens() {
  local n="$1"
  if [ "$n" -ge 1000000 ] 2>/dev/null; then
    awk -v n="$n" 'BEGIN { printf "%.1fM", n/1000000 }'
  elif [ "$n" -ge 1000 ] 2>/dev/null; then
    awk -v n="$n" 'BEGIN { printf "%.1fK", n/1000 }'
  else
    echo "${n}"
  fi
}

used_tokens=$((total_input + total_output))
used_fmt=$(fmt_tokens "$used_tokens")
window_fmt=$(fmt_tokens "$window_size")

# ── Build output parts ───────────────────────────────────────────────────────
parts=()

# Primary: Tokens used / context window size
if [ "$window_size" -gt 0 ] 2>/dev/null; then
  token_str="Tokens: ${used_fmt}/${window_fmt}"
  if [ -n "$used_pct" ]; then
    pct_int=$(printf "%.0f" "$used_pct")
    token_str="${token_str} (${pct_int}%)"
  fi
  parts+=("$token_str")
fi

# Secondary: Claude.ai rate limits when present
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

limits=""
if [ -n "$five_pct" ]; then
  limits="5h:$(printf '%.0f' "$five_pct")%"
fi
if [ -n "$week_pct" ]; then
  [ -n "$limits" ] && limits="$limits "
  limits="${limits}7d:$(printf '%.0f' "$week_pct")%"
fi
[ -n "$limits" ] && parts+=("Quota: $limits")

# Join parts with  |  separator
output=""
for part in "${parts[@]}"; do
  [ -n "$output" ] && output="$output | "
  output="$output$part"
done

printf "%s" "$output"
