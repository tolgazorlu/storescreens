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
  };
  devices: DevicePlacement[];
};

/** Type and spacing as fractions of the tile width (sizes, padX) or tile height (padTop, padBottom). */
const TYPE = {
  headlineSize: 0.082,
  headlineLineHeight: 1.08,
  headlineTracking: -0.0016,
  subheadSize: 0.038,
  subheadLineHeight: 1.3,
  padX: 0.09,
  padTop: 0.055,
  padBottom: 0.05,
  gap: 0.014,
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
};

/** A style is the rhythm of a whole set: the layout each screen takes, in store order, repeating. */
export const STYLE_KEYS = [
  "editorial",
  "showcase",
  "magazine",
  "storyboard",
  "dynamic",
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
  screenshot?: string | null;
  /** Second capture for the two-device layouts; falls back to the first. */
  screenshot2?: string | null;
  brand?: Partial<Brand>;
  frame?: IphoneFrame;
};

/** A CSS linear-gradient(angle, from, to) as an SVG data URL of the given size. */
function gradientSvg(w: number, h: number, from: string, to: string, angle: number): string {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const [x1, y1, x2, y2] = [w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half].map(Math.round);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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
  const bg = brand.background;
  if (spec.span === 2 && bg.type === "gradient") {
    // One gradient across both tiles, so the seam does not show.
    layers.push({
      id: uid("i"),
      type: "image",
      src: gradientSvg(c.width, H, bg.from, bg.to, bg.angle),
      fit: "cover",
      radius: 0,
      x: 0,
      y: 0,
      w: c.width,
      h: H,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
  }
  if (c.copy && (p.title || p.subtitle)) {
    const { box, typeWidth } = c.copy;
    const titleSize = Math.round(
      typeWidth * TYPE.headlineSize * brand.titleScale,
    );
    const subSize = Math.round(typeWidth * TYPE.subheadSize);
    // The block hugs the top edge (top copy) or the bottom edge (copy below) of its band.
    // shortcut: line count estimated from an average glyph width of 0.55em (shrink-to-fit catches
    // overruns); measure with the real font if titles start leaving gaps.
    const lines = (t: string | undefined, size: number) =>
      Math.min(3, Math.max(1, Math.ceil((t ?? "").length * size * 0.55 / box.width)));
    const titleH = Math.round(titleSize * TYPE.headlineLineHeight * (lines(p.title, titleSize) + 0.2));
    const subH = p.subtitle
      ? Math.round(subSize * TYPE.subheadLineHeight * (lines(p.subtitle, subSize) + 0.2))
      : 0;
    const gap = p.subtitle ? Math.round(H * TYPE.gap) : 0;
    const blockH = titleH + gap + subH;
    const top =
      c.copy.position === "top"
        ? Math.round(H * TYPE.padTop)
        : Math.round(
            Math.max(box.top + H * TYPE.gap, H - H * TYPE.padBottom - blockH),
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
      rotation: 0,
      opacity: 1,
      locked: false,
    });
    if (p.title) layers.push(text(p.title, top, titleH, titleSize, false));
    if (p.subtitle)
      layers.push(text(p.subtitle, top + titleH + gap, subH, subSize, true));
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

  return Array.from({ length: spec.span }, (_, i) => ({
    width: W,
    height: H,
    background: brand.background,
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
