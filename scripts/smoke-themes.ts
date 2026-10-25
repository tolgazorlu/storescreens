import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DEVICES, type DeviceId } from "@/lib/devices";
import { buildLayoutScenes, LAYOUT_KEYS } from "@/lib/layouts";
import { renderSceneToPng } from "@/lib/render";
import { applyPreset, BRAND_PRESETS } from "@/lib/brand";

/** Renders every layout with one theme, and one layout across many themes, for a visual render check. */
const OUT = process.env.OUT ?? "/tmp/storescreens-themes";

async function synthCapture(): Promise<string> {
  const png = await sharp({ create: { width: 1320, height: 2868, channels: 3, background: "#f2f2f7" } })
    .composite([
      { input: Buffer.from('<svg width="1320" height="500"><rect width="1320" height="500" fill="#2E3DF2"/></svg>'), top: 0, left: 0 },
      { input: Buffer.from('<svg width="1200" height="320"><rect width="1200" height="320" rx="40" fill="#ffffff"/></svg>'), top: 650, left: 60 },
      { input: Buffer.from('<svg width="1200" height="320"><rect width="1200" height="320" rx="40" fill="#ffffff"/></svg>'), top: 1050, left: 60 },
    ])
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function renderOne(id: DeviceId, key: (typeof LAYOUT_KEYS)[number], brand: Record<string, unknown>, src: string, name: string) {
  const device = DEVICES[id];
  const scenes = buildLayoutScenes(device, key, {
    title: "Your *best* feature, in one shot",
    subtitle: "A short line that sells the screen",
    eyebrow: "NEW",
    screenshot: src,
    brand,
  });
  const pngs = await Promise.all(scenes.map((s) => renderSceneToPng(s)));
  const W = device.width;
  const out =
    pngs.length === 1
      ? pngs[0]
      : await sharp({ create: { width: W * 2, height: device.height, channels: 4, background: "#000" } })
          .composite(pngs.map((input, i) => ({ input, left: i * W, top: 0 })))
          .png()
          .toBuffer();
  await writeFile(path.join(OUT, `${name}.png`), out);
  console.log(name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const src = await synthCapture();

  // 1) every layout, one theme (the required warm 70s retro theme).
  const retro = applyPreset("retro-sunset-70s");
  for (const key of LAYOUT_KEYS) {
    await renderOne("iphone-6.9", key, retro, src, `layout-${key}`);
  }

  // 2) one layout (hero), a dozen contrasting themes across every group.
  const sampleThemes = [
    "light", "dark", "near-black", "lime-bright", "sunset-orange", "hot-pink",
    "pastel-lavender", "pastel-peach", "retro-sunset-70s", "retro-teal-cream",
    "mono-ink", "mesh-aurora", "mesh-candy", "diagonal-fire",
  ];
  for (const id of sampleThemes) {
    if (!BRAND_PRESETS[id]) throw new Error(`unknown theme ${id}`);
    await renderOne("iphone-6.9", "hero", applyPreset(id), src, `theme-${id}`);
  }

  // 3) a few new layouts on iphone-6.5 and android to check cross-device fit.
  for (const id of ["iphone-6.5", "android-phone"] as DeviceId[]) {
    for (const key of ["bold-type", "card", "badge", "callout", "stat"] as const) {
      await renderOne(id, key, applyPreset("mesh-ocean"), src, `${id}-${key}`);
    }
  }

  // 4) RTL check.
  for (const key of ["hero", "bold-type", "badge", "panorama"] as const) {
    const device = DEVICES["iphone-6.9"];
    const scenes = buildLayoutScenes(device, key, {
      title: "تطبيقك *الأفضل* في لقطة واحدة",
      subtitle: "سطر قصير يبيع هذه الشاشة",
      eyebrow: "جديد",
      screenshot: src,
      brand: applyPreset("deep-navy"),
    });
    const pngs = await Promise.all(scenes.map((s) => renderSceneToPng(s)));
    const W = device.width;
    const out =
      pngs.length === 1
        ? pngs[0]
        : await sharp({ create: { width: W * 2, height: device.height, channels: 4, background: "#000" } })
            .composite(pngs.map((input, i) => ({ input, left: i * W, top: 0 })))
            .png()
            .toBuffer();
    await writeFile(path.join(OUT, `rtl-${key}.png`), out);
    console.log("rtl", key);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
