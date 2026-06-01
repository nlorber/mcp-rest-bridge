#!/usr/bin/env bash
#
# Demo: the MCP allowlist field filter stripping sensitive fields from a live REST response.
# Self-contained — no API key needed. Records cleanly with asciinema or vhs.
#
# Prereqs: `npm install` (done once), plus `jq` and `curl` on PATH.
# Usage:   ./scripts/demo.sh            (set DEMO_PAUSE=0 to remove the pacing pauses)
#
set -euo pipefail
cd "$(dirname "$0")/.."

API="http://localhost:3100"
PAUSE="${DEMO_PAUSE:-1.5}"

command -v jq >/dev/null || { echo "this demo needs 'jq' (e.g. brew install jq)"; exit 1; }

echo "▶ Starting the mock REST API on :3100 (it carries 'trap' fields a real API might expose)…"
npx tsx mock-api/server.ts >/tmp/mcp-demo-mock.log 2>&1 &
MOCK_PID=$!
trap 'kill "$MOCK_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -sf "$API/health" >/dev/null 2>&1 && break
  sleep 0.2
done
sleep "$PAUSE"

echo
echo "▶ Authenticating (admin / admin123) for a JWT…"
TOKEN="$(curl -s -X POST "$API/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .access_token)"
echo "  token: ${TOKEN:0:24}…"
sleep "$PAUSE"

echo
echo "▶ RAW upstream response for item 1 — note the sensitive fields the API exposes:"
RAW="$(curl -s "$API/items/1" -H "Authorization: Bearer $TOKEN")"
echo "$RAW" | jq
echo "  ⚠  internal_code / supplier_id / cost_price / margin_pct are all leaked."
sleep "$PAUSE"

echo
echo "▶ The SAME response through the MCP server's allowlist filter (item:detail):"
echo "$RAW" | npx tsx scripts/apply-filter.ts item:detail
echo "  ✓  Trap fields stripped — only allowlisted fields ever reach the LLM."
sleep "$PAUSE"

echo
echo "Done. (mock API stopped on exit)"
