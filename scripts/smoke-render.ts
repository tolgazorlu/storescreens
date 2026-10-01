import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEVICES } from "@/lib/devices";
import { buildScene, TEMPLATE_IDS } from "@/lib/templates";
import { renderSceneToPng } from "@/lib/render";

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
    await writeFile(path.join(OUT, `screeny-${id}.png`), png);
    console.log(id, png.length, "bytes", Date.now() - t0, "ms");
  }

  // Mixed Arabic / Latin / digits. Compare against scripts/reference/*.png
  // after any text change (open both in an image viewer).
  const ar = buildScene(DEVICES["iphone-6.9"], "title-top", {
    title: "استورد من Excel حتى 2,000 منتج.",
    subtitle: "صدّر إلى PDF أو Excel في ثوانٍ. الأرقام ١٢٣٤٥ تبقى صحيحة.",
  });
  const png = await renderSceneToPng(ar);
  await writeFile(path.join(OUT, "screeny-arabic.png"), png);
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
  await writeFile(path.join(OUT, "screeny-hebrew.png"), hePng);
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
  await writeFile(path.join(OUT, "screeny-fit.png"), dePng);
  if (process.env.UPDATE_REF) await writeFile(path.join(REF, "fit.png"), dePng);
  console.log("fit", dePng.length, "bytes", Date.now() - t0, "ms");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
