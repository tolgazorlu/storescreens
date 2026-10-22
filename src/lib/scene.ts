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

export const backgroundSchema = z.union([
  z.object({ type: z.literal("solid"), color: z.string() }),
  z.object({
    type: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
    angle: z.number().default(180),
  }),
]);

/** Largest canvas any store asks for is 5244x2950; the cap keeps a bad scene from exhausting the renderer. */
export const MAX_SCENE_SIZE = 8192;
export const MAX_LAYERS = 100;

export const sceneSchema = z.object({
  width: z.number().int().min(1).max(MAX_SCENE_SIZE),
  height: z.number().int().min(1).max(MAX_SCENE_SIZE),
  background: backgroundSchema,
  layers: z.array(layerSchema).max(MAX_LAYERS),
});

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

export function backgroundCss(bg: Background): string {
  if (bg.type === "solid") return bg.color;
  return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
}
