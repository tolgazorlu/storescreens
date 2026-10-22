import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DEVICES, type DeviceId } from "@/lib/devices";
import { buildLayoutScenes, LAYOUT_KEYS } from "@/lib/layouts";
import { renderSceneToPng } from "@/lib/render";

/** Renders every goldie layout on iPhone and Android with a synthetic capture; panoramas side by side. */
const OUT = process.env.OUT ?? "/tmp/storescreens-layouts";

async function main() {
  await mkdir(OUT, { recursive: true });
  const capture = await sharp({
    create: { width: 1320, height: 2868, channels: 3, background: "#f2f2f7" },
  })
    .composite([
      { input: Buffer.from('<svg width="1320" height="400"><rect width="1320" height="400" fill="#2E3DF2"/></svg>'), top: 0, left: 0 },
      { input: Buffer.from('<svg width="1200" height="300"><rect width="1200" height="300" rx="40" fill="#ffffff"/></svg>'), top: 600, left: 60 },
    ])
    .png()
    .toBuffer();
  const src = `data:image/png;base64,${capture.toString("base64")}`;
  for (const id of ["iphone-6.9", "android-phone"] as DeviceId[]) {
    for (const key of LAYOUT_KEYS) {
      const scenes = buildLayoutScenes(DEVICES[id], key, {
        title: "Fiyat listeleriniz, tek bir QR kod",
        subtitle: "Her listeyi tek yerde toplayın. Şğüçöı İ",
        screenshot: src,
        brand: { background: { type: "gradient", from: "#1d2b64", to: "#f8cdda", angle: 160 } },
      });
      const pngs = await Promise.all(scenes.map((s) => renderSceneToPng(s)));
      const W = DEVICES[id].width;
      const out =
        pngs.length === 1
          ? pngs[0]
          : await sharp({ create: { width: W * 2, height: DEVICES[id].height, channels: 4, background: "#000" } })
              .composite(pngs.map((input, i) => ({ input, left: i * W, top: 0 })))
              .png()
              .toBuffer();
      await writeFile(path.join(OUT, `${id}-${key}.png`), out);
      console.log(id, key, scenes.length);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
