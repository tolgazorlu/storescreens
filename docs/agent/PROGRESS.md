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

## Iteration 3: build-cli-script (+ dist-ignored)

What changed:
- `esbuild` added as a devDependency (same 0.28.2 tsx already pulled in; lockfile updated).
- `scripts/build-cli.mjs`: bundles `src/cli/main.ts` to `dist-cli/screeny.js` (ESM, node20,
  `packages: "external"`, tsconfig paths for `@/`, `server-only` aliased to
  `scripts/server-only-shim.ts`, shebang banner, version injected via `define`). Cleans `dist-cli/` first.
- `package.json`: `build:cli` script. `src/cli/main.ts`: minimal entry (prints version for
  `--version`/`-v`/`version`, otherwise `bin: screeny`); full AXI core comes with later features.
- `dist-cli/` added to `.gitignore` and eslint `globalIgnores` (needed so the harness never commits
  the bundle), so `dist-ignored` is marked passing too.

Evidence:
- `pnpm build:cli`: exit 0. `ls dist-cli`: only `screeny.js`. `head -1`: `#!/usr/bin/env node`.
- `node dist-cli/screeny.js --version`: `0.1.0`.
- `grep -cE "satori|libsql|resvg|sharp" dist-cli/screeny.js`: 0.
- Probe build with the same options importing `@/lib/service`: 19 inputs, 0 from node_modules;
  externals `drizzle-orm @libsql/client zod satori @resvg/resvg-js react bidi-js fflate sharp node:*`
  (no `server-only`, so the alias applies).
- With `dist-cli/` present: `pnpm lint` exit 0, `pnpm typecheck` exit 0, `git status` shows no dist-cli files.

Next: `server-only-alias` / `path-alias-resolution` (make `src/cli/main.ts` dynamically import
`@/lib/service` after setting `SCREENY_PUBLIC_DIR` from the bundle location), then `version-flags`.

## Iteration 4: server-only-alias + path-alias-resolution (+ version-flags)

What changed:
- `src/cli/service.ts`: `loadService()` sets `SCREENY_PUBLIC_DIR` (if unset) to `<bundle dir>/../public`
  and then dynamically imports `@/lib/service`. esbuild wraps the service graph in lazy `__esm`
  inits, so `PUBLIC_DIR` is evaluated after the env var is set.
- `src/cli/main.ts`: non-version invocations load the service layer and print a provisional
  `bin: screeny` / `projects: N` (real home view comes with `home-view-empty`).
- `scripts/build-cli.mjs` writes `dist-cli/package.json` (`{"type":"module"}`) so node no longer
  prints the MODULE_TYPELESS_PACKAGE_JSON warning when running the bundle.

Evidence:
- `node --input-type=module -e 'import "server-only"'` throws; the bundle (which pulls in
  service/render/storage, all importing `server-only`) runs fine, and `git diff src/lib` is empty.
- From a temp cwd: `SCREENY_DATA_DIR=$T/d node <repo>/dist-cli/screeny.js` prints
  `bin: screeny` / `projects: 0`, exit 0; temp cwd contains only `d` (no `data`/`public`).
- Resolved public dir is `<repo>/public` and `<repo>/public/fonts/Inter-Regular.ttf` exists.
- `--version`, `-v`, `version`: each prints exactly `0.1.0` (one line), exit 0.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Next: AXI core (`unknown-command`, `unknown-flag`, `missing-argument`, `json-errors`), then
`home-view-empty`.

## Blocked
<!-- Things only a human can do (credentials, accounts, decisions). -->
