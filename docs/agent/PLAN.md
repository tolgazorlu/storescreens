# Plan

<!-- Written by `gece plan` (initializer agent). Milestones small enough for one iteration. -->

## Architecture

- `src/cli/` holds the CLI: `main.ts` (argv parsing, AXI output, exit codes), `commands/*.ts`
  (one file per command), `mcp.ts` (stdio MCP server). Commands call `src/lib/service.ts`
  directly; no HTTP, no Next.js runtime.
- MCP tool definitions move out of `src/app/api/mcp/route.ts` into `src/lib/mcp-tools.ts`
  (a `registerTools(server, ctx)` function). The HTTP route and `screeny mcp` both call it; `ctx`
  supplies how results are delivered (absolute URLs for HTTP, file paths for stdio).
- Static assets: a new `PUBLIC_DIR` (`src/lib/paths.ts`, env `SCREENY_PUBLIC_DIR`, default
  `<cwd>/public`) replaces the `process.cwd()` joins in `render.ts`. The CLI sets it from the
  bundle location (`<repo>/public`) before loading the service layer (dynamic import).
- Bundle: esbuild (new devDependency) builds `src/cli/main.ts` to `dist-cli/screeny.js`, ESM,
  platform node, `packages: "external"`, alias `server-only` to `scripts/server-only-shim.ts`,
  `@/` via tsconfig paths, shebang banner, `skills/screeny/SKILL.md` and the package version
  injected via `define`/text loader. Build script: `scripts/build-cli.mjs`.
- `dist-cli/` is gitignored and eslint-ignored. Tests in `test/cli.test.mjs` spawn the binary
  with a temp `SCREENY_DATA_DIR` and a temp cwd.

## Unknowns to settle early

- Stdio transport export path in `@modelcontextprotocol/server` v2 (check its package.json
  `exports` after install). Use the SDK transport; do not hand-roll JSON-RPC.
- Whether `libsql`/`sharp`/`@resvg/resvg-js` load fine from an external ESM bundle outside the
  repo cwd (they resolve from `<repo>/node_modules` because the bundle lives in the repo).
- `pnpm smoke` fetches a logo over the network; offline runs may fail that one case.

## Milestones

1. **Baseline.** `pnpm install`, run lint, typecheck, `OUT=$(mktemp -d) pnpm smoke`. Record
   results in PROGRESS.md. Accept: all three pass (or failures logged as pre-existing).
2. **Public dir resolver.** Add `src/lib/paths.ts` with `PUBLIC_DIR`; use it in `render.ts` for
   fonts and bezels. Accept: lint, typecheck, smoke pass; `rg "process.cwd" src/lib/render.ts`
   empty.
3. **Bundle skeleton.** esbuild devDep, `scripts/build-cli.mjs`, `build:cli` script,
   `src/cli/main.ts` printing version; gitignore + eslint ignore `dist-cli/`. Accept:
   `pnpm build:cli && node dist-cli/screeny.js --version` prints `0.1.0`; file starts with
   `#!/usr/bin/env node`.
4. **AXI core.** Arg parser (positional + known flags per command, `--json`), output helpers
   (`error:`/`help:` lines or JSON), exit codes 0/1/2, `version`/`-v`/`--version`, unknown
   command/flag rejection by name. Accept: manual runs show exit 2 + help for `screeny nope`
   and `screeny projects --bogus`.
5. **Home view + projects + new.** No-arg home (`bin:`, `description:`, project list or
   "no projects", `help:` lines), `projects`, idempotent `new`. Accept: with temp data dir,
   `new demo` twice exits 0 both times and `projects --json` lists one project.
6. **Test harness.** `test/cli.test.mjs` with `node:test`, `test:cli` script (build then
   `node --test "test/*.test.mjs"`), helpers for temp data dir and spawning. Cover milestones
   3-5. Accept: `pnpm test:cli` passes.
7. **add-image + generate.** `add-image` stores via `storeFile`/`addAsset`; `generate --spec`
   parses JSON with `generateSchema` and calls `generateScreens`. Validation errors are exit 2
   with the zod message. Accept: tests for both, including bad spec file.
8. **render.** `render <project> [--locale] [--device] --out <dir>`, file names from
   `exportFileName`, out dir created, resolved against the caller's cwd. Accept: test checks PNG
   signature and non-trivial size; manual run from a temp cwd works.
9. **export --apple.** Writes `exportAppleZip` output to `<out>/<slug>-appstore.zip`. Missing
   `--apple` is a usage error. Accept: test asserts the zip exists and starts with `PK`.
10. **Shared MCP tools.** Extract registrations into `src/lib/mcp-tools.ts`; HTTP route uses it
    unchanged in behaviour. Accept: lint, typecheck pass; tool names and schemas identical
    (diff the list); `pnpm mcp:smoke` if a dev server is available.
11. **`screeny mcp`.** Stdio server via SDK transport using `registerTools`. Accept: test sends
    `initialize`, `tools/list`, and `list_projects` call over stdio and checks responses.
12. **Skill.** `skills/screeny/SKILL.md`; embedded in bundle; `skill` prints it; `skill install
    [--dir] [--force]` writes it, idempotent (reports unchanged/exists). Accept: tests with a
    temp `--dir`, never the real `~/.claude`.
13. **Docs + gate.** README "CLI and MCP" section; `docs/agent/verify.sh` passes end to end.
    Accept: `bash docs/agent/verify.sh` exits 0.
