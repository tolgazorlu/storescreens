import { writeFile } from "node:fs/promises";
import { DEVICES } from "@/lib/devices";
import { buildScene, TEMPLATE_IDS } from "@/lib/templates";
import { renderSceneToPng } from "@/lib/render";

async function main() {
  const t0 = Date.now();
  for (const id of TEMPLATE_IDS) {
    const scene = buildScene(DEVICES["iphone-6.9"], id, {
      title: "Fiyat listeleriniz, tek bir QR kod",
      subtitle: "Her listeyi tek, düzenli bir yerde toplayın. Şğüçöı İ",
      logo: "https://raw.githubusercontent.com/github/explore/main/topics/react/react.png",
    });
    const png = await renderSceneToPng(scene);
    await writeFile(`/tmp/screeny-${id}.png`, png);
    console.log(id, png.length, "bytes", Date.now() - t0, "ms");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
