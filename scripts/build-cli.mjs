// Bundles src/cli/main.ts into a single ESM file, dist-cli/screeny.js.
import { build } from "esbuild";
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const outdir = path.join(root, "dist-cli");

await rm(outdir, { recursive: true, force: true });
await build({
  absWorkingDir: root,
  entryPoints: ["src/cli/main.ts"],
  outfile: path.join(outdir, "screeny.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  tsconfig: "tsconfig.json",
  alias: { "server-only": "./scripts/server-only-shim.ts" },
  banner: { js: "#!/usr/bin/env node" },
  define: { __SCREENY_VERSION__: JSON.stringify(pkg.version) },
  logLevel: "warning",
});
// Mark the bundle as ESM so node does not warn and reparse it.
await writeFile(path.join(outdir, "package.json"), '{ "type": "module" }\n');
