# Screeny agent notes

Factory protocol: ~/projects/cortex/playbooks/factory.md. Project note:
~/projects/cortex/projects/screeny.md.

- Scene JSON is the contract between editor, API and exporter. Change
  `src/lib/scene.ts` + `templates.ts` + `scene-view.tsx` together.
- Renderer rules (satori): inline styles, every multi-child div
  `display:flex`, never pass `undefined` as a style value, keep box-shadow
  blur small (large blur crashes resvg).
- Fonts: full Inter TTFs in `public/fonts` (fontsource subsets lack
  Turkish glyphs under satori).
- `serverExternalPackages` must include satori, harfbuzzjs, resvg, pg.
- Asset URLs are stored relative (`/uploads/...`) in dev and absolute Blob
  URLs in prod; `render.ts` resolves both.
- Verify: `pnpm lint`, `npx tsc --noEmit`, `pnpm smoke`, `scripts/mcp-smoke.mjs`.
