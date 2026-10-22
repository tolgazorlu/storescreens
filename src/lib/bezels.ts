/**
 * Official Apple product bezels (developer.apple.com/design/resources).
 * PNGs live in public/bezels (gitignored, Apple license): run
 * `scripts/fetch-bezels.sh` on a fresh clone. The screen hole is measured
 * from each PNG's alpha channel and equals the App Store screenshot size.
 */
export type Bezel = {
  file: string;
  width: number;
  height: number;
  hole: { x: number; y: number; w: number; h: number };
  /** Corner radius of the screen cutout; content is clipped to it so it cannot poke past the bezel corners. */
  radius?: number;
};

/** goldie's iPhone 17 Pro art (public/frames, CC BY 4.0, see ATTRIBUTION.md). */
const iphone17 = (color: string): Bezel => ({
  file: `/frames/iphone-17-pro-${color}.png`,
  width: 606,
  height: 1252,
  hole: { x: 24, y: 21, w: 557, h: 1210 },
  radius: 82,
});

export const BEZELS: Partial<Record<string, Bezel>> = {
  "iphone-17-pro-blue": iphone17("blue"),
  "iphone-17-pro-silver": iphone17("silver"),
  "iphone-17-pro-orange": iphone17("orange"),
  "pixel-10-pro": {
    file: "/frames/pixel-10-pro.png",
    width: 1410,
    height: 2968,
    hole: { x: 59, y: 60, w: 1280, h: 2856 },
    radius: 178,
  },
  ipad: {
    file: "/bezels/ipad-13.png",
    width: 2300,
    height: 3000,
    hole: { x: 118, y: 124, w: 2064, h: 2752 },
  },
  "duo-outer": {
    file: "/bezels/duo-outer.png",
    width: 1574,
    height: 2194,
    hole: { x: 88, y: 80, w: 1398, h: 2034 },
  },
  "duo-inner": {
    file: "/bezels/duo-inner.png",
    width: 2247,
    height: 3093,
    hole: { x: 120, y: 120, w: 2007, h: 2853 },
  },
};

export function bezelFor(frame: string): Bezel | undefined {
  return BEZELS[frame];
}
