# Screeny

Local store-screenshot generator for App Store and Google Play. Upload
in-app screenshots and a logo, generate screens from templates per locale
and device, drag text and mockups around, export store-ready PNGs as a
ZIP. Agents (Claude Code, Hermes) drive the same flow over MCP or REST.

Single user, no auth, no cloud: SQLite + files under `./data`.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:4110
```

That's it. Tables are created on first request. Set `SCREENY_DATA_DIR`
to move the database and uploads somewhere else.

## Connect an agent

```bash
claude mcp add --transport http screeny http://localhost:4110/api/mcp
```

MCP tools: `list_meta`, `list_projects`, `create_project`, `get_project`,
`upload_asset`, `generate_screens`, `update_screen_text`, `delete_screen`,
`export_zip`. REST mirrors them under `/api/*` (see `/connect` in the app).

Devices: `iphone-6.9` 1320x2868, `iphone-6.5` 1242x2688, `ipad-13`
2064x2752, `android-phone` 1080x1920. Templates: `hero`, `title-top`,
`caption-bottom`, `split`, `plain`, `text-only`.

## CLI and MCP

The `screeny` CLI drives the same flow without the dev server. Build the
bundle once, then alias it:

```bash
pnpm build:cli                      # writes dist-cli/screeny.js
alias screeny="node $PWD/dist-cli/screeny.js"
screeny                             # home view: projects + next commands
```

```bash
screeny new "Demo App"
screeny add-image demo-app ./shots/home.png
screeny generate demo-app --spec ./spec.json
screeny render demo-app --out ./out          # out/<locale>/*.png
screeny export demo-app --apple --out ./out  # out/demo-app-appstore.zip
```

`spec.json` lists screens for a device and locale, e.g.
`{"device":"iphone-6.9","locale":"en","screens":[{"template":"hero","title":"Plan your week","screenshot":"home.png"}]}`.
Add `--json` to any command for machine output. Exit codes: 0 ok, 1
runtime error, 2 usage error. Commands never prompt.

Register the stdio MCP server (no dev server needed):

```bash
claude mcp add screeny -- node "$PWD/dist-cli/screeny.js" mcp
```

Install the agent skill (full command and spec reference) for Claude Code:

```bash
screeny skill install            # ~/.claude/skills/screeny/SKILL.md
screeny skill                    # or just print it
```

`pnpm test:cli` builds the bundle and runs the end-to-end CLI tests.

## Editor

- Tab: single / all-screens view. G: grid overlay. Safe-area and layer
  outline toggles in the toolbar.
- Drag layers; they snap to canvas center, edges and other layers (hold
  Alt to disable). Corner handles resize; Shift keeps text ratio.
- Arrow keys nudge (Shift = 20px), Backspace deletes, ⌘D duplicates,
  ⌘Z / ⇧⌘Z undo/redo, ⌘0 fit, ⌘1 100%, ⌘+wheel zoom.
- Align buttons center or pin the selected layer to the safe area.

## Stack

Next.js 16, shadcn (radix-vega, neutral), drizzle + libsql (SQLite),
satori + resvg for server-side PNG rendering, `mcp-handler`.

## Scene model

One screen = one JSON scene (`src/lib/scene.ts`): background + layers
(text, image, mockup, rect) in output pixels. The same React renderer
(`components/scene/scene-view.tsx`) draws the editor, the previews and
feeds satori, so what you see is what exports. Satori constraints apply:
flex or absolute layout only, inline styles, no `undefined` style values.

## Scripts

- `pnpm smoke` renders every template to `/tmp/screeny-*.png`.
- `pnpm mcp:smoke` exercises the MCP server against a running dev server
  (`B=http://localhost:4110` to override).
