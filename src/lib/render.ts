import "server-only";
import satori, { type Font } from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import type { Scene, TextLayer } from "@/lib/scene";
import { fitScene } from "@/lib/fit";
import { SceneView, TextContent } from "@/components/scene/scene-view";
import { readFileBytes } from "@/lib/storage";
import { FONTS, FONT_WEIGHTS, fontFile } from "@/lib/fonts";
import { bezelFor } from "@/lib/bezels";
import { PUBLIC_DIR } from "@/lib/paths";

let fontsPromise: Promise<Font[]> | null = null;

/** Every registry family at every weight. satori picks by name, then by glyph coverage in list order. */
function loadFonts(): Promise<Font[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONTS.flatMap((family) =>
        FONT_WEIGHTS.map(async (weight) => ({
          name: family.name,
          weight: weight as Font["weight"],
          style: "normal" as const,
          data: await readFile(
            path.join(PUBLIC_DIR, "fonts", fontFile(family, weight)),
          ),
        })),
      ),
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
  const bezels = new Set<string>();
  for (const l of scene.layers) {
    const b = l.type === "mockup" ? bezelFor(l.frame) : undefined;
    if (b) bezels.add(b.file);
  }
  await Promise.all(
    [...bezels].map(async (file) => {
      const bytes = await readFile(path.join(PUBLIC_DIR, file));
      map.set(file, `data:image/png;base64,${bytes.toString("base64")}`);
    }),
  );
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

/**
 * Measure a text layer at a font size: render TextContent alone into a box
 * of the layer's width with unbounded height, then read the content's
 * bounding box out of the SVG satori produced.
 */
async function measureWithSatori(layer: TextLayer, fontSize: number) {
  const fonts = await loadFonts();
  const probeH = Math.max(layer.h * 4, fontSize * 40);
  const probe = (child: ReactNode, width: number, inner: number | "auto") =>
    satori(
      createElement(
        "div",
        {
          style: {
            display: "flex",
            width,
            height: probeH,
            alignItems: "flex-start",
          },
        },
        createElement(
          "div",
          {
            style: {
              display: "flex",
              width: inner,
              backgroundColor: "#010203",
            },
          },
          child,
        ),
      ),
      { width, height: probeH, fonts },
    );
  // Height: the real block at the layer's width. satori emits the probe's
  // background as a <rect>; its height is the laid-out height.
  const svg = await probe(
    createElement(TextContent, { layer, fontSize }),
    layer.w,
    layer.w,
  );
  const rect =
    /<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*fill="#010203"/.exec(
      svg,
    );
  const height = rect ? Number(rect[2]) : probeH;
  // Width: the longest unbreakable word, measured alone on a very wide probe,
  // so mid-word breaks (which the block allows as a last resort) count as overflow.
  const longest = layer.text
    .split(/\s+/)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
  const wsvg = await probe(
    createElement(TextContent, {
      layer: { ...layer, text: longest, align: "left" },
      fontSize,
      block: false,
    }),
    20000,
    "auto",
  );
  const wrect =
    /<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*fill="#010203"/.exec(
      wsvg,
    );
  const width = wrect ? Number(wrect[1]) : 0;
  return { width, height };
}

export async function fitSceneText(scene: Scene) {
  return fitScene(scene, measureWithSatori);
}

export async function renderSceneToSvg(input: Scene): Promise<string> {
  const [fonts, images, { scene }] = await Promise.all([
    loadFonts(),
    inlineImages(input),
    fitSceneText(input),
  ]);
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
