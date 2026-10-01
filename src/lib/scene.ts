import { z } from "zod";

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
});

export const imageLayerSchema = base.extend({
  type: z.literal("image"),
  src: z.string(),
  fit: z.enum(["cover", "contain"]).default("contain"),
  radius: z.number().default(0),
});

export const mockupLayerSchema = base.extend({
  type: z.literal("mockup"),
  frame: z.enum(["iphone", "ipad", "android"]).default("iphone"),
  src: z.string().nullable().default(null),
  frameColor: z.string().default("#111111"),
  shadow: z.boolean().default(true),
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

export const sceneSchema = z.object({
  width: z.number(),
  height: z.number(),
  background: backgroundSchema,
  layers: z.array(layerSchema),
});

export type TextLayer = z.infer<typeof textLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type MockupLayer = z.infer<typeof mockupLayerSchema>;
export type RectLayer = z.infer<typeof rectLayerSchema>;
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
