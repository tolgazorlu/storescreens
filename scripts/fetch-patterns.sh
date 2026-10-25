#!/bin/bash
# Pre-renders every Pattern Craft background pattern (github.com/megh-bari/pattern-craft, MIT)
# to public/patterns/<id>.webp via real headless Chrome, so radial gradients, masks and fine
# grids look like the live site instead of satori's approximation. Output is gitignored; only
# manifest.json (id/name/category) is committed. macOS only (uses Google Chrome.app).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=https://github.com/megh-bari/pattern-craft.git
TMP=$(mktemp -d)
git clone --depth 1 "$REPO" "$TMP/pattern-craft"
mkdir -p docs/vendor/pattern-craft
cp "$TMP/pattern-craft/LICENSE" docs/vendor/pattern-craft/LICENSE
node scripts/render-patterns.mjs "$TMP/pattern-craft" public/patterns
rm -rf "$TMP"
ls public/patterns | wc -l
