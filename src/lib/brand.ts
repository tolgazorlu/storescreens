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
  /** `*word*` in a title renders in `accent`; this draws a rounded pill behind it instead. */
  highlightPill: z.boolean().default(false),
  /** Multiplier on the title -> subtitle gap (title size x 0.4 x this). */
  titleGap: z.number().default(1),
  /** Multiplier on the subtitle's own size. */
  subtitleScale: z.number().default(1),
});

export type Brand = z.infer<typeof brandSchema>;

/** Partial brand for overrides. zod 4 still fills `.default()` inside `.partial()`, which would
 * reset every unset field and wipe the theme/project brand underneath, so defaults are dropped. */
export const brandPatchSchema = z.object(
  Object.fromEntries(
    Object.entries(brandSchema.shape).map(([k, v]) => [k, v.unwrap().optional()]),
  ),
) as unknown as ReturnType<typeof brandSchema.partial>;

export const DEFAULT_BRAND: Brand = brandSchema.parse({});

export type ThemeGroup = "light" | "dark" | "vibrant" | "pastel" | "retro" | "mono" | "mesh";

export const BRAND_PRESETS: Record<
  string,
  { label: string; group: ThemeGroup; brand: Partial<Brand> }
> = {
  "lime-bright": {
    label: "Lime bright",
    group: "vibrant",
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
    group: "dark",
    brand: {
      background: { type: "solid", color: "#0B0B0C" },
      textColor: "#FFFFFF",
      accent: "#9A9A9A",
      frameColor: "#2A2A2A",
    },
  },
  light: {
    label: "Light",
    group: "light",
    brand: {
      background: { type: "solid", color: "#F5F5F7" },
      textColor: "#111111",
      accent: "#555555",
      frameColor: "#111111",
    },
  },
  gradient: {
    label: "Gradient",
    group: "mesh",
    brand: {
      background: { type: "gradient", from: "#2E3DF2", to: "#7A1FA2", angle: 160 },
      textColor: "#FFFFFF",
      accent: "#E8E8FF",
      frameColor: "#111111",
    },
  },

  // --- light ---
  "paper-white": {
    label: "Paper white",
    group: "light",
    brand: {
      background: { type: "solid", color: "#FDFDFB" },
      textColor: "#1A1A1A",
      accent: "#2E3DF2",
      frameColor: "#1A1A1A",
    },
  },
  "soft-grey": {
    label: "Soft grey",
    group: "light",
    brand: {
      background: { type: "gradient", from: "#F2F2F5", to: "#E3E3EA", angle: 180 },
      textColor: "#161616",
      accent: "#FF5A36",
      frameColor: "#161616",
    },
  },
  "studio-beige": {
    label: "Studio beige",
    group: "light",
    brand: {
      background: { type: "solid", color: "#EFE7DA" },
      textColor: "#2B2318",
      accent: "#B5651D",
      frameColor: "#2B2318",
    },
  },
  "sky-tint": {
    label: "Sky tint",
    group: "light",
    brand: {
      background: { type: "radial", from: "#EAF4FF", to: "#D3E6FB", cx: 0.5, cy: 0.2 },
      textColor: "#0B1F3A",
      accent: "#1D6FE0",
      frameColor: "#0B1F3A",
    },
  },
  "mint-fresh": {
    label: "Mint fresh",
    group: "light",
    brand: {
      background: { type: "solid", color: "#EAFBF3" },
      textColor: "#06362A",
      accent: "#0E9F6E",
      frameColor: "#06362A",
    },
  },

  // --- dark ---
  "near-black": {
    label: "Near black",
    group: "dark",
    brand: {
      background: { type: "solid", color: "#060608" },
      textColor: "#FFFFFF",
      accent: "#5B8CFF",
      frameColor: "#1B1B1F",
    },
  },
  "deep-navy": {
    label: "Deep navy",
    group: "dark",
    brand: {
      background: { type: "gradient", from: "#060B1A", to: "#101E3D", angle: 180 },
      textColor: "#FFFFFF",
      accent: "#6FE3C2",
      frameColor: "#0B1430",
    },
  },
  "midnight-glow": {
    label: "Midnight glow",
    group: "dark",
    brand: {
      background: {
        type: "solid",
        color: "#0A0A12",
        glow: [{ color: "#5B4CFF", x: 0.78, y: 0.18, size: 0.65, opacity: 0.55 }],
      },
      textColor: "#FFFFFF",
      accent: "#9C8CFF",
      frameColor: "#17172A",
    },
  },
  "carbon-grid": {
    label: "Carbon grid",
    group: "dark",
    brand: {
      background: {
        type: "solid",
        color: "#0E0E10",
        texture: { type: "grid", opacity: 0.1, color: "#ffffff" },
      },
      textColor: "#FFFFFF",
      accent: "#F2C14E",
      frameColor: "#1E1E22",
    },
  },
  "forest-dark": {
    label: "Forest dark",
    group: "dark",
    brand: {
      background: { type: "gradient", from: "#06180F", to: "#0C2A1C", angle: 150 },
      textColor: "#EFFFF6",
      accent: "#4CD98A",
      frameColor: "#0C2A1C",
    },
  },
  "oled-noir": {
    label: "OLED noir",
    group: "dark",
    brand: {
      background: { type: "solid", color: "#000000" },
      textColor: "#FFFFFF",
      accent: "#FF375F",
      frameColor: "#141414",
      titleWeight: 800,
    },
  },

  // --- vibrant ---
  "electric-blue": {
    label: "Electric blue",
    group: "vibrant",
    brand: {
      background: { type: "solid", color: "#2E3DF2" },
      textColor: "#FFFFFF",
      accent: "#FFE066",
      frameColor: "#10153F",
      titleWeight: 800,
    },
  },
  "sunset-orange": {
    label: "Sunset orange",
    group: "vibrant",
    brand: {
      background: { type: "gradient", from: "#FF7A18", to: "#FF2D55", angle: 145 },
      textColor: "#FFFFFF",
      accent: "#FFF2CC",
      frameColor: "#3A0D18",
      titleWeight: 800,
    },
  },
  "hot-pink": {
    label: "Hot pink",
    group: "vibrant",
    brand: {
      background: { type: "solid", color: "#FF2E93" },
      textColor: "#FFFFFF",
      accent: "#111111",
      frameColor: "#111111",
      highlightPill: true,
      titleWeight: 800,
    },
  },
  "citrus-pop": {
    label: "Citrus pop",
    group: "vibrant",
    brand: {
      background: { type: "split", colorA: "#FFD400", colorB: "#FF5A36", angle: 135, split: 0.45 },
      textColor: "#1A1200",
      accent: "#1A1200",
      frameColor: "#1A1200",
      highlightPill: true,
    },
  },
  "cobalt-teal": {
    label: "Cobalt teal",
    group: "vibrant",
    brand: {
      background: { type: "gradient", from: "#0057FF", to: "#00C2A8", angle: 160 },
      textColor: "#FFFFFF",
      accent: "#FFFFFF",
      frameColor: "#002A4D",
      highlightPill: true,
    },
  },
  "crimson-type": {
    label: "Crimson type",
    group: "vibrant",
    brand: {
      background: { type: "solid", color: "#E11D2E" },
      textColor: "#FFFFFF",
      accent: "#111111",
      frameColor: "#111111",
      titleWeight: 800,
      titleCase: "uppercase",
    },
  },

  // --- pastel ---
  "pastel-lavender": {
    label: "Pastel lavender",
    group: "pastel",
    brand: {
      background: { type: "gradient", from: "#EDE7FF", to: "#D9CCFF", angle: 170 },
      textColor: "#2B1E4A",
      accent: "#6E4AFF",
      frameColor: "#2B1E4A",
    },
  },
  "pastel-peach": {
    label: "Pastel peach",
    group: "pastel",
    brand: {
      background: { type: "solid", color: "#FFE3D3" },
      textColor: "#5A2A12",
      accent: "#FF7A4D",
      frameColor: "#5A2A12",
    },
  },
  "pastel-sky": {
    label: "Pastel sky",
    group: "pastel",
    brand: {
      background: { type: "radial", from: "#DCEFFF", to: "#C3DEFB", cx: 0.5, cy: 0.1 },
      textColor: "#123A5E",
      accent: "#2E86DE",
      frameColor: "#123A5E",
    },
  },
  "pastel-mint": {
    label: "Pastel mint",
    group: "pastel",
    brand: {
      background: { type: "solid", color: "#D9F7E9" },
      textColor: "#0C3B29",
      accent: "#1CA776",
      frameColor: "#0C3B29",
    },
  },
  "pastel-blush": {
    label: "Pastel blush",
    group: "pastel",
    brand: {
      background: { type: "gradient", from: "#FFE4EC", to: "#FFD1DF", angle: 180 },
      textColor: "#4A1020",
      accent: "#E0527A",
      frameColor: "#4A1020",
    },
  },

  // --- retro ---
  "retro-sunset-70s": {
    label: "Retro sunset 70s",
    group: "retro",
    brand: {
      // Warm 70s palette: plum base, burnt orange + magenta glows, cream type.
      background: {
        type: "gradient",
        from: "#2A0F22",
        via: "#3A1430",
        to: "#2A0F22",
        angle: 180,
        glow: [
          { color: "#F76707", x: 0.2, y: 0.85, size: 0.9, opacity: 0.55 },
          { color: "#C2410C", x: 0.85, y: 0.15, size: 0.8, opacity: 0.45 },
        ],
        texture: { type: "grain", opacity: 0.08, color: "#FFF4E6" },
      },
      textColor: "#FFF4E6",
      accent: "#F76707",
      frameColor: "#2A0F22",
      titleWeight: 800,
      fontFamily: "Archivo SemiExpanded",
    },
  },
  "retro-mustard": {
    label: "Retro mustard",
    group: "retro",
    brand: {
      background: { type: "solid", color: "#E8A33D" },
      textColor: "#2B1A0E",
      accent: "#7A2E2E",
      frameColor: "#2B1A0E",
      titleWeight: 800,
    },
  },
  "retro-teal-cream": {
    label: "Retro teal cream",
    group: "retro",
    brand: {
      background: { type: "split", colorA: "#1F6F6B", colorB: "#FFF4E6", angle: 90, split: 0.42 },
      textColor: "#FFF4E6",
      accent: "#C2410C",
      frameColor: "#123634",
    },
  },
  "retro-film": {
    label: "Retro film",
    group: "retro",
    brand: {
      background: {
        type: "solid",
        color: "#3A2A1E",
        texture: { type: "grain", opacity: 0.16, color: "#F3E3C9" },
      },
      textColor: "#F3E3C9",
      accent: "#D98E3A",
      frameColor: "#241812",
    },
  },
  "disco-magenta": {
    label: "Disco magenta",
    group: "retro",
    brand: {
      background: { type: "gradient", from: "#5A1A4D", to: "#C2410C", angle: 130 },
      textColor: "#FFF4E6",
      accent: "#FFD166",
      frameColor: "#2A0F22",
      titleWeight: 800,
    },
  },

  // --- mono ---
  "mono-ink": {
    label: "Mono ink",
    group: "mono",
    brand: {
      background: { type: "solid", color: "#111111" },
      textColor: "#FFFFFF",
      accent: "#FFFFFF",
      frameColor: "#111111",
    },
  },
  "mono-paper": {
    label: "Mono paper",
    group: "mono",
    brand: {
      background: { type: "solid", color: "#FAFAFA" },
      textColor: "#0A0A0A",
      accent: "#0A0A0A",
      frameColor: "#0A0A0A",
    },
  },
  "mono-slate": {
    label: "Mono slate",
    group: "mono",
    brand: {
      background: { type: "solid", color: "#3B3B3F" },
      textColor: "#F2F2F2",
      accent: "#F2F2F2",
      frameColor: "#1E1E20",
    },
  },
  "mono-sand": {
    label: "Mono sand",
    group: "mono",
    brand: {
      background: { type: "solid", color: "#D8D0C0" },
      textColor: "#2A2620",
      accent: "#2A2620",
      frameColor: "#2A2620",
    },
  },

  // --- mesh / gradient ---
  "mesh-aurora": {
    label: "Mesh aurora",
    group: "mesh",
    brand: {
      background: {
        type: "mesh",
        seed: 3,
        base: "#0C1021",
        colors: ["#2E3DF2", "#7A1FA2", "#00C2A8", "#FF5A8A"],
      },
      textColor: "#FFFFFF",
      accent: "#7AF0D6",
      frameColor: "#0C1021",
    },
  },
  "mesh-candy": {
    label: "Mesh candy",
    group: "mesh",
    brand: {
      background: {
        type: "mesh",
        seed: 11,
        base: "#FFF6FA",
        colors: ["#FFB6D9", "#B6D9FF", "#FFE6A7", "#C9FFE0"],
      },
      textColor: "#2B1030",
      accent: "#D6336C",
      frameColor: "#2B1030",
    },
  },
  "mesh-ember": {
    label: "Mesh ember",
    group: "mesh",
    brand: {
      background: {
        type: "mesh",
        seed: 21,
        base: "#140A06",
        colors: ["#F76707", "#C2410C", "#FFD166", "#7A1313"],
      },
      textColor: "#FFF4E6",
      accent: "#FFD166",
      frameColor: "#140A06",
    },
  },
  "mesh-ocean": {
    label: "Mesh ocean",
    group: "mesh",
    brand: {
      background: {
        type: "mesh",
        seed: 33,
        base: "#031B2E",
        colors: ["#0077B6", "#00B4D8", "#90E0EF", "#023E8A"],
      },
      textColor: "#FFFFFF",
      accent: "#90E0EF",
      frameColor: "#031B2E",
    },
  },
  "duotone-grape": {
    label: "Duotone grape",
    group: "mesh",
    brand: {
      background: { type: "radial", from: "#B967FF", to: "#2D0A4E", cx: 0.3, cy: 0.25 },
      textColor: "#FFFFFF",
      accent: "#F1C6FF",
      frameColor: "#2D0A4E",
    },
  },
  "diagonal-fire": {
    label: "Diagonal fire",
    group: "mesh",
    brand: {
      background: { type: "split", colorA: "#FFC300", colorB: "#C70039", angle: 125, split: 0.5 },
      textColor: "#1A0000",
      accent: "#1A0000",
      frameColor: "#1A0000",
      highlightPill: true,
    },
  },
};

export const PRESET_GROUPS: ThemeGroup[] = ["light", "dark", "vibrant", "pastel", "retro", "mono", "mesh"];

export function applyPreset(id: string): Brand {
  return brandSchema.parse({
    ...DEFAULT_BRAND,
    ...(BRAND_PRESETS[id]?.brand ?? {}),
  });
}
