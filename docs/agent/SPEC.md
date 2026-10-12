# Spec: storeframe CLI

## Goal

Add a `storeframe` command-line tool so people and AI agents can create and export App Store / Google
Play screenshot sets without starting the Next.js server or opening a browser. It reuses the
existing service layer (`src/lib/service.ts`), renderer (`src/lib/render.ts`) and SQLite data
directory, so a set made in the editor and a set made by the CLI are the same thing. It follows
The tool standard: agent-friendly output, an MCP server, an embedded skill, end-to-end tests.

## Non-goals

- No changes to the editor UI or its behaviour, no new screens, no restyling.
- No accounts, cloud storage, deploy config or network services (the tool stays local-only).
- No npm publishing, no Homebrew, no release tags in this work.
- Do not remove the existing HTTP MCP route (`src/app/api/mcp/route.ts`).

## Hard constraints

- TypeScript, bundled into one Node ESM file `dist-cli/storeframe.js` (Vite or esbuild SSR build,
  dependencies external, `#!/usr/bin/env node` banner). `pnpm build:cli` builds it.
- `server-only` is imported by `src/lib/service.ts`, `render.ts`, `storage.ts`, `api.ts`; the CLI
  bundle must alias it to an empty module instead of editing those files. `@/` path aliases must
  resolve in the bundle.
- Data directory: `STOREFRAME_DATA_DIR` (already honoured by `src/lib/db`). Tests and the agent itself
  must always run with a temporary `STOREFRAME_DATA_DIR`. Never read or write
  any real data directory.
- Fonts are loaded from `public/fonts`; resolve that path relative to the repo root, not the cwd,
  so the CLI works from any directory.
- CLI contract (AXI):
  - `storeframe` with no arguments prints `bin:`, `description:`, the projects (slug, screens count)
    or an explicit "no projects" line, and 2-3 `help:` lines with next commands.
  - Every command accepts `--json`. Errors go to stdout as `error: ...` plus `help: ...`
    (or `{"error","help"}` with `--json`).
  - Exit 0 ok, 1 runtime error, 2 usage error (unknown command, unknown flag, missing argument).
    Unknown flags are rejected by name.
  - Idempotent where possible (creating a project that already exists reports it, exit 0).
  - `--version`, `-v`, `version` print the bare version from package.json.
  - No interactive prompts.
- Commands (minimum):
  - `storeframe projects` list projects.
  - `storeframe new <name>` create a project.
  - `storeframe add-image <project> <file>` add a screenshot asset.
  - `storeframe generate <project> --spec <file.json>` run `generateScreens` from a JSON spec.
  - `storeframe render <project> [--locale x] [--device y] --out <dir>` write PNGs.
  - `storeframe export <project> --apple --out <dir>` write the App Store zip the API already builds.
  - `storeframe mcp` stdio MCP server exposing the same actions (reuse the tool definitions of the
    HTTP route where practical; keep schemas strict).
  - `storeframe skill` prints `skills/storeframe/SKILL.md`; `storeframe skill install [--dir d] [--force]`
    writes it (default `~/.claude/skills/storeframe/SKILL.md`), idempotent.
- `skills/storeframe/SKILL.md` is the canonical agent skill (name + one-line description, commands,
  `--json`, MCP alternative). The CLI embeds it at build time.
- Tests: `test/cli.test.mjs` with `node:test`, run by `pnpm test:cli` (builds first, glob form
  `node --test "test/*.test.mjs"`). Tests drive the built binary as a subprocess with a temp
  `STOREFRAME_DATA_DIR`: home view, version, usage errors (exit 2 + help), project create + generate
  + render produce real PNG files (check PNG signature and size), apple export zip exists, MCP
  initialize + tools/list + one tool call over stdio.
- Existing checks must keep passing: `pnpm lint`, `pnpm typecheck`, `pnpm smoke`.
- README gets a "CLI and MCP" section. Commit messages: English, `type: subject`, no AI attribution.

## Done when

- `docs/agent/verify.sh` exits 0. It runs: `pnpm install --frozen-lockfile`, `pnpm lint`,
  `pnpm typecheck`, `pnpm smoke` (with `OUT` set to a temp dir), `pnpm build:cli`, `pnpm test:cli`.
- From a temp directory, with a temp `STOREFRAME_DATA_DIR`:
  `node <repo>/dist-cli/storeframe.js new demo && node <repo>/dist-cli/storeframe.js generate demo --spec <spec> && node <repo>/dist-cli/storeframe.js render demo --out ./out`
  leaves PNG files in `./out`, and `storeframe export demo --apple --out ./out` leaves a zip.
- `node dist-cli/storeframe.js mcp` answers `initialize` and `tools/list` over stdio.
