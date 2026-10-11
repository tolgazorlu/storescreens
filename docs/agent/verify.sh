#!/usr/bin/env bash
# Single verification gate. Must exit 0 only when the project builds and all checks pass.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Never touch a real data directory.
export SCREENY_DATA_DIR="$TMP/data"

step() { printf '\n== %s\n' "$1"; }

step "install"
pnpm install --frozen-lockfile

step "lint"
pnpm lint

step "typecheck"
pnpm typecheck

step "smoke"
OUT="$TMP/smoke" pnpm smoke

step "build:cli"
pnpm build:cli
test -f dist-cli/screeny.js
head -n1 dist-cli/screeny.js | grep -qx '#!/usr/bin/env node'

step "test:cli"
pnpm test:cli

step "end-to-end from a temp cwd"
E2E="$TMP/e2e"
mkdir -p "$E2E"
export SCREENY_DATA_DIR="$TMP/e2e-data"
cat > "$E2E/spec.json" <<'JSON'
{
  "device": "iphone-6.9",
  "locale": "en",
  "screens": [
    { "template": "text-only", "title": "Hello from the CLI", "subtitle": "Şğüçöı İ" },
    { "template": "title-top", "title": "Second screen" }
  ]
}
JSON
CLI="node $ROOT/dist-cli/screeny.js"
(
  cd "$E2E"
  $CLI new demo
  $CLI generate demo --spec ./spec.json
  $CLI render demo --out ./out
  $CLI export demo --apple --out ./out
)
pngs=$(find "$E2E/out" -name '*.png' | wc -l | tr -d ' ')
[ "$pngs" -ge 2 ] || { echo "expected >=2 PNGs in $E2E/out, got $pngs" >&2; exit 1; }
for f in "$E2E"/out/*.png; do
  [ "$(head -c 4 "$f" | od -An -tx1 | tr -d ' \n')" = "89504e47" ] || { echo "not a PNG: $f" >&2; exit 1; }
done
zip=$(find "$E2E/out" -name '*.zip' | head -n1)
[ -n "$zip" ] || { echo "no zip in $E2E/out" >&2; exit 1; }
[ "$(head -c 2 "$zip")" = "PK" ] || { echo "not a zip: $zip" >&2; exit 1; }

step "mcp stdio"
resp=$(printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verify","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | (cd "$E2E" && perl -e 'alarm 30; exec @ARGV' node "$ROOT/dist-cli/screeny.js" mcp) || true)
echo "$resp" | grep -q '"id":1' || { echo "mcp: no initialize response" >&2; exit 1; }
echo "$resp" | grep -q '"list_projects"' || { echo "mcp: tools/list missing list_projects" >&2; exit 1; }

echo
echo "verify: all checks passed"
