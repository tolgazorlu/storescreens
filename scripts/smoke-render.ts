import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEVICES } from "@/lib/devices";
import { buildScene, TEMPLATE_IDS } from "@/lib/templates";
import { renderSceneToPng } from "@/lib/render";
import { applyPreset } from "@/lib/brand";

const OUT = process.env.OUT ?? "/tmp";
const REF = path.join(process.cwd(), "scripts", "reference");

async function main() {
  const t0 = Date.now();
  await mkdir(OUT, { recursive: true });
  for (const id of TEMPLATE_IDS) {
    const scene = buildScene(DEVICES["iphone-6.9"], id, {
      title: "Fiyat listeleriniz, tek bir QR kod",
      subtitle: "Her listeyi tek, düzenli bir yerde toplayın. Şğüçöı İ",
      logo: "https://raw.githubusercontent.com/github/explore/main/topics/react/react.png",
    });
    const png = await renderSceneToPng(scene);
    await writeFile(path.join(OUT, `storeframe-${id}.png`), png);
    console.log(id, png.length, "bytes", Date.now() - t0, "ms");
  }

  // Mixed Arabic / Latin / digits. Compare against scripts/reference/*.png
  // after any text change (open both in an image viewer).
  const ar = buildScene(DEVICES["iphone-6.9"], "title-top", {
    title: "استورد من Excel حتى 2,000 منتج.",
    subtitle: "صدّر إلى PDF أو Excel في ثوانٍ. الأرقام ١٢٣٤٥ تبقى صحيحة.",
  });
  const png = await renderSceneToPng(ar);
  await writeFile(path.join(OUT, "storeframe-arabic.png"), png);
  if (process.env.UPDATE_REF) {
    await mkdir(REF, { recursive: true });
    await writeFile(path.join(REF, "arabic.png"), png);
  }
  console.log("arabic", png.length, "bytes", Date.now() - t0, "ms");

  const he = buildScene(DEVICES["iphone-6.9"], "title-top", {
    title: "ייבוא מ-Excel עד 2,000 מוצרים.",
    subtitle: "ייצוא ל-PDF תוך שניות.",
    fontFamily: "Noto Sans Hebrew",
  });
  const hePng = await renderSceneToPng(he);
  await writeFile(path.join(OUT, "storeframe-hebrew.png"), hePng);
  if (process.env.UPDATE_REF)
    await writeFile(path.join(REF, "hebrew.png"), hePng);
  console.log("hebrew", hePng.length, "bytes", Date.now() - t0, "ms");

  // Auto-fit: a 170px title that cannot fit its box shrinks until it does.
  const deBase = buildScene(DEVICES["iphone-6.9"], "title-top", {
    title: "TAGESABSCHLUSS FERTIG",
    subtitle: "Kasse in Sekunden abschließen.",
  });
  const de = {
    ...deBase,
    layers: deBase.layers.map((l) =>
      l.type === "text" && l.fontSize > 60 ? { ...l, fontSize: 170 } : l,
    ),
  };
  const dePng = await renderSceneToPng(de);
  await writeFile(path.join(OUT, "storeframe-fit.png"), dePng);
  if (process.env.UPDATE_REF) await writeFile(path.join(REF, "fit.png"), dePng);
  console.log("fit", dePng.length, "bytes", Date.now() - t0, "ms");

  // Brand preset across the layout templates (reference: scripts/reference/lime-*.png).
  const wise = applyPreset("lime-bright");
  for (const id of ["hero-bleed", "feature-list", "two-phones"] as const) {
    const scene = buildScene(DEVICES["iphone-6.9"], id, {
      title: "Scan, sell, done",
      subtitle: "Close the register in seconds.",
      brand: wise,
      bullets: [
        { icon: "zap", text: "Barcode scanning in one tap" },
        { icon: "chart", text: "Daily report, sent automatically" },
        { icon: "cloud", text: "Synced across every device" },
      ],
      screenshot:
        "https://raw.githubusercontent.com/github/explore/main/topics/react/react.png",
    });
    const png = await renderSceneToPng(scene);
    await writeFile(path.join(OUT, `storeframe-lime-${id}.png`), png);
    if (process.env.UPDATE_REF)
      await writeFile(path.join(REF, `lime-${id}.png`), png);
    console.log(`lime-${id}`, png.length, "bytes", Date.now() - t0, "ms");
  }

  // iPad / Duo frames: title-top must size the device from available
  // space, not overflow the canvas (see templates.ts "compact" branch).
  for (const id of ["ipad-13", "iphone-duo-outer", "iphone-duo-inner"] as const) {
    const scene = buildScene(DEVICES[id], "title-top", {
      title: "FİYAT LİSTEN\nTEK ADIMDA",
      subtitle:
        "Excel’den içe aktar, stok ve maliyetle birlikte. 2.000 ürüne kadar.",
      brand: { background: { type: "solid", color: "#9FE870" }, textColor: "#163300" },
      screenshot:
        "https://raw.githubusercontent.com/github/explore/main/topics/react/react.png",
    });
    const overflow =
      scene.layers.some(
        (l) => l.type === "mockup" && l.y + l.h > scene.height,
      );
    const png = await renderSceneToPng(scene);
    await writeFile(path.join(OUT, `storeframe-${id}.png`), png);
    console.log(
      id,
      png.length,
      "bytes",
      overflow ? "OVERFLOW!" : "fits",
      Date.now() - t0,
      "ms",
    );
    if (overflow) throw new Error(`${id}: mockup overflows the canvas`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
