import { describe, expect, it } from "vitest";
import { DEVICES } from "@/lib/devices";
import { buildLayoutScenes, estimateLines, LAYOUTS, STYLE_KEYS, STYLES } from "@/lib/layouts";
import { applyPreset, BRAND_PRESETS, PRESET_GROUPS } from "@/lib/brand";
import { sceneSchema, type TextLayer } from "@/lib/scene";

describe("theme presets", () => {
  it("has at least 30 presets, grouped", () => {
    expect(Object.keys(BRAND_PRESETS).length).toBeGreaterThanOrEqual(30);
    for (const [id, p] of Object.entries(BRAND_PRESETS)) {
      expect(PRESET_GROUPS, id).toContain(p.group);
    }
  });
  it("includes a warm 70s retro theme in the required palette", () => {
    const retro = BRAND_PRESETS["retro-sunset-70s"];
    expect(retro.group).toBe("retro");
    const bg = retro.brand.background!;
    expect(bg.type === "gradient" && bg.from).toBe("#2A0F22");
  });
  it("applies cleanly to a full Brand", () => {
    for (const id of Object.keys(BRAND_PRESETS)) {
      const brand = applyPreset(id);
      expect(brand.background.type).toBeTruthy();
    }
  });
});

describe("new layouts and styles", () => {
  const p = { title: "A *great* app", subtitle: "Short line", eyebrow: "NEW", screenshot: "/files/a.png" };
  const newLayouts = ["bold-type", "card", "badge", "diagonal", "callout", "stat", "bottom-copy"] as const;

  it("adds at least 6 new layouts, each valid on iPhone 6.9/6.5 and Android", () => {
    expect(newLayouts.length).toBeGreaterThanOrEqual(6);
    for (const device of [DEVICES["iphone-6.9"], DEVICES["iphone-6.5"], DEVICES["android-phone"]]) {
      for (const key of newLayouts) {
        const scenes = buildLayoutScenes(device, key, p);
        expect(scenes).toHaveLength(LAYOUTS[key].span);
        for (const s of scenes) sceneSchema.parse(s);
      }
    }
  });

  it("adds at least 4 new styles", () => {
    expect(STYLE_KEYS.length).toBeGreaterThanOrEqual(9); // 5 original + >=4 new
    for (const key of ["bold", "social", "minimalist", "launch"] as const) {
      expect(STYLES[key].sequence.length).toBeGreaterThan(0);
    }
  });

  it("works with RTL text", () => {
    const device = DEVICES["iphone-6.9"];
    for (const key of newLayouts) {
      const scenes = buildLayoutScenes(device, key, { ...p, title: "تطبيق *رائع*", subtitle: "سطر قصير" });
      for (const s of scenes) sceneSchema.parse(s);
    }
  });

  it("'card' draws a rounded rect behind the device", () => {
    const [scene] = buildLayoutScenes(DEVICES["iphone-6.9"], "card", p);
    expect(scene.layers.some((l) => l.type === "rect")).toBe(true);
  });

  it("'badge' draws an eyebrow pill + label above the title", () => {
    const [scene] = buildLayoutScenes(DEVICES["iphone-6.9"], "badge", p);
    expect(scene.layers.filter((l) => l.type === "rect").length).toBeGreaterThanOrEqual(1);
    const texts = scene.layers.filter((l): l is TextLayer => l.type === "text");
    expect(texts.some((t) => t.text === "NEW")).toBe(true);
  });
});

describe("estimateLines", () => {
  it("returns 0 for empty text and more lines for longer text in a narrow box", () => {
    expect(estimateLines(undefined, 100, 1000)).toBe(0);
    expect(estimateLines("short", 100, 1000)).toBe(1);
    expect(estimateLines("a very long headline that should wrap across several lines", 100, 300)).toBeGreaterThan(1);
  });
});

describe("*word* highlight parsing", () => {
  it("passes highlightColor through to the title layer only", () => {
    const [scene] = buildLayoutScenes(DEVICES["iphone-6.9"], "hero", {
      title: "A *great* app",
      subtitle: "A *great* subtitle",
      screenshot: "/files/a.png",
      brand: { accent: "#ff0000" },
    });
    const texts = scene.layers.filter((l): l is TextLayer => l.type === "text");
    const title = texts.find((t) => t.text.includes("great") && t.fontWeight !== 500);
    const subtitle = texts.find((t) => t.fontWeight === 500);
    expect(title?.highlightColor).toBe("#ff0000");
    expect(subtitle?.highlightColor).toBeUndefined();
  });
});

describe("eyebrow and cta", () => {
  it("draws the eyebrow on any top-copy layout and the cta under the subtitle", () => {
    const [scene] = buildLayoutScenes(DEVICES["iphone-6.9"], "hero", {
      title: "Title",
      subtitle: "Sub",
      eyebrow: "Feature",
      cta: "Try it",
      screenshot: null,
    });
    const texts = scene.layers.filter((l): l is TextLayer => l.type === "text");
    const y = (t: string) => texts.find((l) => l.text === t)!.y;
    expect(y("Feature")).toBeLessThan(y("Title"));
    expect(y("Sub")).toBeLessThan(y("Try it"));
    expect(sceneSchema.safeParse(scene).success).toBe(true);
  });
});
