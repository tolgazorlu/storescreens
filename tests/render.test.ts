import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
const fs = await import("node:fs/promises");
const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
const { renderSceneToPng } = await import("@/lib/render");
const { PATTERN_IDS } = await import("@/lib/patterns");

const patternDir = path.join(process.cwd(), "public", "patterns");
const red = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ff0000" } }).png().toBuffer();

/** Pattern PNGs are gitignored, so tests decide whether one "exists" instead of depending on the checkout. */
function patternFile(bytes: Buffer | null) {
  vi.mocked(fs.readFile).mockImplementation(((file: string, ...rest: unknown[]) =>
    String(file).startsWith(patternDir)
      ? bytes
        ? Promise.resolve(bytes)
        : Promise.reject(Object.assign(new Error("ENOENT"), { code: "ENOENT" }))
      : (actual.readFile as (...a: unknown[]) => Promise<unknown>)(file, ...rest)) as typeof fs.readFile);
}

async function centerPixel(png: Buffer) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

const scene = (id: string) => ({ width: 200, height: 400, background: { type: "pattern" as const, id }, layers: [] });

describe("pattern backgrounds through the real render pipeline", () => {
  afterEach(() => vi.mocked(fs.readFile).mockImplementation(actual.readFile as typeof fs.readFile));

  it("draws the pattern bitmap when its PNG is present", async () => {
    patternFile(red);
    expect(await centerPixel(await renderSceneToPng(scene(PATTERN_IDS[0])))).toEqual([255, 0, 0]);
  });

  it("falls back to a solid white fill when the PNG was never fetched", async () => {
    patternFile(null);
    expect(await centerPixel(await renderSceneToPng(scene(PATTERN_IDS[0])))).toEqual([255, 255, 255]);
  });
});

describe("*word* highlight next to punctuation", () => {
  it("still colours the word in `Plan *smarter*.`", async () => {
    const png = await renderSceneToPng({
      width: 600,
      height: 200,
      background: { type: "solid", color: "#ffffff" },
      layers: [
        {
          id: "t",
          type: "text",
          x: 20,
          y: 20,
          w: 560,
          h: 160,
          rotation: 0,
          opacity: 1,
          locked: false,
          text: "Plan *smarter*.",
          fontSize: 64,
          fontWeight: 700,
          color: "#000000",
          align: "left",
          lineHeight: 1.1,
          letterSpacing: 0,
          dir: "auto",
          fontFamily: "Inter",
          fit: "none",
          minFontSize: 16,
          textTransform: "none",
          highlightColor: "#ff0000",
          highlightPill: false,
        },
      ],
    });
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    let reds = 0;
    for (let i = 0; i < data.length; i += info.channels) if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] < 60) reds++;
    expect(reds).toBeGreaterThan(100);
  });
});
