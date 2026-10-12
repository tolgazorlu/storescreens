import { describe, expect, it } from "vitest";
import { localFilesPath } from "@/lib/files-url";
import { MAX_SCENE_SIZE, sceneSchema } from "@/lib/scene";
import { localeSchema } from "@/lib/validation";

describe("localFilesPath", () => {
  it("accepts this server's own files", () => {
    expect(localFilesPath("/files/p/a.png")).toBe("/files/p/a.png");
    expect(localFilesPath("http://localhost:4110/files/p/a%20b.png")).toBe("/files/p/a b.png");
    expect(localFilesPath("http://127.0.0.1:4110/files/x.png")).toBe("/files/x.png");
  });
  it("refuses every other URL so the renderer never fetches on a scene's behalf", () => {
    for (const u of ["http://169.254.169.254/latest/meta-data/", "https://example.com/a.png", "file:///etc/passwd", "http://localhost:4110/api/meta", "ftp://localhost/files/x", "//evil.example/files/x", "data:text/html,hi"]) {
      expect(localFilesPath(u), u).toBeNull();
    }
  });
});

describe("sceneSchema", () => {
  const scene = (over: Record<string, unknown> = {}) => ({
    width: 1320,
    height: 2868,
    background: { type: "solid", color: "#fff" },
    layers: [{ id: "a", type: "image", x: 0, y: 0, w: 10, h: 10, src: "/files/p/a.png" }],
    ...over,
  });
  it("keeps a normal scene", () => {
    expect(sceneSchema.safeParse(scene()).success).toBe(true);
    expect(sceneSchema.safeParse(scene({ layers: [{ id: "a", type: "image", x: 0, y: 0, w: 1, h: 1, src: "data:image/png;base64,AAAA" }] })).success).toBe(true);
  });
  it("rejects remote image sources and oversized canvases", () => {
    expect(sceneSchema.safeParse(scene({ layers: [{ id: "a", type: "image", x: 0, y: 0, w: 1, h: 1, src: "http://example.com/a.png" }] })).success).toBe(false);
    expect(sceneSchema.safeParse(scene({ layers: [{ id: "m", type: "mockup", x: 0, y: 0, w: 1, h: 1, src: "file:///etc/passwd" }] })).success).toBe(false);
    expect(sceneSchema.safeParse(scene({ width: MAX_SCENE_SIZE + 1 })).success).toBe(false);
    expect(sceneSchema.safeParse(scene({ height: 0 })).success).toBe(false);
  });
});

describe("localeSchema", () => {
  it("allows language tags and nothing that can become a path", () => {
    for (const ok of ["tr", "en-US", "zh_Hant", "pt-BR"]) expect(localeSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ["../../x", "a/b", "t", "en US", "x".repeat(11), ".."]) expect(localeSchema.safeParse(bad).success, bad).toBe(false);
  });
});
