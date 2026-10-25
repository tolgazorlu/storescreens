import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { renderSceneToPng } = await import("@/lib/render");
const { PATTERN_IDS } = await import("@/lib/patterns");

describe("pattern backgrounds through the real render pipeline", () => {
  it("renders a scene with a pattern background to a PNG", async () => {
    const png = await renderSceneToPng({
      width: 200,
      height: 400,
      background: { type: "pattern", id: PATTERN_IDS[0] },
      layers: [],
    });
    expect(png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });
});
