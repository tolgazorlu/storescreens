# Progress

<!-- Each iteration appends: what changed, evidence, next step. -->

## Iteration 1: baseline-checks

What changed:
- `scripts/fetch-bezels.sh`: `yes | hdiutil attach` returned 141 (SIGPIPE from `yes`) under
  `set -o pipefail`, so the script aborted silently after the first mount and left volumes
  mounted. Changed to `(yes || true) | hdiutil ...`. Ran it; `public/bezels/{duo-inner,duo-outer,ipad-13}.png`
  now exist (gitignored, Apple license, free CDN download).
- Marked `baseline-checks` as passing.

Evidence:
- `pnpm install --frozen-lockfile`: done.
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `OUT=$T/smoke SCREENY_DATA_DIR=$T/data pnpm smoke`: exit 0, 21 `screeny-*.png` written.
  Before fetching bezels it failed with ENOENT on `public/bezels/ipad-13.png`.

Note: a fresh clone must run `bash scripts/fetch-bezels.sh` (macOS, hdiutil) before
`pnpm smoke` / `verify.sh` will pass.

Next: `public-dir-resolver` (add `src/lib/paths.ts` with `PUBLIC_DIR`, use it in render.ts).

## Blocked
<!-- Things only a human can do (credentials, accounts, decisions). -->
