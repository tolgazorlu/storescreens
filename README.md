# Screeny

Local store-screenshot generator for App Store and Google Play. Upload
in-app screenshots and a logo, generate screens from templates per locale
and device, drag text and mockups around, export store-ready PNGs as a
ZIP. Agents (Claude Code, Hermes) drive the same flow over MCP or REST.

Single user, no auth, no cloud: SQLite + files under `./data`.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

That's it. Tables are created on first request. Set `SCREENY_DATA_DIR`
to move the database and uploads somewhere else.

## Connect an agent

```bash
claude mcp add --transport http screeny http://localhost:3000/api/mcp
```

MCP tools: `list_meta`, `list_projects`, `create_project`, `get_project`,
`upload_asset`, `generate_screens`, `update_screen_text`, `delete_screen`,
`export_zip`. REST mirrors them under `/api/*` (see `/connect` in the app).

Devices: `iphone-6.9` 1320x2868, `iphone-6.5` 1242x2688, `ipad-13`
2064x2752, `android-phone` 1080x1920. Templates: `hero`, `title-top`,
`caption-bottom`, `split`, `plain`, `text-only`.

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
  (`B=http://localhost:3000` to override).
