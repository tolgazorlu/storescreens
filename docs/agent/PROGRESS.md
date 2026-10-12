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

## Iteration 5: AXI core + home view (home-view-empty, home-view-json, unknown-command, json-errors)

What changed:
- `src/cli/output.ts`: `CliError` (message, help, exit code 1|2), `usageError`, and printers that
  write `error:`/`help:` lines or `{"error","help"}` JSON to stdout.
- `src/cli/args.ts`: `parseArgs(argv, spec, help)` with per-command flag specs (boolean/string,
  `--x v` and `--x=v`), `--json` always accepted, unknown flags rejected by name (exit 2).
- `src/cli/main.ts`: dispatcher; no-arg (or flags-only) invocation prints the home view
  (`bin:`, `description:`, `projects[N]:` list with screens count or `projects: no projects yet`,
  2-3 `help:` lines; `--json` gives `{bin,description,projects,help}`). Unknown commands exit 2.
  Unexpected exceptions become `error:` + `help:` with exit 1.

Evidence (temp cwd, temp `SCREENY_DATA_DIR`, after `pnpm build:cli`):
- `screeny`: bin/description/`projects: no projects yet`/2 help lines, exit 0.
- `screeny --json`: parses, keys `bin description projects help`, projects `[]`, exit 0.
- `screeny nope`: `error: unknown command nope` + `help:`, exit 2; `--json` gives `{error,help}`, exit 2.
- `screeny --bogus`: `error: unknown flag --bogus`, exit 2. Temp cwd contains only the data dir.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Not yet: `home-view-projects` and `unknown-flag` (its step uses `screeny projects --bogus`) need
the `projects`/`new` commands. `missing-argument` needs `new`.

Next: `projects` + `new` (idempotent) commands, then mark `home-view-projects`, `unknown-flag`,
`missing-argument`, `projects-list`, `new-project`, `new-idempotent` after verifying.

## Iteration 6: projects + new (home-view-projects, unknown-flag, missing-argument, projects-list, new-project, new-idempotent)

What changed:
- `src/cli/commands/projects.ts`: `screeny projects` lists `slug  screens: N  name: ...`, or
  `projects: no projects yet` + `help:`; `--json` gives `[{slug,name,screens}]`.
- `src/cli/commands/new.ts`: `screeny new <name...>` creates a project. If `slugify(name)` is
  already taken it prints `project: <slug> already exists` and exits 0 (no `-2` duplicate).
  `--json` returns the project row plus `created: true|false`. Missing name is exit 2.
- `src/cli/main.ts`: dispatches `projects` and `new`.

Evidence (temp cwd, temp `SCREENY_DATA_DIR`, stdin `</dev/null`, after `pnpm build:cli`):
- `projects`: `projects: no projects yet` + help, exit 0; `projects --json`: `[]`, exit 0.
- `new`: `error: missing project name` + `help:`, exit 2 (`--json` gives `{error,help}`).
- `projects --bogus`: `error: unknown flag --bogus` + `help:`, exit 2.
- `new 'Demo App'`: `project: created demo-app`, exit 0.
- `new demo` twice: second prints `project: demo already exists`, exit 0; `new demo --json`
  has `"created": false`.
- `projects`: `projects[2]:` with `demo  screens: 0` and `demo-app  screens: 0`; `--json` array
  of `{slug,name,screens}`. No-arg home lists both with `screens: 0` and 3 `help:` lines.
- Temp cwd stayed empty. `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Next: `add-image` + `add-image-errors` (milestone 7), or the `test:cli` harness (milestone 6) since
`verify.sh` needs `pnpm test:cli`.

## Iteration 10: add-image (add-image, add-image-errors)

What changed:
- `src/cli/commands/add-image.ts`: `screeny add-image <project> <file> [--kind screenshot|logo|image]`.
  File path resolves against the caller's cwd; PNG/JPEG sniffed by magic bytes (the service's
  `imageSize` only reads those, other files were silently stored as 0x0); unknown project maps
  `NotFound` to `error: project X not found` with a projects/new help line. Prints asset id, url,
  kind and size; `--json` prints the asset row.
- `src/cli/main.ts`: dispatches `add-image`.

Evidence (temp cwd, temp `SCREENY_DATA_DIR`, stdin `</dev/null`, after `pnpm build:cli`):
- `add-image demo s.png` (1x1 PNG): `asset: <id>`, `url: /files/p/<pid>/<rand>-s.png`, exit 0;
  file present under `$SCREENY_DATA_DIR/files/p/<pid>/`. `--json` prints the asset object, exit 0.
- `add-image demo nope.png`: `error: cannot read file nope.png` + help, exit 1.
- `add-image ghost s.png`: `error: project ghost not found` + help, exit 1 (`--json` gives `{error,help}`).
- `add-image demo`: `error: missing image file` + help, exit 2. `--kind foo`: exit 2.
- `add-image demo x.txt`: `error: x.txt is not a PNG or JPEG image`, exit 1, nothing stored.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Next: `generate --spec` (generate-from-spec, generate-validation, generate-with-image).

## Iteration 11: generate (generate-from-spec, generate-validation)

What changed:
- `src/cli/commands/generate.ts`: `screeny generate <project> --spec <file.json> [--replace]`. Spec
  path resolves against the caller's cwd, is parsed as JSON and validated with `generateSchema`
  (loaded via dynamic import, like the service). Every spec problem (unreadable, not JSON, schema
  issue) is a usage error, exit 2; zod issues print as `path: message`. Unknown project is exit 1
  with projects/new help. Prints created screen ids/locale/device; `--json` gives
  `{project, created, screens}`.
- `src/cli/main.ts`: dispatches `generate`.

Evidence (temp cwd, temp `SCREENY_DATA_DIR`, stdin `</dev/null`, after `pnpm build:cli`):
- `new demo` then `generate demo --spec spec.json` (iphone-6.9, en, text-only + title-top, Turkish
  subtitle): `screens: created 2 in demo` + 2 rows + render help, exit 0. `projects`:
  `demo  screens: 2`.
- Unknown template: `error: invalid spec: screens.0.template: Invalid option: expected one of ...`,
  exit 2 (`--json` gives `{error,help}`).
- Not JSON: `error: spec nj.json is not valid JSON: Unexpected token ...` (single line), exit 2.
- No `--spec`: `error: missing --spec`, exit 2. Missing file: exit 2. `generate ghost`: exit 1.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Next: `render` (render-png, render-missing-out, render-from-any-cwd), then generate-with-image and
generate-multi-locale, which need render to check output.

## Iteration 12: render (render-png, render-filters, render-missing-out, render-from-any-cwd, generate-multi-locale)

What changed:
- `src/cli/commands/render.ts`: `screeny render <project> [--locale] [--device] --out <dir>`. Out dir
  resolves against the caller's cwd and is created; files are named by `exportFileName`
  (`<locale>/<store>-<device>-NN.png`). Missing `--out` is exit 2. Unknown project, a project with
  no screens, or a filter matching nothing is exit 1 with help. `--json` lists files and sizes.
- `src/cli/main.ts`: dispatches `render`.

Evidence (temp cwd outside the repo, `SCREENY_DATA_DIR=$T/data`, stdin `</dev/null`, after `pnpm build:cli`):
- `generate demo --spec` with `locales: [en, tr]`, `{en,tr}` title/subtitle maps (Turkish `Şık ığdır
  çöğüş`, `İki`): `screens: created 4`, exit 0, no stderr.
- `render demo`: `error: missing --out`, exit 2.
- `render demo --out ./out`: 4 files (= screen count), all start `89504e47`, sizes 27200-99022 bytes,
  exit 0. Temp cwd contains only `data dev out spec.json tr` (no `public`).
- `--locale tr --out ./tr`: only `tr/...` files (2). `--device iphone-6.9`: 4 files.
  `--device ipad-13` and `--locale de`: `error: no screens in demo match ...` + help, exit 1.
- `render ghost --out x`: exit 1. `render empty --out x`: `project empty has no screens`, exit 1.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0. `verify.sh` still fails at `test:cli` (not yet added).

Next: `generate-with-image` (add-image + hero screen referencing the asset, compare PNG size), then
`export --apple`.

## Iteration 13: generate-with-image

What changed:
- No code change needed: `generate` already resolves `screenshot` refs (asset id, asset name or
  `/files/...` URL) via `resolveAssetRef`, and `render` loads the asset file from `SCREENY_DATA_DIR`.
- `features.json`: `generate-with-image` set to passes:true.

Evidence (temp cwd outside the repo, `SCREENY_DATA_DIR=$T/data`, stdin `</dev/null`, `dist-cli/screeny.js`):
- Rendered a text-only screen to `shot.png` (1320x2868), `add-image img shot.png`: `asset: <id>`,
  `url: /files/p/<project>/<hash>-shot.png`, exit 0.
- Hero screen without screenshot, `render txt`: 210672 bytes. Hero screen with `"screenshot": "shot.png"`:
  222987 bytes. Same with `"screenshot": "<asset url>"`: 222987 bytes, exit 0.
- Downscaled both PNGs and inspected them: the text-only one shows the empty placeholder inside the
  phone, the asset one shows the rendered "Shot" image inside the phone.

Next: `export --apple` (export-apple, export-errors), then data-dir-isolation.

## Iteration 14: runtime-error-exit, export --apple

What changed:
- `runtime-error-exit`: no code change; `render` already maps an unknown project to exit 1 with help.
- `src/cli/commands/export.ts`: `screeny export <project> --apple --out <dir>` writes
  `exportAppleZip` output to `<out>/<slug>-appstore.zip` (out dir resolved against the caller's cwd,
  created). Missing `--apple` or `--out` is exit 2 with help. Unknown project and `BadRequest`
  ("No screens to export") are exit 1 with help. `--json` returns `{project, file, bytes}`.
- `src/cli/main.ts`: dispatches `export`.
- `features.json`: `runtime-error-exit`, `export-apple`, `export-errors` set to passes:true.

Evidence (after `pnpm build:cli`, temp cwd outside the repo, `SCREENY_DATA_DIR=$T/data`, stdin `</dev/null`):
- `render missing-project --out $T/o`: `error: project missing-project not found` + `help:` line, exit 1.
- `export demo --apple --out ./out` (2 screens): `exported: .../out/demo-appstore.zip  103308 bytes`,
  exit 0; file starts `PK`; `unzip -l` lists `en/iphone-6.9/01-02.png`, `en/iphone-6.5/01-02.png`, `README.txt`.
- `--json`: `{"project":"demo","file":".../out2/demo-appstore.zip","bytes":103308}`, exit 0.
- `export demo --out ./x`: `error: missing --apple ...` + help, exit 2. Without `--out`: exit 2.
- `export empty --apple --out ./x`: `error: No screens to export` + help, exit 1. `export ghost`: exit 1.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0. `verify.sh` still fails at the missing `test:cli` script.

Next: `no-prompts` needs `skill` and `mcp` commands to exist first; next is `data-dir-isolation`,
then `mcp-tools-module`.

## Blocked
<!-- Things only a human can do (credentials, accounts, decisions). -->
