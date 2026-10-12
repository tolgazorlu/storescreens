---
name: screeny
description: Create App Store and Google Play screenshot sets (projects, screens from a JSON spec, PNG renders, App Store zip) with the screeny CLI or its MCP server.
---

# screeny

Local tool that turns a JSON spec plus in-app screenshots into store-ready screenshot PNGs and
an App Store upload zip. Data lives in a local SQLite database and files under `./data`, or
under `SCREENY_DATA_DIR` when set. No accounts, no network calls.

## Start here

Run `screeny` with no arguments. It prints `bin:`, `description:`, the existing projects (slug
and screen count) or `projects: no projects yet`, and `help:` lines with the next commands.

## Commands

| Command | What it does |
| --- | --- |
| `screeny` | Home view: projects and suggested next commands |
| `screeny projects` | List projects (slug, name, screens) |
| `screeny new <name>` | Create a project; if it already exists, reports it and exits 0 |
| `screeny add-image <project> <file> [--kind screenshot\|logo\|image]` | Store a PNG or JPEG as a project asset (default kind `screenshot`) |
| `screeny generate <project> --spec <file.json> [--replace]` | Create screens from a JSON spec; `--replace` drops existing screens for the same locale and device first |
| `screeny render <project> --out <dir> [--locale <code>] [--device <id>]` | Write one PNG per screen into `<dir>/<locale>/` |
| `screeny export <project> --apple --out <dir>` | Write `<slug>-appstore.zip` (App Store Connect layout) into `<dir>` |
| `screeny mcp` | Run the MCP server over stdio (see below) |
| `screeny skill` | Print this skill |
| `screeny skill install [--dir <dir>] [--force]` | Write this skill to `<dir>/SKILL.md` (default `~/.claude/skills/screeny`); unchanged files are reported, edited files are only replaced with `--force` |
| `screeny --version` | Print the version (`-v` and `version` also work) |

`<project>` is a project slug or id. Relative paths (`<file>`, `--spec`, `--out`) resolve
against the current directory.

## Output, errors and exit codes

- Default output is plain `key: value` lines. Add `--json` to any command for one JSON value on
  stdout.
- Errors print `error: <message>` and `help: <next command>` (with `--json`:
  `{"error": "...", "help": "..."}`).
- Exit 0 on success, 1 on a runtime error (missing project, unreadable image), 2 on a usage
  error (unknown command, unknown flag, missing argument, invalid spec).
- Commands never prompt for input.

## Generate spec

```json
{
  "device": "iphone-6.9",
  "locale": "en",
  "screens": [
    { "template": "hero", "title": "Plan your week", "subtitle": "In seconds", "screenshot": "home.png" },
    { "template": "text-only", "title": "Built for focus" }
  ]
}
```

- `device`: `iphone-6.9`, `iphone-6.5`, `ipad-13`, `android-phone`, `iphone-duo-outer`,
  `iphone-duo-inner`, `appstore-header`, `appstore-search`, `appstore-universal`.
- `template`: `hero`, `hero-bleed`, `title-top`, `caption-bottom`, `split`, `feature-list`,
  `two-phones`, `duo`, `pair`, `creative`, `plain`, `text-only`.
- `screens`: 1 to 10 entries. Optional per screen: `title`, `subtitle`, `screenshot`,
  `screenshot2`, `screenshot3` (asset id, asset name from `add-image`, or its `/files/...` URL),
  `bullets` (up to 4), `titleScale`, `phoneScale`, `phoneOffsetY`.
- Several locales at once: use `"locales": ["en", "tr"]` instead of `locale`, and give
  `title`, `subtitle` or `screenshot` as maps like `{"en": "Hello", "tr": "Merhaba"}`.
- Optional top level: `logo`, `brand` (overrides on the project brand), `replace`.

## Typical flow

```sh
screeny new "Demo App"
screeny add-image demo-app ./shots/home.png
screeny generate demo-app --spec ./spec.json
screeny render demo-app --out ./out
screeny export demo-app --apple --out ./out
```

## MCP alternative

`screeny mcp` serves the same actions as MCP tools over stdio, for clients that prefer tool
calls to shelling out. Register it as a stdio server with command `screeny` and args `["mcp"]`.
Tools: `list_meta`, `list_projects`, `create_project`, `get_project`, `upload_asset`,
`set_brand`, `generate_screens`, `update_screen_text`, `propagate_layout`, `export_copy_csv`,
`import_copy_csv`, `delete_screen`, `export_zip`, `derive_screens`, `export_apple_zip`,
`export_creative_zip`. stdout carries only JSON-RPC; set `SCREENY_DATA_DIR` in the server env to
choose the data directory.
