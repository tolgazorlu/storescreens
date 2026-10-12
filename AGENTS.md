# Storescreens agent notes

Maintainer notes (only if present on this machine): `~/projects/cortex/playbooks/factory.md`
and `~/projects/cortex/projects/storescreens.md`.

- Local single-user tool: no auth, SQLite + files in `./data` (gitignored).
  Do not add accounts, cloud storage or deploy config.
- Scene JSON is the contract between editor, API and exporter. Change
  `src/lib/scene.ts` + `templates.ts` + `scene-view.tsx` together.
- Renderer rules (satori): inline styles, every multi-child div
  `display:flex`, never pass `undefined` as a style value, keep box-shadow
  blur small (large blur crashes resvg).
- Fonts: full Inter TTFs in `public/fonts` (fontsource subsets lack
  Turkish glyphs under satori).
- `serverExternalPackages` must include satori, harfbuzzjs, resvg, libsql.
- The server binds 127.0.0.1 and `src/proxy.ts` refuses requests whose Host is not loopback
  or whose Origin is another site. Keep both.
- Verify: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm smoke`, `pnpm mcp:smoke`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
