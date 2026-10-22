import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/service", () => ({ BadRequest: Error, addAsset: vi.fn(), getProject: vi.fn() }));
const { isBlankFrame } = await import("@/lib/capture");

const W = 300;
const H = 600;
const frame = (rows: { top: number; height: number; gray: number }[]) =>
  sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
    .composite(
      rows.map((r) => ({
        input: { create: { width: W - 40, height: r.height, channels: 3 as const, background: { r: r.gray, g: r.gray, b: r.gray } } },
        left: 20,
        top: r.top,
      })),
    )
    .png()
    .toBuffer();

describe("isBlankFrame", () => {
  it("flags a cold launch that only shows the status bar", async () => {
    expect(await isBlankFrame(await frame([{ top: 10, height: 20, gray: 0 }]))).toBe(true);
  });

  it("accepts a frame with content below the status bar", async () => {
    const rows = [100, 200, 300].map((top) => ({ top, height: 12, gray: 30 }));
    expect(await isBlankFrame(await frame([{ top: 10, height: 20, gray: 0 }, ...rows]))).toBe(false);
  });
});
