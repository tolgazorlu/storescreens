/**
 * Layouts and template styles ported from goldie
 * (https://github.com/software-mansion-labs/goldie, MIT, Copyright (c) 2026 Kacper Kapuściak).
 * The layout fractions and compose() geometry are goldie's; buildLayoutScenes() turns a
 * composition into storescreens scenes (text + mockup layers), splitting two-tile panoramas
 * into two scenes that line up at the seam.
 */
import { BEZELS, type Bezel } from "./bezels";
import { DEFAULT_BRAND, type Brand } from "./brand";
import type { Device } from "./devices";
import { DEFAULT_FONT } from "./fonts";
import { uid, type Layer, type MockupLayer, type Scene } from "./scene";

export const LAYOUT_KEYS = [
  "classic",
  "copy-below",
  "hero",
  "offset",
  "tilt",
  "tilt-right",
  "duo",
  "duo-tilt",
  "panorama",
  "panorama-duo",
  "minimal",
  "bold-type",
  "card",
  "badge",
  "diagonal",
  "callout",
  "stat",
  "bottom-copy",
] as const;
export type LayoutKey = (typeof LAYOUT_KEYS)[number];

type DevicePlacement = {
  /** Bezel width as a fraction of the tile width. */
  widthRatio: number;
  /** Device centre as fractions of the composition width and tile height. */
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotate: number;
  capture: "primary" | "secondary";
  /** Shrink the device to fit between the copy block and the bottom margin, centred there. */
  fitBelowCopy?: boolean;
};

export type LayoutSpec = {
  key: LayoutKey;
  label: string;
  description: string;
  /** Store tiles this composition covers; a panorama becomes two screens. */
  span: 1 | 2;
  copy: {
    position: "top" | "bottom" | "none";
    align: "center" | "left";
    heightRatio?: number;
    x?: number;
    widthRatio?: number;
    /** Small pill label drawn above the title, from `LayoutParams.eyebrow`. */
    eyebrow?: boolean;
  };
  devices: DevicePlacement[];
  /** Rounded colour card drawn behind the device(s), goldie-template-pack style. */
  card?: { paddingRatio: number; radiusRatio: number };
  /** Zoomed crop of `screenshot2` in a rounded bubble, overlapping the main device. */
  callout?: { widthRatio: number; x: number; y: number };
  /** Overrides TYPE.headlineSize for this layout (e.g. a big stat number). */
  titleSizeRatio?: number;
};

/** Type and spacing as fractions of the tile width (sizes, padX) or tile height (padTop, padBottom).
 * headlineSize is tuned so a 2-line headline occupies roughly 9-12% of a 6.9" canvas's height. */
const TYPE = {
  headlineSize: 0.105,
  headlineLineHeight: 1.0,
  headlineTracking: -0.0016,
  subheadSize: 0.048,
  subheadLineHeight: 1.3,
  padX: 0.09,
  padTop: 0.055,
  padBottom: 0.05,
  /** title -> subtitle gap, as a fraction of the title's own font size (spec: 0.35-0.5x). */
  gapOfTitle: 0.28,
} as const;

const CLASSIC = {
  copyHeightRatio: 0.26,
  deviceWidthRatio: 0.84,
  bottomMargin: 0.03,
};

const single = (
  d: Partial<DevicePlacement> & Pick<DevicePlacement, "x" | "y">,
): DevicePlacement[] => [
  { widthRatio: 0.84, rotate: 0, capture: "primary", ...d },
];

export const LAYOUTS: Record<LayoutKey, LayoutSpec> = {
  classic: {
    key: "classic",
    label: "Classic",
    description: "Centred copy above a centred device.",
    span: 1,
    copy: { position: "top", align: "center" },
    devices: single({ x: 0.5, y: 0.5, fitBelowCopy: true }),
  },
  "copy-below": {
    key: "copy-below",
    label: "Copy below",
    description: "Device hanging from the top edge, copy underneath.",
    span: 1,
    copy: { position: "bottom", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.84, x: 0.5, y: 0.34 }),
  },
  hero: {
    key: "hero",
    label: "Hero",
    description: "Copy on top, a large device running off the bottom.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.95, x: 0.5, y: 0.74 }),
  },
  offset: {
    key: "offset",
    label: "Offset",
    description: "Left-aligned copy, device pushed to the bottom right.",
    span: 1,
    copy: { position: "top", align: "left", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.9, x: 0.62, y: 0.76 }),
  },
  tilt: {
    key: "tilt",
    label: "Tilt",
    description: "Copy on top, device tilted and running off the bottom.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.9, x: 0.5, y: 0.75, rotate: -8 }),
  },
  "tilt-right": {
    key: "tilt-right",
    label: "Tilt right",
    description:
      "Left-aligned copy, device tilted into the bottom right corner.",
    span: 1,
    copy: { position: "top", align: "left", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.9, x: 0.64, y: 0.78, rotate: 10 }),
  },
  duo: {
    key: "duo",
    label: "Duo",
    description:
      "Two screens: a smaller one behind on the left, the main one in front.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: [
      { widthRatio: 0.62, x: 0.3, y: 0.62, rotate: 0, capture: "secondary" },
      { widthRatio: 0.7, x: 0.64, y: 0.72, rotate: 0, capture: "primary" },
    ],
  },
  "duo-tilt": {
    key: "duo-tilt",
    label: "Duo tilt",
    description: "Two tilted screens stepping down diagonally.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: [
      { widthRatio: 0.64, x: 0.3, y: 0.6, rotate: -6, capture: "secondary" },
      { widthRatio: 0.7, x: 0.66, y: 0.74, rotate: -6, capture: "primary" },
    ],
  },
  panorama: {
    key: "panorama",
    label: "Panorama",
    description:
      "Two tiles: copy on the left, one big tilted device across the seam.",
    span: 2,
    copy: {
      position: "top",
      align: "left",
      heightRatio: 0.3,
      x: 0.045,
      widthRatio: 0.86,
    },
    devices: single({ widthRatio: 1.1, x: 0.56, y: 0.7, rotate: -10 }),
  },
  "panorama-duo": {
    key: "panorama-duo",
    label: "Panorama duo",
    description:
      "Two tiles sharing one headline, a screen on each side leaning inward.",
    span: 2,
    copy: {
      position: "top",
      align: "center",
      heightRatio: 0.24,
      widthRatio: 1.6,
    },
    devices: [
      { widthRatio: 0.8, x: 0.27, y: 0.7, rotate: 6, capture: "primary" },
      { widthRatio: 0.8, x: 0.73, y: 0.7, rotate: -6, capture: "secondary" },
    ],
  },
  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "No copy, just the device, large and centred.",
    span: 1,
    copy: { position: "none", align: "center" },
    devices: single({ widthRatio: 0.92, x: 0.5, y: 0.5 }),
  },
  "bold-type": {
    key: "bold-type",
    label: "Bold type",
    description: "Huge headline fills the top, device cropped at the bottom edge.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.32 },
    titleSizeRatio: 0.135,
    devices: single({ widthRatio: 1.02, x: 0.5, y: 0.92 }),
  },
  card: {
    key: "card",
    label: "Card",
    description: "Device sitting on a rounded colour card.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    card: { paddingRatio: 0.09, radiusRatio: 0.11 },
    devices: single({ widthRatio: 0.78, x: 0.5, y: 0.72 }),
  },
  badge: {
    key: "badge",
    label: "Badge",
    description: "An eyebrow pill above the headline, device below.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.28, eyebrow: true },
    devices: single({ widthRatio: 0.88, x: 0.5, y: 0.76 }),
  },
  diagonal: {
    key: "diagonal",
    label: "Diagonal",
    description: "Left-aligned copy, device tilted hard into the opposite corner.",
    span: 1,
    copy: { position: "top", align: "left", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.92, x: 0.68, y: 0.8, rotate: 14 }),
  },
  callout: {
    key: "callout",
    label: "Callout",
    description: "A zoomed crop of the app in a bubble overlapping the main device.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    callout: { widthRatio: 0.42, x: 0.82, y: 0.58 },
    devices: single({ widthRatio: 0.82, x: 0.42, y: 0.72 }),
  },
  stat: {
    key: "stat",
    label: "Stat",
    description: "A giant number/stat headline, short caption, small device.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.3 },
    titleSizeRatio: 0.17,
    devices: single({ widthRatio: 0.62, x: 0.5, y: 0.82 }),
  },
  "bottom-copy": {
    key: "bottom-copy",
    label: "Bottom copy",
    description: "Device bleeding off the top edge, copy anchored at the bottom.",
    span: 1,
    copy: { position: "bottom", align: "center", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.95, x: 0.5, y: 0.26 }),
  },
};

/** A style is the rhythm of a whole set: the layout each screen takes, in store order, repeating. */
export const STYLE_KEYS = [
  "editorial",
  "showcase",
  "magazine",
  "storyboard",
  "dynamic",
  "bold",
  "social",
  "minimalist",
  "launch",
] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export const STYLES: Record<
  StyleKey,
  { label: string; description: string; sequence: LayoutKey[] }
> = {
  editorial: {
    label: "Editorial",
    description:
      "A panorama opener, then a hero, an offset, a breather and a tilt.",
    sequence: ["panorama", "hero", "offset", "minimal", "tilt"],
  },
  showcase: {
    label: "Showcase",
    description:
      "Hero first, then tilted and paired screens, ending on a breather.",
    sequence: ["hero", "tilt", "duo", "tilt-right", "minimal"],
  },
  magazine: {
    label: "Magazine",
    description:
      "Left-aligned copy and copy-below tiles alternating with big devices.",
    sequence: ["offset", "copy-below", "tilt-right", "hero", "minimal"],
  },
  storyboard: {
    label: "Storyboard",
    description:
      "A two-screen panorama, then a copy-below, a hero and a breather.",
    sequence: ["panorama-duo", "copy-below", "hero", "minimal", "tilt"],
  },
  dynamic: {
    label: "Dynamic",
    description:
      "Everything tilted: a tilt, a tilted pair, a panorama, a breather.",
    sequence: ["tilt", "duo-tilt", "panorama", "minimal", "tilt-right"],
  },
  bold: {
    label: "Bold",
    description:
      "Huge type and a stat screen, badge and diagonal screens, a breather.",
    sequence: ["bold-type", "stat", "badge", "diagonal", "minimal"],
  },
  social: {
    label: "Social",
    description:
      "Card and callout screens showing the app itself, with a hero opener.",
    sequence: ["hero", "card", "callout", "card", "minimal"],
  },
  minimalist: {
    label: "Minimalist",
    description: "Mostly breathers, a badge and a card screen between them.",
    sequence: ["minimal", "badge", "minimal", "card", "classic"],
  },
  launch: {
    label: "Launch",
    description:
      "Bold-type opener, a panorama, a stat, bottom-copy and a callout close.",
    sequence: ["bold-type", "panorama", "stat", "bottom-copy", "callout"],
  },
};

export function styleLayout(style: StyleKey, index: number): LayoutKey {
  const seq = STYLES[style].sequence;
  return seq[index % seq.length];
}

export const IPHONE_FRAMES = [
  "iphone-17-pro-blue",
  "iphone-17-pro-silver",
  "iphone-17-pro-orange",
] as const;
export type IphoneFrame = (typeof IPHONE_FRAMES)[number];

/** Which bezel art a layout uses on a device; null when the device has none (Duo, creative canvases). */
export function layoutFrameFor(
  device: Device,
  iphone: IphoneFrame = "iphone-17-pro-blue",
) {
  if (device.kind === "creative") return null;
  if (device.frame === "iphone") return iphone;
  if (device.frame === "android") return "pixel-10-pro" as const;
  if (device.frame === "ipad") return "ipad" as const;
  return null;
}

type Rect = { left: number; top: number; width: number; height: number };

export type Composition = {
  width: number;
  height: number;
  copy: {
    align: "center" | "left";
    position: "top" | "bottom";
    box: Rect;
    typeWidth: number;
  } | null;
  devices: Array<{
    frame: Rect;
    rotate: number;
    capture: "primary" | "secondary";
  }>;
};

/** Every fraction was tuned on the 6.9" tile; wider tiles compose in this aspect, centred. */
const REF_TILE_ASPECT = 1320 / 2868;

/** goldie's compose(): pixel geometry of a layout on a tile, for a bezel of the given size. */
export function compose(
  spec: LayoutSpec,
  tileIn: { width: number; height: number },
  art: Bezel,
): Composition {
  const tile =
    tileIn.width / tileIn.height > REF_TILE_ASPECT + 1e-6
      ? { width: tileIn.height * REF_TILE_ASPECT, height: tileIn.height }
      : tileIn;
  const dx = (spec.span * (tileIn.width - tile.width)) / 2;
  const width = tile.width * spec.span;
  const height = tile.height;
  const isClassic = spec.key === "classic";
  const copyHeight =
    spec.copy.position === "none"
      ? 0
      : tile.height *
        (isClassic ? CLASSIC.copyHeightRatio : (spec.copy.heightRatio ?? 0.24));
  const padX = tile.width * TYPE.padX;
  const maxWidth =
    (spec.copy.widthRatio
      ? tile.width * spec.copy.widthRatio
      : tile.width - 2 * padX) +
    (tileIn.width - tile.width);

  let copy: Composition["copy"] = null;
  if (spec.copy.position !== "none") {
    const x =
      spec.copy.x !== undefined
        ? width * spec.copy.x
        : spec.copy.align === "left"
          ? padX
          : width / 2;
    const copyDx = spec.copy.align === "left" ? 0 : dx;
    const boxLeft = spec.copy.align === "left" ? x : x - maxWidth / 2;
    const top = spec.copy.position === "top" ? 0 : height - copyHeight;
    copy = {
      align: spec.copy.align,
      position: spec.copy.position,
      box: { left: boxLeft + copyDx, top, width: maxWidth, height: copyHeight },
      typeWidth: tile.width,
    };
  }

  const squat = tile !== tileIn;
  const devices = spec.devices.map((d) => {
    const widthRatio = isClassic ? CLASSIC.deviceWidthRatio : d.widthRatio;
    const deviceTile =
      squat && !d.fitBelowCopy && spec.copy.position !== "none" ? tileIn : tile;
    let scale = (deviceTile.width * widthRatio) / art.width;
    let left: number;
    let top: number;
    if (d.fitBelowCopy) {
      const available = height - copyHeight - height * CLASSIC.bottomMargin;
      scale = Math.min(scale, available / art.height);
      left = (width - art.width * scale) / 2 + dx;
      top = copyHeight + (available - art.height * scale) / 2;
    } else {
      left = tileIn.width * spec.span * d.x - (art.width * scale) / 2;
      top = height * d.y - (art.height * scale) / 2;
      if (squat && copy?.position === "top")
        top = Math.max(top, copy.box.height + height * 0.015);
      if (squat && copy?.position === "bottom")
        top = Math.min(top, copy.box.top - height * 0.015 - art.height * scale);
    }
    return {
      frame: {
        left,
        top,
        width: art.width * scale,
        height: art.height * scale,
      },
      rotate: d.rotate,
      capture: d.capture,
    };
  });

  return { width: tileIn.width * spec.span, height, copy, devices };
}

export type LayoutParams = {
  title?: string;
  subtitle?: string;
  /** Small label above the title, on any layout with copy at the top. */
  eyebrow?: string;
  /** Call-to-action pill drawn under the subtitle. */
  cta?: string;
  screenshot?: string | null;
  /** Second capture for the two-device layouts; falls back to the first. */
  screenshot2?: string | null;
  brand?: Partial<Brand>;
  frame?: IphoneFrame;
};

/** Average glyph width as a fraction of font size, for a bold sans headline. */
// 0.56 over-counted lines, leaving a gap under titles; an underestimate is safe since titles shrink to fit.
const GLYPH_WIDTH = 0.52;

/** Greedy word-wrap simulation: how many lines `text` takes at `fontSize` in a box of `width`.
 * More accurate than a flat char-count estimate, so the title's box height (and the gap below
 * it) matches what `fit:"shrink"` actually draws instead of leaving a leftover gap. */
export function estimateLines(text: string | undefined, fontSize: number, width: number): number {
  if (!text?.trim()) return 0;
  const charW = fontSize * GLYPH_WIDTH;
  let lines = 1;
  let lineW = 0;
  // `*` highlight markers are not drawn.
  for (const word of text.replace(/\*/g, "").split(/\s+/)) {
    const wordW = word.length * charW;
    const withSpace = lineW === 0 ? wordW : lineW + charW * 0.3 + wordW;
    if (withSpace > width && lineW > 0) {
      lines++;
      lineW = wordW;
    } else {
      lineW = withSpace;
    }
  }
  return Math.min(4, lines);
}

/** Accent-filled rounded label: the eyebrow above a title or a CTA button under it. */
function pill(label: string, x: number, y: number, w: number, h: number, size: number, brand: Brand, upper = true): Layer[] {
  const box = { x: Math.round(x), y, w, h, rotation: 0, opacity: 1, locked: false };
  const lineH = Math.round(size * 1.2);
  // Dark label on light accents, light on dark ones (relative luminance of a #rrggbb accent).
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(brand.accent.slice(i, i + 2), 16) / 255 || 0);
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
  return [
    { id: uid("r"), type: "rect", color: brand.accent, radius: Math.round(h / 2), ...box },
    {
      id: uid("t"),
      type: "text",
      text: label,
      ...box,
      y: y + Math.round((h - lineH) / 2),
      h: lineH,
      fontSize: size,
      fontWeight: 700,
      color: light ? "#111111" : "#FFFFFF",
      align: "center",
      lineHeight: 1.2,
      letterSpacing: upper ? Math.round(size * 0.02) : 0,
      dir: "auto",
      fontFamily: brand.fontFamily ?? DEFAULT_FONT,
      fit: "shrink",
      minFontSize: Math.round(size * 0.7),
      textTransform: upper ? "uppercase" : "none",
      highlightPill: false,
    },
  ];
}

/** One scene per store tile: two for a panorama, one otherwise. */
export function buildLayoutScenes(
  device: Device,
  key: LayoutKey,
  p: LayoutParams,
): Scene[] {
  const spec = LAYOUTS[key];
  const frame = layoutFrameFor(device, p.frame);
  const art = frame ? BEZELS[frame] : undefined;
  if (!frame || !art)
    throw new Error(`Layout ${key} is not available on ${device.id}`);
  const brand: Brand = { ...DEFAULT_BRAND, ...(p.brand ?? {}) };
  const W = device.width;
  const H = device.height;
  const c = compose(spec, { width: W, height: H }, art);

  const layers: Layer[] = [];
  let eyebrowH = 0;
  let copyBottom = 0;
  if (c.copy && (spec.copy.eyebrow || c.copy.position === "top") && p.eyebrow) {
    const { box, typeWidth } = c.copy;
    const size = Math.round(typeWidth * 0.04);
    const padX = Math.round(size * 1.1);
    eyebrowH = Math.round(size * 2.1);
    // Uppercase glyphs run wider than the mixed-case average.
    const textW = Math.round(p.eyebrow.length * size * 0.68) + padX * 2;
    const top = Math.round(H * TYPE.padTop);
    const left = spec.copy.align === "left" ? box.left : box.left + box.width / 2 - textW / 2;
    layers.push(...pill(p.eyebrow, left, top, textW, eyebrowH, size, brand));
    eyebrowH += Math.round(H * 0.018);
  }
  if (c.copy && (p.title || p.subtitle)) {
    const { box, typeWidth } = c.copy;
    const titleSize = Math.round(
      typeWidth * (spec.titleSizeRatio ?? TYPE.headlineSize) * brand.titleScale,
    );
    const subSize = Math.round(typeWidth * TYPE.subheadSize * brand.subtitleScale);
    const titleLines = estimateLines(p.title, titleSize, box.width);
    const subLines = estimateLines(p.subtitle, subSize, box.width);
    const titleH = Math.round(titleSize * TYPE.headlineLineHeight * titleLines) + eyebrowH;
    const subH = Math.round(subSize * TYPE.subheadLineHeight * subLines);
    const gap = p.subtitle ? Math.round(titleSize * TYPE.gapOfTitle * brand.titleGap) : 0;
    const ctaSize = Math.round(subSize * 0.95);
    const ctaGap = p.cta ? Math.round(subSize * 1.2) : 0;
    const ctaH = p.cta ? Math.round(ctaSize * 2.4) : 0;
    const blockH = titleH + gap + subH + ctaGap + ctaH;
    copyBottom = (c.copy.position === "top" ? Math.round(H * TYPE.padTop) : 0) + blockH;
    const top =
      c.copy.position === "top"
        ? Math.round(H * TYPE.padTop)
        : Math.round(
            Math.max(box.top + H * 0.014, H - H * TYPE.padBottom - blockH),
          );
    const text = (
      t: string,
      y: number,
      h: number,
      size: number,
      sub: boolean,
    ): Layer => ({
      id: uid("t"),
      type: "text",
      text: t,
      x: Math.round(box.left),
      y,
      w: Math.round(box.width),
      h,
      fontSize: size,
      fontWeight: sub ? 500 : brand.titleWeight,
      color: sub ? brand.accent : brand.textColor,
      align: c.copy!.align,
      lineHeight: sub ? TYPE.subheadLineHeight : TYPE.headlineLineHeight,
      letterSpacing: sub ? 0 : Math.round(typeWidth * TYPE.headlineTracking),
      dir: "auto",
      fontFamily: brand.fontFamily ?? DEFAULT_FONT,
      fit: "shrink",
      minFontSize: Math.round(W * 0.03),
      textTransform: sub ? "none" : brand.titleCase,
      highlightColor: sub ? undefined : brand.accent,
      highlightPill: sub ? false : brand.highlightPill,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
    if (p.title) layers.push(text(p.title, top + eyebrowH, titleH - eyebrowH, titleSize, false));
    if (p.subtitle)
      layers.push(text(p.subtitle, top + titleH + gap, subH, subSize, true));
    if (p.cta) {
      const w = Math.round(p.cta.length * ctaSize * GLYPH_WIDTH + ctaSize * 2.6);
      const left = c.copy.align === "left" ? box.left : box.left + box.width / 2 - w / 2;
      layers.push(...pill(p.cta, left, top + titleH + gap + subH + ctaGap, w, ctaH, ctaSize, brand, false));
    }
  }
  // Pull devices up under short top copy so no empty band is left between them,
  // but keep a bleeding device reaching the bottom edge.
  let lift = 0;
  if (c.copy?.position === "top" && copyBottom > 0 && spec.span === 1 && c.devices.length) {
    const top = Math.min(...c.devices.map((d) => d.frame.top));
    const bottom = Math.max(...c.devices.map((d) => d.frame.top + d.frame.height));
    lift = Math.max(0, Math.min(top - (copyBottom + H * 0.035), bottom - H * 0.96));
    for (const d of c.devices) d.frame = { ...d.frame, top: d.frame.top - lift };
  }
  if (spec.card) {
    // One rounded card behind every device, sized to their combined bounding box.
    const xs = c.devices.map((d) => d.frame.left);
    const ys = c.devices.map((d) => d.frame.top);
    const x2 = c.devices.map((d) => d.frame.left + d.frame.width);
    const y2 = c.devices.map((d) => d.frame.top + d.frame.height);
    const pad = W * spec.card.paddingRatio;
    const left = Math.min(...xs) - pad;
    const top = Math.min(...ys) - pad;
    const right = Math.max(...x2) + pad;
    const bottom = Math.max(...y2) + pad * 1.6;
    layers.push({
      id: uid("r"),
      type: "rect",
      color: brand.accent,
      radius: Math.round(W * spec.card.radiusRatio),
      x: Math.round(left),
      y: Math.round(top),
      w: Math.round(right - left),
      h: Math.round(bottom - top),
      rotation: 0,
      opacity: 1,
      locked: false,
    });
  }
  for (const d of c.devices) {
    const src =
      d.capture === "secondary"
        ? (p.screenshot2 ?? p.screenshot)
        : p.screenshot;
    const m: MockupLayer = {
      id: uid("m"),
      type: "mockup",
      frame,
      src: src ?? null,
      frameColor: brand.frameColor,
      shadow: true,
      screenFit: "cover",
      x: Math.round(d.frame.left),
      y: Math.round(d.frame.top),
      w: Math.round(d.frame.width),
      h: Math.round(d.frame.height),
      rotation: d.rotate,
      opacity: 1,
      locked: false,
    };
    layers.push(m);
  }
  if (spec.callout && p.screenshot2) {
    const w = Math.round(W * spec.callout.widthRatio);
    const h = Math.round(w * 2.0);
    layers.push({
      id: uid("i"),
      type: "image",
      src: p.screenshot2,
      fit: "cover",
      radius: Math.round(w * 0.12),
      x: Math.round(W * spec.callout.x - w / 2),
      y: Math.round(H * spec.callout.y - h / 2 - lift),
      w,
      h,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
  }

  return Array.from({ length: spec.span }, (_, i) => ({
    width: W,
    height: H,
    background: brand.background,
    // One background drawn across the whole composition, so a panorama shows no seam.
    bg: { offsetX: -i * W, width: c.width },
    // Each tile is a window onto the wide composition; ids stay unique per scene.
    layers: layers
      .map((l) => ({
        ...l,
        id: uid(l.type[0]),
        x: l.x - i * W,
      }))
      // Drop what lies wholly in the other tile; rotation can swing a device ~20% past its box.
      .filter((l) => {
        const m = l.type === "mockup" ? l.w * 0.2 : 0;
        return l.x - m < W && l.x + l.w + m > 0;
      }),
  }));
}
