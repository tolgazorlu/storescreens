import { describe, expect, it } from "vitest";
import { DEVICES } from "@/lib/devices";
import { buildLayoutScenes, LAYOUT_KEYS, LAYOUTS, STYLES, styleLayout } from "@/lib/layouts";
import { sceneSchema } from "@/lib/scene";

const p = { title: "Fiyat listeleriniz tek QR kodda", subtitle: "Şğüçöı İ", screenshot: "/files/a.png" };

describe("goldie layouts", () => {
  it("builds a valid scene per tile for every layout on iPhone and Android", () => {
    for (const device of [DEVICES["iphone-6.9"], DEVICES["android-phone"]]) {
      for (const key of LAYOUT_KEYS) {
        const scenes = buildLayoutScenes(device, key, p);
        expect(scenes).toHaveLength(LAYOUTS[key].span);
        for (const s of scenes) {
          sceneSchema.parse(s);
          expect(s.width).toBe(device.width);
          expect(s.layers.some((l) => l.type === "mockup")).toBe(true);
        }
      }
    }
  });

  it("splits a panorama so the device lines up across the seam", () => {
    const W = DEVICES["iphone-6.9"].width;
    const [a, b] = buildLayoutScenes(DEVICES["iphone-6.9"], "panorama", p);
    const ma = a.layers.find((l) => l.type === "mockup")!;
    const mb = b.layers.find((l) => l.type === "mockup")!;
    expect(mb.x).toBe(ma.x - W);
    // Copy sits in the first tile only.
    expect(a.layers.filter((l) => l.type === "text")).toHaveLength(2);
    expect(b.layers.filter((l) => l.type === "text")).toHaveLength(0);
  });

  it("uses the Pixel bezel on Android and the chosen iPhone colour", () => {
    const [android] = buildLayoutScenes(DEVICES["android-phone"], "hero", p);
    expect(android.layers.find((l) => l.type === "mockup")).toMatchObject({ frame: "pixel-10-pro" });
    const [iphone] = buildLayoutScenes(DEVICES["iphone-6.9"], "hero", { ...p, frame: "iphone-17-pro-orange" });
    expect(iphone.layers.find((l) => l.type === "mockup")).toMatchObject({ frame: "iphone-17-pro-orange" });
  });

  it("refuses devices without bezel art", () => {
    expect(() => buildLayoutScenes(DEVICES["iphone-duo-inner"], "hero", p)).toThrow(/not available/);
  });

  it("repeats a style's sequence", () => {
    expect(styleLayout("editorial", 0)).toBe("panorama");
    expect(styleLayout("editorial", STYLES.editorial.sequence.length)).toBe("panorama");
  });
});
