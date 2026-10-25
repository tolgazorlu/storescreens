import { describe, expect, it } from "vitest";
import { backgroundSchema, sceneSchema, bgRect, type Background } from "@/lib/scene";
import { backgroundSvgDataUrl } from "@/lib/background";

describe("backgroundSchema backward compatibility", () => {
  it("still parses the old solid/gradient shapes stored for existing projects", () => {
    expect(backgroundSchema.safeParse({ type: "solid", color: "#2E3DF2" }).success).toBe(true);
    expect(backgroundSchema.safeParse({ type: "gradient", from: "#2E3DF2", to: "#7A1FA2", angle: 160 }).success).toBe(true);
  });
  it("accepts the new types", () => {
    expect(backgroundSchema.safeParse({ type: "radial", from: "#fff", to: "#000" }).success).toBe(true);
    expect(backgroundSchema.safeParse({ type: "split", colorA: "#fff", colorB: "#000" }).success).toBe(true);
    expect(backgroundSchema.safeParse({ type: "mesh", colors: ["#fff", "#000"] }).success).toBe(true);
    expect(backgroundSchema.safeParse({ type: "image", src: "/files/p/a.png" }).success).toBe(true);
  });
  it("accepts a known pattern id and rejects an unknown one", async () => {
    const { PATTERN_IDS } = await import("@/lib/patterns");
    expect(backgroundSchema.safeParse({ type: "pattern", id: PATTERN_IDS[0] }).success).toBe(true);
    expect(backgroundSchema.safeParse({ type: "pattern", id: "not-a-real-pattern" }).success).toBe(false);
  });
  it("rejects a mesh with fewer than 2 colours", () => {
    expect(backgroundSchema.safeParse({ type: "mesh", colors: ["#fff"] }).success).toBe(false);
  });
});

describe("backgroundSvgDataUrl", () => {
  it("renders every type without throwing and produces a data URL", () => {
    const bgs: Background[] = [
      { type: "solid", color: "#111111" },
      { type: "gradient", from: "#111", to: "#222", angle: 90 },
      { type: "radial", from: "#111", to: "#222", cx: 0.5, cy: 0.5 },
      { type: "split", colorA: "#111", colorB: "#222", angle: 45, split: 0.5 },
      { type: "mesh", seed: 5, base: "#111", colors: ["#f00", "#0f0", "#00f"] },
    ].map((bg) => backgroundSchema.parse(bg));
    for (const bg of bgs) {
      const url = backgroundSvgDataUrl(bg, 400, 800);
      expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
      const svg = Buffer.from(url.split(",")[1], "base64").toString("utf-8");
      expect(svg).not.toMatch(/feGaussianBlur/);
      expect(svg).toContain("<svg");
    }
  });
  it("renders a pattern background as a cover-fit image", async () => {
    const { PATTERN_IDS, patternSrc } = await import("@/lib/patterns");
    const bg = backgroundSchema.parse({ type: "pattern", id: PATTERN_IDS[0] });
    const url = backgroundSvgDataUrl(bg, 400, 800);
    const svg = Buffer.from(url.split(",")[1], "base64").toString("utf-8");
    expect(svg).toContain(`href="${patternSrc(PATTERN_IDS[0])}"`);
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
  });
  it("draws a glow and texture overlay without a blur filter", () => {
    const url = backgroundSvgDataUrl(
      {
        type: "solid",
        color: "#000",
        glow: [{ color: "#fff", x: 0.5, y: 0.5, size: 0.5, opacity: 0.5 }],
        texture: { type: "grain", opacity: 0.1, color: "#fff" },
      },
      400,
      400,
    );
    const svg = Buffer.from(url.split(",")[1], "base64").toString("utf-8");
    expect(svg).not.toMatch(/feGaussianBlur/);
    expect(svg).toContain("radialGradient");
    expect(svg).toContain("pattern");
  });
});

describe("bgRect", () => {
  it("defaults to the scene's own size when no panorama rect is set", () => {
    expect(bgRect({ width: 100, height: 200 })).toEqual({ offsetX: 0, width: 100, height: 200 });
  });
  it("uses the wider panorama rect when set", () => {
    expect(bgRect({ width: 100, height: 200, bg: { offsetX: -100, width: 200 } })).toEqual({
      offsetX: -100,
      width: 200,
      height: 200,
    });
  });
});

describe("sceneSchema with the new background union", () => {
  it("still accepts a plain scene", () => {
    const scene = {
      width: 1320,
      height: 2868,
      background: { type: "solid", color: "#fff" },
      layers: [],
    };
    expect(sceneSchema.safeParse(scene).success).toBe(true);
  });
});

describe("brand overrides", () => {
  it("leave unset fields alone so a theme underneath survives", async () => {
    const { brandPatchSchema } = await import("@/lib/brand");
    expect(brandPatchSchema.parse({ fontFamily: "Cairo" })).toEqual({ fontFamily: "Cairo" });
  });
});
