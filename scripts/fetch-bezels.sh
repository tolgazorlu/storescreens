#!/bin/bash
# Download Apple's official product bezels into public/bezels.
# License: Apple Design Resources, for mock-ups of software on Apple platforms.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/bezels; mkdir -p "$OUT"
TMP=$(mktemp -d)
get() { # dmg-name png-name out-name
  local dmg="$TMP/$1.dmg"
  [ -f "$dmg" ] || curl -sL -o "$dmg" "https://devimages-cdn.apple.com/design/resources/download/$1.dmg"
  local mnt; mnt=$(yes | hdiutil attach -nobrowse "$dmg" | grep -o '/Volumes/.*' | tail -1)
  cp "$(find "$mnt" -name "$2" | head -1)" "$OUT/$3"
  hdiutil detach -quiet "$mnt"
}
get "Bezel-iPhone-Duo" "iPhone Duo - Night Sky - Inner Open Portrait.png" duo-inner.png
get "Bezel-iPhone-Duo" "iPhone Duo - Night Sky - Outer Closed Portrait.png" duo-outer.png
get "Bezel-iPad-Pro-(M5)" "iPad Pro (M5) 13\" - Space Black - Portrait.png" ipad-13.png
rm -rf "$TMP"
ls -la "$OUT"
