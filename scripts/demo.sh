#!/usr/bin/env bash
#
# Demo: the bridge's allowlist field filter, then a live LLM agent that cannot leak the
# fields it strips.
#
# Part 1 (no API key needed): the field filter on a live REST response, shown as a diff.
# Part 2 (needs ANTHROPIC_API_KEY): a real Claude agent on the MCP tools, structurally unable
#         to surface the stripped fields — even under a prompt-injection attempt.
#
# Self-contained. Records cleanly with asciinema or vhs.
#
# Prereqs: `npm install` (done once), plus `jq` and `curl` on PATH.
# Usage:   ./scripts/demo.sh            (set DEMO_PAUSE=0 to remove the pacing pauses)
#
set -euo pipefail
cd "$(dirname "$0")/.."

API="http://localhost:3100"
PAUSE="${DEMO_PAUSE:-1.5}"

command -v jq >/dev/null || { echo "this demo needs 'jq' (e.g. brew install jq)"; exit 1; }

echo "▶ Starting the mock REST API on :3100 (it carries the kind of fields a real API exposes)…"
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
echo "▶ A real API returns far more than an LLM needs. Here is item 1 upstream, with the"
echo "  bridge's allowlist applied — the red lines never leave for the model:"
RAW="$(curl -s "$API/items/1" -H "Authorization: Bearer $TOKEN")"
echo
echo "$RAW" | npx tsx scripts/apply-filter.ts --diff item:detail
echo
echo "  ✓ cost_price / margin_pct / supplier_id / internal_code are stripped at the bridge —"
echo "    the model only ever receives the allowlisted fields."
sleep "$PAUSE"

echo
echo "▶ Why it matters: the LLM is a leaky boundary. Here is a real Claude agent on the MCP tools…"
echo
if [ -f .env ]; then
  npx tsx --env-file=.env tests/adversarial/demo.ts
else
  npx tsx tests/adversarial/demo.ts
fi

echo
echo "Done. (mock API stopped on exit)"
