# Storescreens

Landing page: **https://storescreens.vercel.app** (static, from `site/`). The app itself runs on your machine, see Run below.

Local store-screenshot generator for App Store and Google Play. Upload
in-app screenshots and a logo, generate screens from templates per locale
and device, drag text and mockups around, export store-ready PNGs as a
ZIP. Agents (Claude Code, Hermes) drive the same flow over MCP or REST.

Single user, no auth, no cloud: SQLite + files under `./data`.

## Run

Requirements: Node 22+, pnpm 9+. macOS only for `scripts/fetch-bezels.sh`
(it mounts Apple's DMGs with `hdiutil`); everything else runs anywhere.

```bash
pnpm install
scripts/fetch-bezels.sh   # optional: Apple's official iPad / iPhone Duo bezels (Apple Design Resources)
pnpm dev                  # http://localhost:4110
```

That's it. Tables are created on first request. Set `STORESCREENS_DATA_DIR`
to move the database and uploads somewhere else. Without the bezels, iPad
and Duo mockups fall back to a generic drawn frame.

The server binds 127.0.0.1 and refuses requests whose `Host` is not
loopback or whose `Origin` is another site: there is no auth, so this is
what keeps other websites and other machines out of your projects.

## Connect an agent

```bash
claude mcp add --transport http storescreens http://localhost:4110/api/mcp
```

MCP tools: `list_meta`, `list_projects`, `create_project`, `get_project`,
`upload_asset`, `capture_screens`, `generate_screens`, `update_screen_text`,
`delete_screen`, `export_zip`. REST mirrors them under `/api/*` (see
`/connect` in the app).

Devices: `iphone-6.9` 1320x2868, `iphone-6.5` 1242x2688, `ipad-13`
2064x2752, `android-phone` 1080x1920. Templates: `hero`, `title-top`,
`caption-bottom`, `split`, `plain`, `text-only`.

### goldie look

The layouts, template styles and device frames of
[goldie](https://github.com/software-mansion-labs/goldie) (MIT) are built in.
`generate_screens` takes `style` (`editorial`, `showcase`, `magazine`,
`storyboard`, `dynamic`) or a per-screen `layout` (`classic`, `copy-below`,
`hero`, `offset`, `tilt`, `tilt-right`, `duo`, `duo-tilt`, `panorama`,
`panorama-duo`, `minimal`) and `frame` (`iphone-17-pro-blue|silver|orange`;
Android uses the Pixel 10 Pro frame). Panorama layouts span two store tiles
and become two screens. Frame credits: `public/frames/ATTRIBUTION.md`.

`capture_screens` launches an app on a booted iOS simulator in a given
locale, pins the status bar to 9:41, optionally replays an
[argent](https://github.com/software-mansion/argent) e2e flow per shot, and
uploads the screenshots as assets. Call it once per locale, then pass the
asset ids to `generate_screens` with `locales`. `pnpm smoke:layouts` renders
every layout to `/tmp/storescreens-layouts`.

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

- `pnpm test` runs the unit tests (request guard, scene validation).
- `pnpm smoke` renders every template to `/tmp/storescreens-*.png`.
- `pnpm mcp:smoke` exercises the MCP server against a running dev server
  (`B=http://localhost:4110` to override).
