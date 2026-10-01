# Screeny

Store screenshot generator for App Store and Google Play. Upload in-app
screenshots and a logo, generate screens from templates per locale and
device, drag text and mockups around in the editor, export store-ready
PNGs as a ZIP. Agents (Claude Code, Hermes) drive the whole flow over MCP
or REST with an API key.

## Stack

Next.js 16, shadcn (radix-vega, neutral), Postgres via drizzle, Vercel
Blob (local `public/uploads` fallback), satori + resvg for server-side
PNG rendering, `mcp-handler` for the MCP endpoint.

## Run locally

```bash
cp .env.example .env     # set DATABASE_URL, SESSION_SECRET
pnpm install
pnpm db:push             # creates tables
pnpm dev
```

First sign-in creates the account. Further signups are disabled unless
`ALLOW_SIGNUP=true`.

## Deploy (Vercel)

1. Add a Postgres (Neon) store and a Blob store to the project.
2. Env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`,
   `APP_URL=https://<your-domain>`.
3. `pnpm db:push` once against the production database.
4. `vercel deploy --prod`.

## Connect an agent

Create a key under Settings, then:

```bash
claude mcp add --transport http screeny https://<host>/api/mcp \
  --header "Authorization: Bearer sk_..."
```

MCP tools: `list_meta`, `list_projects`, `create_project`, `get_project`,
`upload_asset`, `generate_screens`, `update_screen_text`, `delete_screen`,
`export_zip`. REST mirrors them under `/api/*` with the same Bearer key.

Devices: `iphone-6.9` 1320x2868, `iphone-6.5` 1242x2688, `ipad-13`
2064x2752, `android-phone` 1080x1920. Templates: `hero`, `title-top`,
`caption-bottom`, `split`, `plain`, `text-only`.

## Scene model

One screen = one JSON scene (`src/lib/scene.ts`): background + layers
(text, image, mockup, rect) in output pixels. The same React renderer
(`components/scene/scene-view.tsx`) draws the editor canvas and feeds
satori, so what you see is what exports. Satori constraints apply: flex or
absolute layout only, inline styles, no `undefined` style values.

## Scripts

- `pnpm smoke` renders every template to `/tmp/screeny-*.png`.
- `B=http://localhost:3000 KEY=sk_... node scripts/mcp-smoke.mjs` exercises
  the MCP server end to end.
