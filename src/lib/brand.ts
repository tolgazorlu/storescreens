import { z } from "zod";
import { backgroundSchema } from "./scene";

/**
 * Project-level brand: what every generated screen inherits unless the
 * generate call overrides it. Stored on the project as JSON.
 */
export const brandSchema = z.object({
  background: backgroundSchema.default({ type: "solid", color: "#2E3DF2" }),
  textColor: z.string().default("#ffffff"),
  /** Secondary color: subtitles, bullet icons. */
  accent: z.string().default("#ffffff"),
  fontFamily: z.string().default("Inter"),
  frameColor: z.string().default("#111111"),
  titleWeight: z
    .union([
      z.literal(400),
      z.literal(500),
      z.literal(600),
      z.literal(700),
      z.literal(800),
    ])
    .default(700),
  titleCase: z.enum(["none", "uppercase"]).default("none"),
  /** Defaults for template knobs; a generate call can override per screen. */
  titleScale: z.number().default(1),
  phoneScale: z.number().default(1),
  phoneOffsetY: z.number().default(0),
});

export type Brand = z.infer<typeof brandSchema>;

export const DEFAULT_BRAND: Brand = brandSchema.parse({});

export const BRAND_PRESETS: Record<
  string,
  { label: string; brand: Partial<Brand> }
> = {
  "lime-bright": {
    label: "Lime bright",
    brand: {
      background: { type: "solid", color: "#9FE870" },
      textColor: "#163300",
      accent: "#163300",
      frameColor: "#163300",
      titleWeight: 800,
      titleCase: "uppercase",
      titleScale: 1.1,
      phoneScale: 1.05,
      phoneOffsetY: 0.04,
    },
  },
  dark: {
    label: "Dark",
    brand: {
      background: { type: "solid", color: "#0B0B0C" },
      textColor: "#FFFFFF",
      accent: "#9A9A9A",
      frameColor: "#2A2A2A",
    },
  },
  light: {
    label: "Light",
    brand: {
      background: { type: "solid", color: "#F5F5F7" },
      textColor: "#111111",
      accent: "#555555",
      frameColor: "#111111",
    },
  },
  gradient: {
    label: "Gradient",
    brand: {
      background: {
        type: "gradient",
        from: "#2E3DF2",
        to: "#7A1FA2",
        angle: 160,
      },
      textColor: "#FFFFFF",
      accent: "#E8E8FF",
      frameColor: "#111111",
    },
  },
};

export function applyPreset(id: string): Brand {
  return brandSchema.parse({
    ...DEFAULT_BRAND,
    ...(BRAND_PRESETS[id]?.brand ?? {}),
  });
}
