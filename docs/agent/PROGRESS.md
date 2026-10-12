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

## Iteration 15: mcp-tools-module

Changed: moved all 16 MCP tool registrations verbatim from `src/app/api/mcp/route.ts` into
`src/lib/mcp-tools.ts`, which exports `registerScreenyTools(server, origin)`. The route still
exists and now only wires `createMcpHandler` + the request-origin store to that function, so the
stdio CLI can reuse the same tools.

Evidence:
- `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm smoke` exit 0.
- `SCREENY_DATA_DIR=$(mktemp -d) next dev -p 4119` + `B=http://localhost:4119 pnpm mcp:smoke`:
  exit 0, `tools: list_meta, list_projects, create_project, get_project, upload_asset, set_brand,
  generate_screens, update_screen_text, propagate_layout, export_copy_csv, import_copy_csv,
  delete_screen, export_zip, derive_screens, export_apple_zip, export_creative_zip` (same 16 names),
  generate/update/zip/derive/apple zip all succeeded.
- `verify.sh` still fails only at the missing `test:cli` script.

Next: `data-dir-isolation` needs `test/cli.test.mjs` (test-cli-suite); take `mcp-stdio-initialize`
(a `screeny mcp` command over the SDK stdio transport using `registerScreenyTools`).

## Iteration 16: mcp-stdio-initialize, mcp-stdio-tools-list

Changed: new `src/cli/commands/mcp.ts` (`screeny mcp`) serves the shared tools over stdio with
`serveStdio` from `@modelcontextprotocol/server/stdio`; the factory builds an `McpServer`
named `screeny` (bundle version) and calls `registerScreenyTools(server, () => "")`, after
`loadService()` sets the public dir. Errors go to stderr. `main.ts` dispatches `mcp`.

Evidence (after `pnpm build:cli`, temp cwd, temp `SCREENY_DATA_DIR`, same piped input as the
verify.sh "mcp stdio" stage, stdin closed after `tools/list`):
- exit 0, stderr empty, stdout 2 lines, both parse as JSON.
- line 1: `{"result":{"protocolVersion":"2025-06-18",...,"serverInfo":{"name":"screeny","version":"0.1.0"}},"jsonrpc":"2.0","id":1}`.
- line 2: 16 tools, includes list_projects/create_project/generate_screens, every inputSchema has `type: "object"`.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0. verify.sh still stops at the missing `test:cli` script.

Note: download URLs from stdio tools are currently origin-relative (`/files/...`); file paths
for stdio (PLAN ctx idea) are not done yet.

Next: `mcp-stdio-tool-call` (create_project + list_projects over stdio), then `mcp-stdout-clean`.

## Iteration 17: mcp-stdio-tool-call, mcp-stdout-clean

Changed: no code. Both features already hold with the iteration 16 `screeny mcp` command.

Evidence (after `pnpm build:cli`, temp cwd, temp `SCREENY_DATA_DIR`, a node client that spawns
`screeny mcp` and waits for each response before sending the next request):
- create_project {name: demo} returned the project (no isError); list_projects then returned
  `[ { ..., "name": "demo", "slug": "demo", ... } ]`. Exit 0.
- Second run: initialize, tools/list, create_project, generate_screens (iphone-6.9, text-only,
  title "Hi Şğü"), export_zip, get_project on a missing project. 6 stdout lines, 0 non-JSON,
  no trailing partial line, stderr 0 bytes, exit 0. generate and zip succeeded (zip 28594 bytes),
  the missing project came back as a tool result with isError true, not as stdout noise.
- `grep` over src/lib and src/cli: the only stdout writer is `src/cli/output.ts`, which the mcp
  command does not use.

Note: when requests are piped without waiting (as verify.sh does), tools/call requests run
concurrently, so list_projects can answer before create_project finishes. Tests must await each
response, as real MCP clients do.

Next: `skill-file` (skills/screeny/SKILL.md), then `skill-print` and `skill-install`; after
those, `no-prompts` and `test-cli-suite` become possible.

## Iteration 18: skill-file

Changed: new `skills/screeny/SKILL.md` with frontmatter `name: screeny` and a one-line
`description`. It documents the home view, every command (`projects`, `new`, `add-image`,
`generate`, `render`, `export`, `mcp`, `skill`, `skill install`, `--version`), `--json`, the
error/help format and exit codes 0/1/2, the generate spec (devices, templates, locales maps),
a typical flow, and the MCP alternative (`screeny mcp` stdio registration plus all 16 tool
names). Device and template ids were copied from `src/lib/devices.ts` and `src/lib/templates.ts`.

Evidence: after `pnpm build:cli`, in a temp cwd with a temp `SCREENY_DATA_DIR`, ran the
skill's typical flow using the skill's own JSON spec example (extracted with awk):
`new "Demo App"` -> created demo-app; `add-image demo-app ./home.png` -> asset named home.png;
`generate` -> created 2 screens (the `"screenshot": "home.png"` name reference resolved);
`render --out ./out` -> 2 PNGs in `out/en/`; `export --apple` -> demo-app-appstore.zip
244366 bytes; exit 0. The render row was corrected to say PNGs go to `<dir>/<locale>/`.

Note: the skill already documents `screeny skill` and `skill install` per SPEC; those commands
are not implemented yet.

Next: `skill-print` (embed SKILL.md in the bundle via a text loader/define in
scripts/build-cli.mjs, add `screeny skill`), then `skill-install`.

## Iteration 19: test:cli suite, no-prompts, data-dir-isolation, verify gate

verify.sh failed at the missing `pnpm test:cli`, so this iteration fixed the gate.

Changed: `package.json` gains `test:cli` (`pnpm build:cli && node --test "test/*.test.mjs"`).
New `test/cli.test.mjs` (node:test, 14 tests) spawns `dist-cli/screeny.js` with a mkdtemp
`SCREENY_DATA_DIR`, a mkdtemp cwd and stdin closed (`stdio: ignore`). It covers the home view
(empty, listed, --json), `--version`/`-v`/`version`, usage errors (unknown command/flag, missing
argument, invalid and unparsable spec: exit 2), missing project (exit 1), `new` idempotency,
generate + render (PNG signature, files in `out/en/`), apple export (`PK` zip), export without
`--apple` (exit 2), every non-mcp command terminating with stdin closed, and an awaited MCP stdio
session (initialize, tools/list, create_project, list_projects, every stdout line is JSON-RPC).
`docs/agent/verify.sh`: the end-to-end PNG signature loop used `out/*.png`, which matched nothing
because render writes `<out>/<locale>/*.png` (needed: file names carry no locale, so a flat
layout collides across locales). It now iterates `find "$E2E/out" -name '*.png'`; same check,
all PNGs covered.

Evidence: `pnpm test:cli` -> tests 14, pass 14, fail 0. `bash docs/agent/verify.sh` -> exit 0,
"verify: all checks passed" (install, lint, typecheck, smoke, build:cli, test:cli, temp-cwd e2e,
mcp stdio). Marked `no-prompts`, `data-dir-isolation`, `test-cli-suite`, `verify-gate` passing.

Next: `skill-print`, `skill-install` (add tests for both to test/cli.test.mjs), then
`readme-cli-section`.

## Blocked
<!-- Things only a human can do (credentials, accounts, decisions). -->
