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

## Iteration 2: public-dir-resolver

What changed:
- New `src/lib/paths.ts` exports `PUBLIC_DIR` (`SCREENY_PUBLIC_DIR` env, default `<cwd>/public`),
  mirroring how `DATA_DIR` is resolved in `src/lib/db/index.ts`.
- `src/lib/render.ts` loads fonts and bezels from `PUBLIC_DIR`; no `process.cwd()` left in it.
- Marked `public-dir-resolver` as passing.

Evidence:
- `grep process.cwd src/lib/render.ts`: no matches.
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `OUT=$T/s SCREENY_DATA_DIR=$T/d pnpm smoke`: exit 0, 21 PNGs.
- `SCREENY_PUBLIC_DIR=$T/nope ... pnpm smoke`: exit 1 with ENOENT on `$T/nope/fonts/Inter-Regular.ttf`,
  proving the env var is honoured.
- `verify.sh` still fails at `build:cli` (script not yet added); expected until the build features land.

Next: `build-cli-script` (esbuild devDependency, `src/cli/main.ts`, `pnpm build:cli` -> `dist-cli/screeny.js`).

## Blocked
<!-- Things only a human can do (credentials, accounts, decisions). -->
