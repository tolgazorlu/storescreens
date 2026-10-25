#!/bin/bash
# Downloads the large script fonts (CJK, Devanagari, Bengali) as static TTFs
# into public/fonts. They are gitignored: CJK files are ~10 MB per weight.
# Google Fonts serves whole static TTFs when the user agent asks for no WOFF2.
set -euo pipefail
cd "$(dirname "$0")/../public/fonts"
fetch() { # <css family> <file prefix> <weight> <suffix>
  local url
  url=$(curl -fsS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=$1:wght@$3" | grep -o 'https://[^)]*\.ttf' | head -1)
  [ -n "$url" ] || { echo "no TTF for $1 $3" >&2; exit 1; }
  curl -fsS -o "$2-$4.ttf" "$url"
  echo "$2-$4.ttf"
}
for f in "Noto+Sans+SC:NotoSansSC" "Noto+Sans+TC:NotoSansTC" "Noto+Sans+JP:NotoSansJP" \
         "Noto+Sans+KR:NotoSansKR" "Noto+Sans+Devanagari:NotoSansDevanagari" "Noto+Sans+Bengali:NotoSansBengali"; do
  fetch "${f%%:*}" "${f##*:}" 500 Medium
  fetch "${f%%:*}" "${f##*:}" 700 Bold
done
