// Renders every Pattern Craft background through real headless Chrome so CSS features
// satori can't handle (radial gradients with %, mask-image, fine grid lines) look right.
// Usage: node scripts/render-patterns.mjs <pattern-craft-repo-dir> <outDir>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sharp = require("sharp");

const [, , repoDir, outDir] = process.argv;
if (!repoDir || !outDir) {
  console.error("usage: node scripts/render-patterns.mjs <pattern-craft-repo-dir> <outDir>");
  process.exit(1);
}

const CHROME =
  process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Matches iphone-6.9 (the largest App Store phone slot): other devices cover-crop this master image.
const CSS_W = 440;
const CSS_H = 956;
const SCALE = 3;

function toKebab(key) {
  if (key.startsWith("Webkit")) return "-webkit-" + toKebab(key.slice(6));
  return key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function styleToCss(style) {
  // animation is dropped on purpose: its keyframes live in the site's global CSS, not in
  // `style`, so without them the browser just shows the base (unanimated) declaration — a
  // static frame, which is exactly what a pre-rendered pattern needs.
  return Object.entries(style)
    .filter(([k]) => k !== "animation")
    .map(([k, v]) => `${toKebab(k)}: ${v};`)
    .join("\n");
}

function extractPatterns() {
  const src = readFileSync(path.join(repoDir, "src/data/patterns.ts"), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exportsObj = {};
  new Function("exports", outputText)(exportsObj);
  return exportsObj.gridPatterns;
}

function slugify(id) {
  return id.replace(/[^a-zA-Z0-9-]/g, "-");
}

function renderOne(pattern, tmpDir) {
  const html = `<!doctype html><html><head><style>
html,body{margin:0;padding:0;width:${CSS_W}px;height:${CSS_H}px;overflow:hidden}
.p{width:${CSS_W}px;height:${CSS_H}px;${styleToCss(pattern.style)}}
</style></head><body><div class="p"></div></body></html>`;
  const slug = slugify(pattern.id);
  const htmlFile = path.join(tmpDir, `${slug}.html`);
  const pngFile = path.join(tmpDir, `${slug}.png`);
  writeFileSync(htmlFile, html);
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      `--screenshot=${pngFile}`,
      `--window-size=${CSS_W},${CSS_H}`,
      `--force-device-scale-factor=${SCALE}`,
      "--hide-scrollbars",
      `file://${htmlFile}`,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  return pngFile;
}

async function main() {
  const patterns = extractPatterns();
  const tmpDir = path.join(os.tmpdir(), `patterns-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const manifest = [];
  let failed = 0;
  for (const p of patterns) {
    const dest = path.join(outDir, `${slugify(p.id)}.webp`);
    if (existsSync(dest)) {
      manifest.push({ id: slugify(p.id), name: p.name, category: p.category });
      continue;
    }
    try {
      const png = renderOne(p, tmpDir);
      await sharp(png).webp({ quality: 82 }).toFile(dest);
      manifest.push({ id: slugify(p.id), name: p.name, category: p.category });
    } catch (e) {
      failed++;
      console.error(`FAILED ${p.id}: ${e.message}`);
    }
  }
  manifest.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  rmSync(tmpDir, { recursive: true, force: true });
  console.log(`rendered ${manifest.length}/${patterns.length} patterns (${failed} failed)`);
}

main();
