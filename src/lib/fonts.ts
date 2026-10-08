/**
 * Font registry. Every family ships as static TTFs in public/fonts
 * (satori needs raw font data; variable fonts and WOFF2 are not supported).
 * The editor (next/font/local in layout.tsx) and the exporter (render.ts)
 * both read this list, so a family added here shows up in both.
 */

export type FontWeight = 400 | 500 | 600 | 700 | 800;
export const FONT_WEIGHTS: FontWeight[] = [400, 500, 600, 700, 800];
const WEIGHT_FILE: Record<FontWeight, string> = {
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
};

export type FontFamily = {
  id: string;
  /** CSS font-family name; also the name satori matches on. */
  name: string;
  /** File prefix in public/fonts, e.g. Inter-Bold.ttf. */
  file: string;
  /** Unicode scripts this family covers. Used to pick fallbacks. */
  scripts: ("latin" | "arabic" | "hebrew")[];
};

export const FONTS: FontFamily[] = [
  { id: "inter", name: "Inter", file: "Inter", scripts: ["latin"] },
  // Display/business families. Static instances cut from the Google Fonts
  // variable TTFs with fontTools (satori cannot read variable fonts).
  { id: "archivo", name: "Archivo", file: "Archivo", scripts: ["latin"] },
  {
    id: "archivo-semiexpanded",
    name: "Archivo SemiExpanded",
    file: "ArchivoSemiExpanded",
    scripts: ["latin"],
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    file: "PlusJakartaSans",
    scripts: ["latin"],
  },
  {
    id: "bricolage-grotesque",
    name: "Bricolage Grotesque",
    file: "BricolageGrotesque",
    scripts: ["latin"],
  },
  { id: "cairo", name: "Cairo", file: "Cairo", scripts: ["arabic", "latin"] },
  {
    id: "noto-sans-arabic",
    name: "Noto Sans Arabic",
    file: "NotoSansArabic",
    scripts: ["arabic"],
  },
  {
    id: "noto-sans-hebrew",
    name: "Noto Sans Hebrew",
    file: "NotoSansHebrew",
    scripts: ["hebrew"],
  },
];

export const DEFAULT_FONT = "Inter";

export function fontFile(family: FontFamily, weight: FontWeight) {
  return `${family.file}-${WEIGHT_FILE[weight]}.ttf`;
}

export function getFont(name: string): FontFamily {
  return FONTS.find((f) => f.name === name || f.id === name) ?? FONTS[0];
}

/**
 * CSS font-family chain: the chosen family first, then every other family so
 * glyphs missing from the first fall through. satori resolves fallbacks by
 * glyph coverage in the order fonts are passed; the browser uses this chain.
 */
export function fontStack(name: string): string {
  const first = getFont(name);
  const rest = FONTS.filter((f) => f.id !== first.id).map((f) => `"${f.name}"`);
  return [`"${first.name}"`, ...rest].join(", ");
}
