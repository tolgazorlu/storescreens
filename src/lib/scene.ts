import { z } from "zod";
import { localFilesPath } from "@/lib/files-url";

/**
 * Scene = one store screenshot. Coordinates are in output pixels
 * (e.g. 1320x2868). The same scene renders in the editor (DOM) and on the
 * server (satori), so only flex/absolute layout, text and images are used.
 */

const base = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
});

export const textLayerSchema = base.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number(),
  fontWeight: z
    .union([
      z.literal(400),
      z.literal(500),
      z.literal(600),
      z.literal(700),
      z.literal(800),
    ])
    .default(700),
  color: z.string().default("#ffffff"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lineHeight: z.number().default(1.1),
  letterSpacing: z.number().default(0),
  dir: z.enum(["auto", "ltr", "rtl"]).default("auto"),
  fontFamily: z.string().default("Inter"),
  /** none: draw at fontSize. shrink: reduce fontSize until the text fits the box. wrap: shrink only if a single word is wider than the box. */
  fit: z.enum(["none", "shrink", "wrap"]).default("shrink"),
  minFontSize: z.number().default(16),
  textTransform: z.enum(["none", "uppercase"]).default("none"),
  /** Color for `*word*` spans in `text`. Unset: no highlight parsing. */
  highlightColor: z.string().optional(),
  /** Draw a rounded pill behind each highlighted word instead of just coloring it. */
  highlightPill: z.boolean().default(false),
});

/** Image sources the renderer will inline: uploaded assets or inline data URLs, never remote URLs. */
export const imageSrcSchema = z
  .string()
  .max(20_000_000)
  .refine((s) => s.startsWith("data:image/") || localFilesPath(s) !== null, "src must be a /files/ asset or a data:image URL");

export const imageLayerSchema = base.extend({
  type: z.literal("image"),
  src: imageSrcSchema,
  fit: z.enum(["cover", "contain"]).default("contain"),
  radius: z.number().default(0),
});

export const mockupLayerSchema = base.extend({
  type: z.literal("mockup"),
  frame: z
    .enum([
      "iphone",
      "ipad",
      "android",
      "duo-outer",
      "duo-inner",
      "iphone-17-pro-blue",
      "iphone-17-pro-silver",
      "iphone-17-pro-orange",
      "pixel-10-pro",
    ])
    .default("iphone"),
  src: imageSrcSchema.nullable().default(null),
  frameColor: z.string().default("#111111"),
  shadow: z.boolean().default(true),
  /** auto: cover on iPhone/Android, contain (letterbox) on iPad/Duo. Use cover for native captures. */
  screenFit: z.enum(["auto", "cover", "contain"]).optional(),
});

export const iconLayerSchema = base.extend({
  type: z.literal("icon"),
  icon: z.string().default("check"),
  color: z.string().default("#ffffff"),
  strokeWidth: z.number().default(2),
});

export const rectLayerSchema = base.extend({
  type: z.literal("rect"),
  color: z.string(),
  radius: z.number().default(0),
});

export const layerSchema = z.discriminatedUnion("type", [
  textLayerSchema,
  imageLayerSchema,
  mockupLayerSchema,
  rectLayerSchema,
  iconLayerSchema,
]);

/** Texture overlay drawn on top of any background type (Iconbake-style). */
export const textureSchema = z.object({
  type: z.enum(["none", "grain", "dots", "grid", "stripes", "waves", "halftone", "concentric"]).default("none"),
  opacity: z.number().min(0).max(1).default(0.12),
  color: z.string().default("#000000"),
});
export type Texture = z.infer<typeof textureSchema>;
export const TEXTURE_TYPES = ["none", "grain", "dots", "grid", "stripes", "waves", "halftone", "concentric"] as const;

/** Soft decorative blob, layered as a radial gradient (no blur: resvg panics on big feGaussianBlur). */
export const glowSchema = z.object({
  color: z.string(),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  size: z.number().min(0.05).max(1.5).default(0.5),
  opacity: z.number().min(0).max(1).default(0.5),
});
export type Glow = z.infer<typeof glowSchema>;

/** Every background type may carry a texture overlay and/or glow blobs. */
const bgExtras = { texture: textureSchema.optional(), glow: z.array(glowSchema).max(5).optional() };

export const backgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: z.string(), ...bgExtras }),
  z.object({
    type: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
    /** Optional middle stop for a 3-stop gradient. */
    via: z.string().optional(),
    angle: z.number().default(180),
    ...bgExtras,
  }),
  z.object({
    type: z.literal("radial"),
    from: z.string(),
    to: z.string(),
    cx: z.number().min(0).max(1).default(0.5),
    cy: z.number().min(0).max(1).default(0.5),
    ...bgExtras,
  }),
  z.object({
    type: z.literal("split"),
    colorA: z.string(),
    colorB: z.string(),
    angle: z.number().default(135),
    /** Where the hard edge sits, 0-1 across the canvas. */
    split: z.number().min(0.1).max(0.9).default(0.5),
    ...bgExtras,
  }),
  z.object({
    type: z.literal("mesh"),
    /** Picks the blob positions/sizes; same seed always draws the same mesh. */
    seed: z.number().default(1),
    colors: z.array(z.string()).min(2).max(5).default(["#2E3DF2", "#7A1FA2", "#F76707", "#2CB1BC"]),
    base: z.string().default("#101016"),
    ...bgExtras,
  }),
  z.object({
    type: z.literal("image"),
    src: imageSrcSchema,
    /** Black overlay opacity on top of the image, for text legibility. */
    dim: z.number().min(0).max(1).default(0),
    ...bgExtras,
  }),
]);
export type BackgroundType = Background["type"];
export const BACKGROUND_TYPES = ["solid", "gradient", "radial", "split", "mesh", "image"] as const;

/** Largest canvas any store asks for is 5244x2950; the cap keeps a bad scene from exhausting the renderer. */
export const MAX_SCENE_SIZE = 8192;
export const MAX_LAYERS = 100;

export const sceneSchema = z.object({
  width: z.number().int().min(1).max(MAX_SCENE_SIZE),
  height: z.number().int().min(1).max(MAX_SCENE_SIZE),
  background: backgroundSchema,
  /** Panorama tiles share one background drawn across the full composition; offsetX/width describe that
   * rect relative to this tile (defaults to the tile itself, so a plain scene needs nothing here). */
  bg: z.object({ offsetX: z.number().default(0), width: z.number() }).optional(),
  layers: z.array(layerSchema).max(MAX_LAYERS),
});

/** Where to draw the background image: the tile itself, or a wider rect for a panorama. */
export function bgRect(scene: Pick<Scene, "width" | "height" | "bg">) {
  return { offsetX: scene.bg?.offsetX ?? 0, width: scene.bg?.width ?? scene.width, height: scene.height };
}

export type TextLayer = z.infer<typeof textLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type MockupLayer = z.infer<typeof mockupLayerSchema>;
export type RectLayer = z.infer<typeof rectLayerSchema>;
export type IconLayer = z.infer<typeof iconLayerSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type Scene = z.infer<typeof sceneSchema>;

export function parseScene(input: unknown): Scene {
  return sceneSchema.parse(input);
}

export function uid(prefix = "l") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
