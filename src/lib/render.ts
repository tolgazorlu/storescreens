import "server-only";
import satori, { type Font } from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import type { Scene } from "@/lib/scene";
import { SceneView } from "@/components/scene/scene-view";
import { readFileBytes } from "@/lib/storage";

const WEIGHTS: Record<number, string> = {
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
};
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts(): Promise<Font[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      Object.entries(WEIGHTS).map(async ([weight, file]) => ({
        name: "Inter",
        weight: Number(weight) as Font["weight"],
        style: "normal" as const,
        data: await readFile(
          path.join(process.cwd(), "public", "fonts", `Inter-${file}.ttf`),
        ),
      })),
    );
  }
  return fontsPromise;
}

function mimeFor(url: string, bytes: Buffer) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.subarray(0, 4).toString() === "RIFF") return "image/webp";
  if (url.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

/** Inline every image src as data URI so satori never does network I/O mid-layout. */
async function inlineImages(scene: Scene): Promise<Map<string, string>> {
  const srcs = new Set<string>();
  for (const l of scene.layers) {
    if ((l.type === "image" || l.type === "mockup") && l.src) srcs.add(l.src);
  }
  const map = new Map<string, string>();
  await Promise.all(
    [...srcs].map(async (src) => {
      if (src.startsWith("data:")) return map.set(src, src);
      try {
        const bytes = await readFileBytes(src);
        map.set(
          src,
          `data:${mimeFor(src, bytes)};base64,${bytes.toString("base64")}`,
        );
      } catch {
        map.set(src, "");
      }
    }),
  );
  return map;
}

export async function renderSceneToSvg(scene: Scene): Promise<string> {
  const [fonts, images] = await Promise.all([loadFonts(), inlineImages(scene)]);
  const resolveSrc = (s: string) => images.get(s) ?? s;
  return satori(createElement(SceneView, { scene, resolveSrc }), {
    width: scene.width,
    height: scene.height,
    fonts,
  });
}

export async function renderSceneToPng(scene: Scene): Promise<Buffer> {
  const svg = await renderSceneToSvg(scene);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: scene.width },
  });
  return Buffer.from(resvg.render().asPng());
}
