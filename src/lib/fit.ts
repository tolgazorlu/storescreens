import type { Scene, TextLayer } from "@/lib/scene";

export type Measure = (
  layer: TextLayer,
  fontSize: number,
) => Promise<{ width: number; height: number }>;

/**
 * Find the largest fontSize <= layer.fontSize at which the text fits the
 * layer box, by binary search over integer sizes. `measure` renders the
 * TextContent at a given size into a box of the layer's width and returns
 * the used size; the server uses satori, the editor uses the DOM.
 */
export async function fitFontSize(
  layer: TextLayer,
  measure: Measure,
): Promise<number> {
  if (layer.fit === "none" || !layer.text.trim()) return layer.fontSize;
  const fits = async (size: number) => {
    const m = await measure(layer, size);
    // satori's line breaker budgets slightly less than the measured run
    // (letter-spacing after the last glyph, rounding); keep a small margin.
    const maxW = layer.w - size * 0.08;
    if (layer.fit === "wrap") return m.width <= maxW;
    return m.height <= layer.h + 0.5 && m.width <= maxW;
  };
  if (await fits(layer.fontSize)) return layer.fontSize;
  let lo = Math.min(layer.minFontSize, layer.fontSize);
  let hi = layer.fontSize;
  if (!(await fits(lo))) return lo;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Scene copy with every text layer's fontSize replaced by its fitted size. */
export async function fitScene(
  scene: Scene,
  measure: Measure,
): Promise<{ scene: Scene; fitted: Record<string, number> }> {
  const fitted: Record<string, number> = {};
  const layers = await Promise.all(
    scene.layers.map(async (l) => {
      if (l.type !== "text") return l;
      const size = await fitFontSize(l, measure);
      fitted[l.id] = size;
      return size === l.fontSize
        ? l
        : {
            ...l,
            fontSize: size,
            letterSpacing: Math.round((l.letterSpacing * size) / l.fontSize),
          };
    }),
  );
  return { scene: { ...scene, layers }, fitted };
}
